import { Response } from 'express';
import { query, queryOne, execute } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { env } from '../config/env';
import { logEvent } from '../utils/logger';
import { bearingDeg, bearingToDirection, fetchJson, haversineMeters } from '../utils/geo';
import { PHYSICAL_ACTUATION, SIMULATED_INTERSECTIONS } from '../constants/domain';
import {
  gpsPingSchema,
  nearbyHospitalsSchema,
  priorityRequestSchema,
  routeRequestSchema,
  startEmergencySessionSchema,
  verifyEmergencyPlateSchema,
  zodFieldErrors,
} from '../utils/validation';

const VEHICLE_TYPES = ['ambulance', 'patient_transport', 'emergency_medical'];

/* ------------------------------------------------------------------ */
/* 1. Number plate verification                                        */
/* ------------------------------------------------------------------ */

/**
 * POST /api/emergency-response/verify-plate
 * Checks the entered plate + vehicle type against the authorized emergency
 * vehicle registry. This is ONLY an authorization check: it never activates
 * signal priority by itself (see request-priority for the guarded flow).
 */
export async function verifyPlate(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = verifyEmergencyPlateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid verification request', zodFieldErrors(parsed.error));
  }
  const { plate, vehicleType } = parsed.data;

  const vehicle = await queryOne<{
    id: number;
    vehicleNumber: string;
    vehicleType: string;
    organization: string;
    priority: string;
    status: string;
  }>(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
            organization, priority, status
     FROM vehicles WHERE vehicle_number = $1 LIMIT 1`,
    [plate]
  );

  if (!vehicle || !VEHICLE_TYPES.includes(vehicle.vehicleType)) {
    await logEvent('vehicle_verification', `Plate ${plate} failed verification: not in the authorized emergency registry.`, 'warning');
    ok(res, { authorized: false, reason: 'Plate is not in the authorized emergency vehicle registry.' }, 'Vehicle not authorized');
    return;
  }
  if (vehicle.vehicleType !== vehicleType) {
    await logEvent('vehicle_verification', `Plate ${plate} failed verification: vehicle type mismatch.`, 'warning');
    ok(
      res,
      { authorized: false, reason: `Registered as ${vehicle.vehicleType.replace('_', ' ')}, but ${vehicleType.replace('_', ' ')} was selected.` },
      'Vehicle type does not match registry'
    );
    return;
  }
  if (vehicle.status !== 'active') {
    await logEvent('vehicle_verification', `Plate ${plate} failed verification: registry status ${vehicle.status}.`, 'warning');
    ok(res, { authorized: false, reason: 'Vehicle exists in the registry but is marked inactive.' }, 'Vehicle not active');
    return;
  }

  // Latest detection row gives last-seen position when GPS is unavailable.
  const lastSeen = await queryOne<{ latitude: number | null; longitude: number | null; detectedAt: string }>(
    `SELECT latitude, longitude, detected_at AS "detectedAt"
     FROM detections WHERE vehicle_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
     ORDER BY detected_at DESC LIMIT 1`,
    [vehicle.id]
  );

  const activeSession = await queryOne<{ id: number; status: string }>(
    `SELECT id, status FROM emergency_sessions
     WHERE vehicle_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
    [vehicle.id]
  );

  await logEvent('vehicle_verification', `Plate ${plate} verified against the authorized emergency registry.`, 'success');

  ok(
    res,
    {
      authorized: true,
      vehicle: {
        id: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        organization: vehicle.organization,
        priority: vehicle.priority,
        status: vehicle.status,
      },
      lastSeen: lastSeen
        ? { latitude: Number(lastSeen.latitude), longitude: Number(lastSeen.longitude), detectedAt: lastSeen.detectedAt }
        : null,
      activeSession: activeSession ? { id: Number(activeSession.id), status: activeSession.status } : null,
    },
    'Vehicle verified against the authorized emergency registry'
  );
}

/* ------------------------------------------------------------------ */
/* 2. Nearby hospitals (OpenStreetMap Overpass)                        */
/* ------------------------------------------------------------------ */

/** GET /api/emergency-response/hospitals?latitude&longitude&radius */
export async function nearbyHospitals(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = nearbyHospitalsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.validation('Invalid hospital search', zodFieldErrors(parsed.error));
  }
  const lat = parsed.data.latitude;
  const lng = parsed.data.longitude;
  const radius = parsed.data.radius ?? env.emergency.hospitalRadiusM;

  const q = `[out:json][timeout:20];
    (
      nwr["amenity"="hospital"](around:${radius},${lat},${lng});
      nwr["amenity"="clinic"](around:${radius},${lat},${lng});
    );
    out center tags;`;

  type OverpassElement = {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  };

  let elements: OverpassElement[];
  try {
    // Public Overpass instances are rate-limited and occasionally answer HTTP
    // 200 with an HTML "server too busy" body, so: try the primary endpoint,
    // validate the payload, retry once after a pause, then try the mirror.
    const encodedQuery = encodeURIComponent(q);
    const endpoints = [
      `${env.emergency.overpassBaseUrl}/interpreter?data=${encodedQuery}`,
      `${env.emergency.overpassBaseUrl}/interpreter?data=${encodedQuery}`,
      `https://overpass.kumi.systems/api/interpreter?data=${encodedQuery}`,
    ];
    const timeoutMs = Math.max(env.emergency.requestTimeoutMs, 20000);
    let lastError: unknown = null;
    let body: { elements: OverpassElement[] } | null = null;
    for (let attempt = 0; attempt < endpoints.length; attempt += 1) {
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // backoff before primary retry
      }
      try {
        const candidate = await fetchJson<{ elements?: OverpassElement[] }>(
          endpoints[attempt],
          { headers: { 'User-Agent': env.emergency.overpassUserAgent } },
          timeoutMs
        );
        if (candidate && Array.isArray(candidate.elements)) {
          body = candidate as { elements: OverpassElement[] };
          break;
        }
        lastError = new Error('Overpass returned a busy/invalid response');
      } catch (e) {
        lastError = e;
      }
    }
    if (!body) {
      throw lastError instanceof Error ? lastError : new Error('Overpass unavailable');
    }
    elements = body.elements ?? [];
  } catch (err) {
    await logEvent('hospital_search', `Hospital search failed: ${err instanceof Error ? err.message : 'unknown error'}`, 'warning');
    throw ApiError.badRequest(
      'Hospital lookup is unavailable right now (the OpenStreetMap Overpass service is busy). Try again in a moment.'
    );
  }

  const hospitals = elements
    .map((el) => {
      const point = el.center ?? { lat: el.lat as number, lon: el.lon as number };
      if (typeof point.lat !== 'number' || typeof point.lon !== 'number') return null;
      const tags = el.tags ?? {};
      const name = tags.name ?? tags['name:en'] ?? '';
      if (!name) return null; // unnamed clinics are noise on the map
      const isHospital = tags.amenity === 'hospital';
      return {
        id: `${el.type}/${el.id}`,
        name,
        amenity: tags.amenity ?? 'clinic',
        kind: isHospital ? 'hospital' : 'clinic',
        emergency: tags.emergency === 'yes',
        phone: tags.phone ?? tags['contact:phone'] ?? null,
        address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || null,
        latitude: point.lat,
        longitude: point.lon,
        distanceM: Math.round(haversineMeters(lat, lng, point.lat, point.lon)),
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => {
      // hospitals with 24/7 emergency first, then by distance
      if (a.emergency !== b.emergency) return a.emergency ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === 'hospital' ? -1 : 1;
      return a.distanceM - b.distanceM;
    })
    .slice(0, 25);

  ok(
    res,
    {
      hospitals,
      provider: 'OpenStreetMap Overpass',
      searchCenter: { latitude: lat, longitude: lng },
      radiusM: radius,
    },
    `Found ${hospitals.length} medical facilities nearby`
  );
}

/* ------------------------------------------------------------------ */
/* 3. Routing (OSRM public demo or Mapbox with credentials)            */
/* ------------------------------------------------------------------ */

interface RouteGeometry {
  distanceM: number;
  durationS: number;
  coordinates: [number, number][]; // [lat, lng]
  legs: { distanceM: number; durationS: number; summary: string }[];
  provider: string;
  traffic: 'unavailable';
  trafficNote: string;
}

function mapboxTrafficNote(): string {
  return env.emergency.trafficProvider === 'tomtom' && env.emergency.tomtomKey
    ? 'Live traffic from TomTom is configured but not yet fused into these ETAs.'
    : 'No live traffic provider is configured; durations are free-flow estimates from the routing provider.';
}

/** GET /api/emergency-response/route?fromLat&fromLng&toLat&toLng */
export async function route(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = routeRequestSchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.validation('Invalid route request', zodFieldErrors(parsed.error));
  }
  const { fromLat, fromLng, toLat, toLng } = parsed.data;

  let result: RouteGeometry;
  if (env.emergency.routingProvider === 'mapbox' && env.emergency.mapboxToken) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false&access_token=${encodeURIComponent(env.emergency.mapboxToken)}`;
    type MbResponse = {
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs?: { distance: number; duration: number; summary?: string }[] }[];
      code?: string;
      message?: string;
    };
    const body = await fetchJson<MbResponse>(url, {}, env.emergency.requestTimeoutMs).catch(() => {
      throw ApiError.badRequest('Routing service (Mapbox) did not respond. Check MAPBOX_TOKEN and try again.');
    });
    const r = body.routes?.[0];
    if (!r) throw ApiError.notFound(body.message || 'No route found between those points');
    result = {
      distanceM: Math.round(r.distance),
      durationS: Math.round(r.duration),
      coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      legs: (r.legs ?? []).map((l) => ({ distanceM: Math.round(l.distance), durationS: Math.round(l.duration), summary: l.summary ?? '' })),
      provider: 'Mapbox driving-traffic',
      traffic: 'unavailable',
      trafficNote: mapboxTrafficNote(),
    };
  } else {
    // OSRM public demo router (keyless). For production, self-host OSRM and
    // point OSRM_BASE_URL at it.
    const url = `${env.emergency.osrmBaseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    type OsrmResponse = {
      code: string;
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { distance: number; duration: number; summary?: string }[] }[];
      message?: string;
    };
    // The public demo server occasionally drops a request; retry once before
    // surfacing a clear error to the operator.
    let body: OsrmResponse;
    try {
      body = await fetchJson<OsrmResponse>(url, {}, env.emergency.requestTimeoutMs);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        body = await fetchJson<OsrmResponse>(url, {}, env.emergency.requestTimeoutMs);
      } catch {
        throw ApiError.badRequest(
          'Routing service (OSRM demo server) did not respond. For reliable routing, self-host OSRM and set OSRM_BASE_URL.'
        );
      }
    }
    const r = body.routes?.[0];
    if (!r) throw ApiError.notFound(body.message || 'No route found between those points');
    result = {
      distanceM: Math.round(r.distance),
      durationS: Math.round(r.duration),
      coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      legs: r.legs.map((l) => ({ distanceM: Math.round(l.distance), durationS: Math.round(l.duration), summary: l.summary ?? '' })),
      provider: 'OSRM (demo server)',
      traffic: 'unavailable',
      trafficNote: mapboxTrafficNote(),
    };
  }

  // Nearest simulated intersection ahead = the one closest to the vehicle end
  // of the route start segment; simplified to the closest to `from` here.
  const nearest = SIMULATED_INTERSECTIONS.map((i) => ({
    ...i,
    distanceM: Math.round(haversineMeters(fromLat, fromLng, i.lat, i.lng)),
  })).sort((a, b) => a.distanceM - b.distanceM)[0];

  ok(
    res,
    {
      route: result,
      nearestIntersection: nearest
        ? { name: nearest.name, latitude: nearest.lat, longitude: nearest.lng, distanceM: nearest.distanceM }
        : null,
    },
    'Route calculated'
  );
}

/* ------------------------------------------------------------------ */
/* 4. Emergency sessions                                               */
/* ------------------------------------------------------------------ */

/** POST /api/emergency-response/sessions : start a tracked response session. */
export async function startSession(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = startEmergencySessionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid session request', zodFieldErrors(parsed.error));
  }
  const { plate, vehicleType, sessionType, origin, hospital, simulated } = parsed.data;

  // Every session must reference a vehicle that is authorized in the registry.
  const vehicle = await queryOne<{ id: number; vehicleNumber: string; vehicleType: string; priority: string; status: string }>(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType", priority, status
     FROM vehicles WHERE vehicle_number = $1 LIMIT 1`,
    [plate]
  );
  if (!vehicle || vehicle.status !== 'active' || !VEHICLE_TYPES.includes(vehicle.vehicleType) || vehicle.vehicleType !== vehicleType) {
    throw ApiError.forbidden('Session denied: vehicle is not an authorized active emergency vehicle.');
  }

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM emergency_sessions WHERE vehicle_id = $1 AND status = 'active' LIMIT 1`,
    [vehicle.id]
  );
  if (existing) {
    throw ApiError.conflict('This vehicle already has an active emergency session.');
  }

  const row = await queryOne<{
    id: number;
    startedAt: string;
  }>(
    `INSERT INTO emergency_sessions
       (vehicle_id, session_type, status, simulated, origin_lat, origin_lng, origin_label,
        hospital_id, hospital_name, hospital_lat, hospital_lng)
     VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, started_at AS "startedAt"`,
    [
      vehicle.id,
      sessionType,
      simulated,
      origin?.lat ?? null,
      origin?.lng ?? null,
      origin?.label ?? null,
      hospital?.id ?? null,
      hospital?.name ?? null,
      hospital?.lat ?? null,
      hospital?.lng ?? null,
    ]
  );

  await logEvent(
    'emergency_session',
    `Emergency response session #${row?.id} started for ${vehicle.vehicleNumber}${simulated ? ' (simulation mode)' : ''}${hospital ? ` bound for ${hospital.name}` : ''}.`,
    simulated ? 'info' : 'critical'
  );

  ok(
    res,
    {
      session: {
        id: Number(row?.id),
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        priority: vehicle.priority,
        sessionType,
        simulated,
        hospital: hospital ?? null,
        status: 'active',
        startedAt: row?.startedAt,
      },
    },
    'Emergency response session started',
    201
  );
}

/** GET /api/emergency-response/sessions/active : current session for this vehicle/user. */
export async function activeSession(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const rows = await query(
    `SELECT s.id, s.session_type AS "sessionType", s.status, s.simulated,
            s.started_at AS "startedAt", s.origin_label AS "originLabel",
            s.hospital_name AS "hospitalName", s.hospital_lat AS "hospitalLat", s.hospital_lng AS "hospitalLng",
            s.last_lat AS "lastLat", s.last_lng AS "lastLng", s.last_speed_kph AS "lastSpeedKph",
            v.vehicle_number AS "vehicleNumber", v.vehicle_type AS "vehicleType", v.priority,
            (SELECT COUNT(*)::int FROM signal_priority_requests p WHERE p.session_id = s.id AND p.decision = 'granted') AS "grantedCount"
     FROM emergency_sessions s
     JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.status = 'active'
     ORDER BY s.started_at DESC LIMIT 10`
  );
  ok(res, { sessions: rows }, 'Active emergency sessions');
}

/** PUT /api/emergency-response/sessions/:id/gps : push a GPS ping for the vehicle. */
export async function gpsPing(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId)) throw ApiError.badRequest('Invalid session id');
  const parsed = gpsPingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid GPS data', zodFieldErrors(parsed.error));
  }
  const { lat, lng, speedKph, headingDeg: _heading, accuracyM } = parsed.data;

  const session = await queryOne<{ id: number; status: string; simulated: boolean }>(
    'SELECT id, status, simulated FROM emergency_sessions WHERE id = $1 LIMIT 1',
    [sessionId]
  );
  if (!session || session.status !== 'active') throw ApiError.notFound('Active emergency session not found');

  await execute(
    `UPDATE emergency_sessions
     SET last_lat = $1, last_lng = $2, last_speed_kph = $3, last_accuracy_m = $4, last_ping_at = NOW()
     WHERE id = $5`,
    [lat, lng, speedKph ?? null, accuracyM ?? null, sessionId]
  );

  ok(
    res,
    {
      received: true,
      gpsValid: accuracyM === undefined || accuracyM <= 200,
      position: { latitude: lat, longitude: lng },
    },
    'Position updated'
  );
}

/** PUT /api/emergency-response/sessions/:id/end : release priority and close the session. */
export async function endSession(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId)) throw ApiError.badRequest('Invalid session id');

  const session = await queryOne<{ id: number; status: string; vehicle_id: number }>(
    'SELECT id, status, vehicle_id FROM emergency_sessions WHERE id = $1 LIMIT 1',
    [sessionId]
  );
  if (!session) throw ApiError.notFound('Session not found');
  if (session.status !== 'active') {
    ok(res, { ended: true }, 'Session was already ended');
    return;
  }

  // Release any priority still held by this session.
  const held = await query<{ id: number; intersection: string; direction: string }>(
    `SELECT p.id, p.intersection_name AS "intersection", p.direction
     FROM signal_priority_requests p WHERE p.session_id = $1 AND p.released_at IS NULL`,
    [sessionId]
  );
  for (const h of held) {
    await releasePriorityInternal(h.intersection);
  }

  await execute(
    `UPDATE emergency_sessions SET status = 'completed', ended_at = NOW() WHERE id = $1`,
    [sessionId]
  );
  await logEvent('emergency_session', `Emergency response session #${sessionId} ended. Priority released and signals returned to automatic control.`, 'success');

  ok(res, { ended: true, releasedPriorities: held.length }, 'Session ended. Signal priority released.');
}

/* ------------------------------------------------------------------ */
/* 5. Signal priority requests (safe, audited, hardware-guarded)       */
/* ------------------------------------------------------------------ */

/**
 * Restore a simulated intersection to its normal automatic cycle after a
 * priority release. Updates DB rows only; never touches physical hardware.
 */
async function releasePriorityInternal(intersectionName: string): Promise<void> {
  const dir = await queryOne<{ direction: string }>(
    `SELECT direction FROM signal_priority_requests
     WHERE intersection_name = $1 AND released_at IS NULL
     ORDER BY requested_at DESC LIMIT 1`,
    [intersectionName]
  );
  await execute(
    `UPDATE traffic_signals SET mode = 'auto', remaining_seconds = 15, updated_at = NOW()
     WHERE intersection_name = $1`,
    [intersectionName]
  );
  // Sensible default cycle: N/S green alternate with E/W red, matching the seed.
  const greenDir = dir?.direction === 'E' || dir?.direction === 'W' ? 'E' : 'N';
  await execute(
    `UPDATE traffic_signals SET state = 'green', updated_at = NOW() WHERE intersection_name = $1 AND direction = $2`,
    [intersectionName, greenDir]
  );
  await execute(
    `UPDATE traffic_signals SET state = 'red', updated_at = NOW() WHERE intersection_name = $1 AND direction != $2`,
    [intersectionName, greenDir]
  );
  await execute(
    `UPDATE signal_priority_requests SET released_at = NOW(), released_reason = 'session ended or vehicle passed'
     WHERE intersection_name = $1 AND released_at IS NULL`,
    [intersectionName]
  );
}

/**
 * POST /api/emergency-response/sessions/:id/request-priority
 *
 * Ask the existing signal simulator for priority at the vehicle's next
 * intersection. Decision logic:
 *  - session must be active and tied to a verified, active registry vehicle
 *  - yellow phases are never cut short; we wait for clearance
 *  - when granting, conflicting approaches get red with an all-red clearance
 *  - pedestrian safety: grant sets a minimum green so crossings stay walkable
 *    and conflicts are held for the whole corridor window
 *  - every decision (granted or denied) is stored and logged with a reason
 */
export async function requestPriority(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId)) throw ApiError.badRequest('Invalid session id');
  const parsed = priorityRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid priority request', zodFieldErrors(parsed.error));
  }
  const { direction, distanceM } = parsed.data;

  const session = await queryOne<{
    id: number;
    status: string;
    simulated: boolean;
    vehicle_id: number;
    vehicle_number: string;
    priority: string;
    hospital_name: string | null;
  }>(
    `SELECT s.id, s.status, s.simulated, s.vehicle_id, v.vehicle_number, v.priority, s.hospital_name
     FROM emergency_sessions s JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.id = $1 LIMIT 1`,
    [sessionId]
  );
  if (!session) throw ApiError.notFound('Session not found');
  if (session.status !== 'active') throw ApiError.conflict('Session is no longer active');

  // Vehicle must still be active in the registry at request time.
  const vehicleState = await queryOne<{ status: string }>('SELECT status FROM vehicles WHERE id = $1', [session.vehicle_id]);
  if (!vehicleState || vehicleState.status !== 'active') {
    throw ApiError.forbidden('Priority denied: vehicle is no longer active in the authorized registry.');
  }

  // Nearest instrumented intersection to base the request on.
  const lastPos = await queryOne<{ last_lat: number; last_lng: number }>(
    'SELECT last_lat, last_lng FROM emergency_sessions WHERE id = $1',
    [sessionId]
  );
  let intersection: { name: string; lat: number; lng: number } = SIMULATED_INTERSECTIONS[0];
  if (lastPos?.last_lat != null && lastPos?.last_lng != null) {
    const sorted = SIMULATED_INTERSECTIONS.map((i) => ({
      name: i.name as string,
      lat: i.lat as number,
      lng: i.lng as number,
      d: haversineMeters(Number(lastPos.last_lat), Number(lastPos.last_lng), i.lat, i.lng),
    })).sort((a, b) => a.d - b.d);
    intersection = { name: sorted[0].name, lat: sorted[0].lat, lng: sorted[0].lng };
  }

  const signals = await query<{ id: number; direction: string; state: string; mode: string; remaining_seconds: number }>(
    `SELECT id, direction, state, mode, remaining_seconds FROM traffic_signals WHERE intersection_name = $1`,
    [intersection.name]
  );
  if (signals.length === 0) {
    throw ApiError.notFound(`No signals simulated for intersection "${intersection.name}"`);
  }
  const own = signals.find((s) => s.direction === direction);
  if (!own) throw ApiError.notFound(`No ${direction} approach simulated at ${intersection.name}`);

  const conflicting = signals.filter((s) => s.direction !== direction);
  const conflictingGreen = conflicting.filter((s) => s.state === 'green');
  const yellowHold = own.state === 'yellow' || conflicting.some((s) => s.state === 'yellow');

  const intersect = SIMULATED_INTERSECTIONS.find((i) => i.name === intersection.name)!;
  const metersToIntersection = Math.max(distanceM, 0);

  // Decision.
  let decision: 'granted' | 'denied';
  let reason: string;
  if (PHYSICAL_ACTUATION) {
    decision = 'denied';
    reason = 'Physical signal actuation integration is configured; this demo endpoint does not drive real hardware.';
  } else if (yellowHold) {
    decision = 'denied';
    reason = 'Signal is in a yellow clearance interval. Priority requests wait for the clearance and all-red interval to finish before a green is granted.';
  } else if (conflictingGreen.length > 0 && metersToIntersection > 400) {
    // Conflicting traffic has green and the vehicle is still far away: hold.
    decision = 'denied';
    reason = `Conflicting approach ${conflictingGreen.map((c) => c.direction).join('/')} currently has green and the vehicle is ${metersToIntersection}m out. Request will succeed closer to the intersection.`;
  } else {
    decision = 'granted';
    reason = `Verified emergency vehicle ${session.vehicle_number} (${session.priority} priority) approaching from ${direction} at ${metersToIntersection}m.`;
  }

  // Store the request either way (audit trail for the operator UI).
  const pr = await queryOne<{ id: number }>(
    `INSERT INTO signal_priority_requests
       (session_id, intersection_name, direction, distance_m, decision, reason, granted_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      sessionId,
      intersection.name,
      direction,
      metersToIntersection,
      decision,
      reason,
      decision === 'granted' ? env.emergency.minGreenSeconds + env.emergency.allRedClearanceSeconds : null,
    ]
  );

  if (decision === 'granted') {
    // Green for the approach, red for conflicts with an all-red clearance gap.
    await execute(
      `UPDATE traffic_signals
       SET state = 'green', remaining_seconds = $1, mode = 'emergency', updated_at = NOW()
       WHERE intersection_name = $2 AND direction = $3`,
      [env.emergency.minGreenSeconds, intersection.name, direction]
    );
    await execute(
      `UPDATE traffic_signals
       SET state = 'red', remaining_seconds = $1, mode = 'emergency', updated_at = NOW()
       WHERE intersection_name = $2 AND direction != $3`,
      [env.emergency.minGreenSeconds + env.emergency.allRedClearanceSeconds, intersection.name, direction]
    );

    const ownSignal = signals.find((s) => s.direction === direction)!;
    await execute(
      `INSERT INTO signal_events (signal_id, vehicle_id, previous_state, new_state, reason)
       VALUES ($1, $2, $3, 'green', $4)`,
      [ownSignal.id, session.vehicle_id, ownSignal.state, `Emergency priority corridor for ${session.vehicle_number} (${direction} approach)`]
    );
    await execute(
      `UPDATE emergency_sessions SET priority_intersections = COALESCE(priority_intersections, '') || $1 WHERE id = $2`,
      [`${intersection.name};`, sessionId]
    );
  }

  // Re-read signal states so the response reflects the decision just applied.
  const signalsAfter = await query<{ id: number; direction: string; state: string; mode: string; remaining_seconds: number }>(
    `SELECT id, direction, state, mode, remaining_seconds FROM traffic_signals WHERE intersection_name = $1 ORDER BY direction`,
    [intersection.name]
  );

  await logEvent(
    decision === 'granted' ? 'priority_activated' : 'priority_denied',
    `Priority ${decision} at ${intersection.name} for ${session.vehicle_number} (${direction}, ${metersToIntersection}m): ${reason}`,
    decision === 'granted' ? 'critical' : 'info'
  );

  ok(
    res,
    {
      requestId: Number(pr?.id),
      decision,
      reason,
      intersection: {
        name: intersection.name,
        latitude: intersect.lat,
        longitude: intersect.lng,
      },
      approach: direction,
      distanceM: metersToIntersection,
      signals: signalsAfter.map((s) => ({
        direction: s.direction,
        state: s.state,
        remainingSeconds: s.remaining_seconds,
        mode: s.mode,
      })),
      // What would happen to real hardware. Always false in this deployment
      // unless SIGNAL_ACTUATION_ENABLED=true and a certified controller exists.
      physicalActuation: PHYSICAL_ACTUATION,
      actuationNote: PHYSICAL_ACTUATION
        ? 'Authorized signal actuation integration is configured.'
        : 'Physical traffic-light control is disabled. Signal states are updated in the simulator only.',
      yellowHold,
      minGreenSeconds: env.emergency.minGreenSeconds,
      allRedClearanceSeconds: env.emergency.allRedClearanceSeconds,
    },
    decision === 'granted' ? 'Priority granted' : 'Priority denied'
  );
}

/** POST /api/emergency-response/sessions/:id/release-priority : explicit release. */
export async function releasePriority(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId)) throw ApiError.badRequest('Invalid session id');
  const session = await queryOne<{ id: number; status: string }>(
    'SELECT id, status FROM emergency_sessions WHERE id = $1 LIMIT 1',
    [sessionId]
  );
  if (!session) throw ApiError.notFound('Session not found');

  const held = await query<{ intersection_name: string }>(
    'SELECT DISTINCT intersection_name FROM signal_priority_requests WHERE session_id = $1 AND released_at IS NULL',
    [sessionId]
  );
  for (const h of held) {
    await releasePriorityInternal(h.intersection_name);
  }
  await logEvent('priority_released', `Signal priority released for session #${sessionId}. Normal signal cycle restored.`, 'success');
  ok(res, { released: held.length }, held.length > 0 ? 'Priority released. Normal signal cycle restored.' : 'No priority was held.');
}

/** GET /api/emergency-response/intersections : simulated intersections for the map. */
export async function listIntersections(_req: AuthRequest, res: Response): Promise<void> {
  const signals = await query<{ intersection: string; direction: string; state: string; remaining: number; mode: string }>(
    `SELECT intersection_name AS "intersection", direction, state, remaining_seconds AS remaining, mode
     FROM traffic_signals ORDER BY intersection_name, direction`
  );
  const list = SIMULATED_INTERSECTIONS.map((i) => ({
    name: i.name,
    latitude: i.lat,
    longitude: i.lng,
    signals: signals.filter((s) => s.intersection === i.name),
  }));
  ok(res, { intersections: list, physicalActuation: PHYSICAL_ACTUATION }, 'Simulated intersections');
}

/** Derive approach direction from two GPS points (kept for future auto-mode). */
export function directionFromMovement(
  fromLat: number, fromLng: number, toLat: number, toLng: number
): 'N' | 'E' | 'S' | 'W' {
  return bearingToDirection(bearingDeg(fromLat, fromLng, toLat, toLng));
}
