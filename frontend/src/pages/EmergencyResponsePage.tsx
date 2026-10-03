import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Siren, Search, MapPin, Navigation, Hospital as HospitalIcon, ShieldCheck, ShieldX, Play, Square,
  TriangleAlert, Radio, Gauge, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, Button, Badge, Input, Select, SectionTitle } from '../components/ui';
import { emergencyResponseService, type EmergencySession, type Hospital, type RouteResult, type SimIntersection, type VerifyPlateResult } from '../services/emergencyResponse';
import { signalService, type SignalRow } from '../services/services';
import { useToast } from '../context/ToastContext';

const DEFAULT_CENTER: [number, number] = [13.9824, 74.556]; // NH 66 Central Junction area
const VEHICLE_TYPES = [
  { value: 'ambulance', label: 'Ambulance' },
  { value: 'patient_transport', label: 'Patient Transport' },
  { value: 'emergency_medical', label: 'Emergency Medical' },
] as const;

/** Green corridor test plates (from database/seed.sql). */
const DEMO_PLATES = ['KA 05 MT 7321', 'KA 02 AV 9055', 'KA 19 EM 4410'];

/* ------------------------------------------------------------------ */
/* Map helpers                                                         */
/* ------------------------------------------------------------------ */

function Recenter({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, map, zoom]);
  return null;
}

function vehicleIcon(state: 'idle' | 'moving' | 'priority') {
  const color = state === 'priority' ? '#EF4444' : state === 'moving' ? '#0EA5E9' : '#94A3B8';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 10px ${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function hospitalIcon(selected: boolean) {
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${selected ? '#0EA5E9' : '#7F1D1D'};color:#fff;font-size:13px;font-weight:700;border:2px solid #06111F">+</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function intersectionIcon(hasGreen: boolean) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:3px;background:${hasGreen ? '#22C55E' : '#EF4444'};border:2px solid #06111F"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/* ------------------------------------------------------------------ */
/* Simulation mode: dead-reckoning along the route                     */
/* ------------------------------------------------------------------ */

/** Move a point `distM` meters along a polyline starting at index `fromIdx`. */
/** Point at `distM` meters along the polyline, measured from the start. */
function pointAtDistance(coords: [number, number][], distM: number): { lat: number; lng: number } {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let remaining = Math.max(0, distM);
  let i = 0;
  while (i < coords.length - 1) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[i + 1];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const segLen = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    if (segLen >= remaining) {
      const f = segLen === 0 ? 0 : remaining / segLen;
      return { lat: lat1 + (lat2 - lat1) * f, lng: lng1 + (lng2 - lng1) * f };
    }
    remaining -= segLen;
    i += 1;
  }
  const last = coords[coords.length - 1];
  return { lat: last[0], lng: last[1] };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Phase = 'verify' | 'ready' | 'active';

interface PriorityLogEntry {
  decision: 'granted' | 'denied';
  reason: string;
  intersection: string;
  approach: string;
  at: string;
}

/** Compact route summary chip (distance, duration, provider). */
function RouteSummary({ route }: { route: RouteResult }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <span className="flex items-center gap-1 text-slate-300">
        <Navigation className="h-3.5 w-3.5 text-sky-400" aria-hidden />
        {(route.route.distanceM / 1000).toFixed(1)} km
      </span>
      <span className="flex items-center gap-1 text-slate-300">
        <Gauge className="h-3.5 w-3.5 text-sky-400" aria-hidden />
        {Math.round(route.route.durationS / 60)} min
      </span>
      <span className="truncate text-slate-500">{route.route.provider}</span>
    </div>
  );
}

export default function EmergencyResponsePage() {
  const toast = useToast();

  // verification form
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('ambulance');
  const [verifyResult, setVerifyResult] = useState<VerifyPlateResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // gps / position
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [simMode, setSimMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // hospitals + route
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);

  // session
  const [phase, setPhase] = useState<Phase>('verify');
  const [session, setSession] = useState<EmergencySession | null>(null);
  const [priorityLog, setPriorityLog] = useState<PriorityLogEntry[]>([]);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [intersections, setIntersections] = useState<SimIntersection[]>([]);
  const [busy, setBusy] = useState(false);

  // simulation engine refs
  const simTimer = useRef<number | null>(null);
  const routeState = useRef<{ coords: [number, number][]; idx: number; totalM: number } | null>(null);
  const lastGpsPingAt = useRef(0);
  const lastPriorityAt = useRef(0);

  /* ---------------- verification ---------------- */

  const verify = async () => {
    if (!plate.trim()) {
      toast('error', 'Enter a number plate first.');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data } = await emergencyResponseService.verifyPlate({ plate: plate.trim(), vehicleType });
      setVerifyResult(data);
      setPhase('ready');
      if (data.authorized && data.lastSeen) {
        setPosition([data.lastSeen.latitude, data.lastSeen.longitude]);
        setMapCenter([data.lastSeen.latitude, data.lastSeen.longitude]);
      } else if (data.authorized) {
        setMapCenter(DEFAULT_CENTER);
      }
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  /* ---------------- real GPS ---------------- */

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('This browser does not expose GPS. Use simulation mode.');
      return false;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsError(null);
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        setGpsError(`${err.message}. Enable location permission or switch to simulation mode.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return true;
  }, []);

  /* ---------------- hospitals ---------------- */

  const loadHospitals = useCallback(async (lat: number, lng: number) => {
    setHospitalError(null);
    setHospitals(null);
    setHospitalsLoading(true);
    try {
      const data = await emergencyResponseService.hospitals(lat, lng);
      setHospitals(data.hospitals);
      if (data.hospitals.length === 0) {
        setHospitalError('No hospitals found within the search radius. Increase HOSPITAL_RADIUS_M or move the search center.');
      }
    } catch (e) {
      setHospitalError(e instanceof Error ? e.message : 'Hospital lookup failed');
    } finally {
      setHospitalsLoading(false);
    }
  }, []);

  /* ---------------- route ---------------- */

  const loadRoute = useCallback(async (from: [number, number], to: Hospital) => {
    setSelectedHospital(to);
    setRoute(null);
    try {
      const data = await emergencyResponseService.route(from[0], from[1], to.latitude, to.longitude);
      setRoute(data);
      // seed the simulation walker with the real route geometry
      routeState.current = { coords: data.route.coordinates, idx: 0, totalM: data.route.distanceM };
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Routing failed');
      setSelectedHospital(null);
    }
  }, [toast]);

  /* ---------------- session lifecycle ---------------- */

  const startSession = async () => {
    if (!verifyResult?.authorized || !verifyResult.vehicle) return;
    setBusy(true);
    try {
      const origin = position ? { lat: position[0], lng: position[1], label: simMode ? 'Simulated position' : 'GPS position' } : undefined;
      const { data, message } = await emergencyResponseService.startSession({
        plate: verifyResult.vehicle.vehicleNumber,
        vehicleType,
        sessionType: 'hospital_transport',
        origin,
        hospital: selectedHospital
          ? { id: selectedHospital.id, name: selectedHospital.name, lat: selectedHospital.latitude, lng: selectedHospital.longitude }
          : undefined,
        simulated: simMode,
      });
      setSession(data.session);
      setPhase('active');
      setPriorityLog([]);
      toast('success', message);
      // load signals + intersections for the priority loop
      const [sig, inter] = await Promise.all([
        signalService.list(),
        emergencyResponseService.intersections(),
      ]);
      setSignals(sig.signals.filter((s) => s.intersection === 'NH 66 Central Junction'));
      setIntersections(inter.intersections);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not start session');
    } finally {
      setBusy(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await emergencyResponseService.endSession(session.id);
      stopSim();
      setSession(null);
      setPhase('verify');
      setVerifyResult(null);
      setRoute(null);
      setSelectedHospital(null);
      toast('success', 'Session ended. Signal priority released.');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not end session');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- priority loop ---------------- */

  const requestPriority = async (distanceM: number) => {
    if (!session) return;
    const dir: 'N' | 'E' | 'S' | 'W' = 'N'; // corridor approach in the simulator
    try {
      const { data } = await emergencyResponseService.requestPriority(session.id, {
        direction: dir,
        distanceM: Math.round(distanceM),
      });
      setPriorityLog((log) => [
        { decision: data.decision, reason: data.reason, intersection: data.intersection.name, approach: data.approach, at: new Date().toLocaleTimeString() },
        ...log.slice(0, 9),
      ]);
      const sig = await signalService.list();
      setSignals(sig.signals.filter((s) => s.intersection === 'NH 66 Central Junction'));
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Priority request failed');
    }
  };

  /* ---------------- simulation engine ---------------- */

  const stopSim = () => {
    if (simTimer.current !== null) {
      window.clearInterval(simTimer.current);
      simTimer.current = null;
    }
  };

  const startSim = () => {
    if (!route || !session) {
      toast('error', 'Select a hospital and calculate a route first.');
      return;
    }
    if (!routeState.current) return;
    stopSim();
    const speedKph = 40; // demonstration speed
    const stepSeconds = 1;
    const stepMeters = (speedKph * 1000 / 3600) * stepSeconds;
    let traveled = 0;
    simTimer.current = window.setInterval(() => {
      const st = routeState.current;
      if (!st) { stopSim(); return; }
      traveled = Math.min(traveled + stepMeters, st.totalM);
      const p = pointAtDistance(st.coords, traveled);
      const pos: [number, number] = [p.lat, p.lng];
      setPosition(pos);
      // push GPS ping (throttled to every 5s)
      if (Date.now() - lastGpsPingAt.current > 5000) {
        lastGpsPingAt.current = Date.now();
        emergencyResponseService.pushGps(session.id, { lat: pos[0], lng: pos[1], speedKph }).catch(() => {});
      }
      const remaining = Math.max(0, st.totalM - traveled);
      // ask for priority when approaching (within 800m), at most every 15s
      if (remaining < 800 && remaining > 0 && Date.now() - lastPriorityAt.current > 15000) {
        lastPriorityAt.current = Date.now();
        void requestPriority(remaining);
      }
      if (remaining <= 5) {
        stopSim();
        toast('info', 'Simulation: destination reached. Ending session and releasing priority.');
        window.setTimeout(() => { void endSessionRef.current?.(); }, 800);
      }
    }, stepSeconds * 1000);
  };

  const endSessionRef = useRef<(() => Promise<void>) | null>(null);
  endSessionRef.current = endSession;

  useEffect(() => stopSim, []);

  /* ---------------- initial load ---------------- */

  useEffect(() => {
    emergencyResponseService.intersections()
      .then((data) => setIntersections(data.intersections))
      .catch(() => {});
    signalService.list().then((data) => {
      setSignals(data.signals.filter((s) => s.intersection === 'NH 66 Central Junction'));
    }).catch(() => {});
  }, []);

  // refresh signal states while a session is active
  useEffect(() => {
    if (phase !== 'active') return;
    const t = window.setInterval(() => {
      signalService.list().then((data) => {
        setSignals(data.signals.filter((s) => s.intersection === 'NH 66 Central Junction'));
      }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(t);
  }, [phase]);

  const vehicleState: 'idle' | 'moving' | 'priority' =
    phase === 'active' && simTimer.current !== null ? 'priority' : phase === 'active' ? 'moving' : 'idle';

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <Siren className="h-6 w-6 text-red-400" aria-hidden /> Emergency Response
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Verify an authorized emergency vehicle, route to a hospital and request safe signal priority.
          </p>
        </div>
        <Badge tone={simMode ? 'yellow' : 'blue'}>
          {simMode ? 'SIMULATION MODE (not live data)' : 'GPS / LIVE MODE'}
        </Badge>
      </div>

      {/* safety banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
        Physical traffic-light control is disabled. Signal priority requests are evaluated against the
        simulator and recorded for audit; real actuation requires an authorized integration
        (SIGNAL_ACTUATION_ENABLED=true) and certified controller hardware.
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        {/* left column: verify + hospitals + session */}
        <div className="space-y-5">
          {/* 1. verify */}
          <Card>
            <SectionTitle sub="Check the plate against the authorized emergency vehicle registry.">
              1. Verify vehicle
            </SectionTitle>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Plate, e.g. KA 05 MT 7321"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && verify()}
                  aria-label="Number plate"
                />
                <Button onClick={verify} loading={verifying} className="shrink-0">
                  <Search className="h-4 w-4" aria-hidden /> Verify Vehicle
                </Button>
              </div>
              <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} aria-label="Vehicle type">
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Demo plates:</span>
                {DEMO_PLATES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlate(p)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-slate-300 hover:bg-white/10"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {verifyResult && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    verifyResult.authorized
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {verifyResult.authorized ? (
                      <><ShieldCheck className="h-4 w-4" aria-hidden /> Authorization: GRANTED</>
                    ) : (
                      <><ShieldX className="h-4 w-4" aria-hidden /> Authorization: DENIED</>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {verifyResult.authorized
                      ? `${verifyResult.vehicle?.vehicleNumber} - ${verifyResult.vehicle?.organization} (${verifyResult.vehicle?.priority} priority)`
                      : verifyResult.reason}
                  </p>
                  {verifyResult.authorized && verifyResult.lastSeen && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last registry detection: {new Date(verifyResult.lastSeen.detectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* 2. position */}
          <Card>
            <SectionTitle sub="Live GPS when available, or clearly labelled simulation.">
              2. Vehicle position
            </SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={requestGps}>
                <MapPin className="h-4 w-4" aria-hidden /> Use my GPS
              </Button>
              <Button
                variant={simMode ? 'success' : 'ghost'}
                onClick={() => {
                  const next = !simMode;
                  setSimMode(next);
                  if (next && !position) {
                    setPosition(DEFAULT_CENTER);
                    setMapCenter(DEFAULT_CENTER);
                  }
                  toast('info', next ? 'Simulation mode ON: positions are simulated, not live.' : 'Simulation mode OFF.');
                }}
              >
                <Play className="h-4 w-4" aria-hidden /> Simulation mode {simMode ? 'ON' : 'OFF'}
              </Button>
            </div>
            {gpsError && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {gpsError}
              </p>
            )}
            {position && (
              <p className="mt-2 font-mono text-xs text-slate-400">
                {simMode ? 'Simulated position: ' : 'GPS: '}
                {position[0].toFixed(5)}, {position[1].toFixed(5)}
              </p>
            )}
          </Card>

          {/* 3. hospitals */}
          <Card>
            <SectionTitle sub="Hospitals and clinics from OpenStreetMap near the vehicle position.">
              3. Nearby hospitals
            </SectionTitle>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={!position || hospitalsLoading}
              loading={hospitalsLoading}
              onClick={() => position && loadHospitals(position[0], position[1])}
            >
              <HospitalIcon className="h-4 w-4" aria-hidden /> Search hospitals
            </Button>
            {!position && <p className="mt-2 text-xs text-slate-500">Set a vehicle position first (GPS or simulation).</p>}
            {hospitalError && (
              <p className="mt-2 text-xs text-amber-300">{hospitalError}</p>
            )}
            {hospitals && hospitals.length > 0 && (
              <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {hospitals.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => position && loadRoute(position, h)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        selectedHospital?.id === h.id
                          ? 'border-sky-500/40 bg-sky-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-white">{h.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{(h.distanceM / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {h.emergency && <Badge tone="red">24/7 emergency</Badge>}
                        <Badge tone={h.kind === 'hospital' ? 'blue' : 'gray'}>{h.kind}</Badge>
                        {h.phone && <span className="text-[11px] text-slate-500">{h.phone}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 4. session */}
          <Card>
            <SectionTitle sub="Start the tracked response to enable signal priority requests.">
              4. Response session
            </SectionTitle>
            {phase === 'verify' && <p className="mt-3 text-xs text-slate-500">Verify an authorized vehicle to continue.</p>}
            {phase === 'ready' && verifyResult?.authorized && (
              <Button className="mt-3" onClick={startSession} loading={busy}>
                <Radio className="h-4 w-4" aria-hidden /> Start response session
              </Button>
            )}
            {phase === 'ready' && route && (
              <div className="mt-3 space-y-2">
                <RouteSummary route={route} />
                {route.route.trafficNote && (
                  <p className="text-[11px] leading-relaxed text-amber-300/80">{route.route.trafficNote}</p>
                )}
              </div>
            )}
            {phase === 'active' && session && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">ACTIVE</Badge>
                  {session.simulated && <Badge tone="yellow">simulated</Badge>}
                  {selectedHospital && <span className="text-xs text-slate-300">to {selectedHospital.name}</span>}
                </div>
                <p className="font-mono text-xs text-slate-400">Session #{session.id} - {session.vehicleNumber}</p>
                {route && <RouteSummary route={route} />}
                {route?.route.trafficNote && (
                  <p className="text-[11px] leading-relaxed text-amber-300/80">{route.route.trafficNote}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {simMode ? (
                    <Button variant="success" onClick={startSim}>
                      <Play className="h-4 w-4" aria-hidden /> Run simulation drive
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => position && requestPriority(150)}
                      title="Request corridor priority for the next intersection"
                    >
                      <Radio className="h-4 w-4" aria-hidden /> Request priority now
                    </Button>
                  )}
                  <Button variant="danger" onClick={endSession} loading={busy}>
                    <Square className="h-4 w-4" aria-hidden /> End session
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  In live GPS mode, request priority manually while approaching; the backend re-checks authorization on every request.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* right column: map + priority */}
        <div className="space-y-5">
          <Card className="overflow-hidden !p-0">
            <div className="relative h-[420px] w-full">
              <MapContainer center={mapCenter ?? DEFAULT_CENTER} zoom={13} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Recenter center={mapCenter} zoom={14} />

                {/* route */}
                {route && <Polyline positions={route.route.coordinates} pathOptions={{ color: '#0EA5E9', weight: 5, opacity: 0.8 }} />}

                {/* vehicle */}
                {position && (
                  <Marker position={position} icon={vehicleIcon(vehicleState)}>
                    <Popup>
                      <b>{verifyResult?.vehicle?.vehicleNumber ?? 'Emergency vehicle'}</b>
                      <br />
                      {simMode ? 'Simulated position (not live GPS)' : 'Live GPS position'}
                    </Popup>
                  </Marker>
                )}

                {/* hospitals */}
                {hospitals?.map((h) => (
                  <Marker
                    key={h.id}
                    position={[h.latitude, h.longitude]}
                    icon={hospitalIcon(selectedHospital?.id === h.id)}
                    eventHandlers={{ click: () => position && loadRoute(position, h) }}
                  >
                    <Popup>
                      <b>{h.name}</b>
                      <br />
                      {h.kind}{h.emergency ? ' - 24/7 emergency' : ''}
                      <br />
                      {(h.distanceM / 1000).toFixed(1)} km away
                    </Popup>
                  </Marker>
                ))}

                {/* simulated intersections */}
                {intersections.map((i) => {
                  const hasGreen = i.signals.some((s) => s.state === 'green');
                  return (
                    <Marker key={i.name} position={[i.latitude, i.longitude]} icon={intersectionIcon(hasGreen)}>
                      <Popup>
                        <b>{i.name}</b>
                        <br />
                        {i.signals.map((s) => (
                          <span key={s.direction} style={{ marginRight: 8 }}>
                            {s.direction}:{' '}
                            <b style={{ color: s.state === 'green' ? '#22C55E' : s.state === 'yellow' ? '#FACC15' : '#EF4444' }}>
                              {s.state.toUpperCase()}
                            </b>
                          </span>
                        ))}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* simulation mode watermark */}
              {simMode && (
                <span className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-md border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-bold tracking-wide text-amber-200 backdrop-blur">
                  SIMULATION MODE - DEMO DATA, NOT LIVE
                </span>
              )}
            </div>
          </Card>

          {/* signal state + priority log */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <SectionTitle sub="Live state from the SignalFlow signal simulator.">
                Intersection signals
              </SectionTitle>
              {signals.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">Signal states will appear once a session is active.</p>
              ) : (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {['N', 'E', 'S', 'W'].map((d) => {
                    const s = signals.find((x) => x.direction === d);
                    const state = s?.state ?? 'red';
                    return (
                      <div key={d} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                        <p className="text-xs font-semibold text-slate-300">{d}</p>
                        <span
                          className={`mx-auto mt-2 block h-5 w-5 rounded-full ${
                            state === 'green' ? 'bg-emerald-400' : state === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          aria-hidden
                        />
                        <p className="mt-2 text-[11px] text-slate-500">{s?.remainingSeconds ?? 0}s</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle sub="Every decision is stored in signal_priority_requests for audit.">
                Priority decisions
              </SectionTitle>
              {priorityLog.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Priority requests and their outcomes (granted or denied, with reasons) will appear here.
                </p>
              ) : (
                <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {priorityLog.map((p, i) => (
                    <li key={`${p.at}-${i}`} className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 font-semibold ${p.decision === 'granted' ? 'text-emerald-300' : 'text-red-300'}`}>
                          {p.decision === 'granted' ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> GRANTED</>
                          ) : (
                            <><XCircle className="h-3.5 w-3.5" aria-hidden /> DENIED</>
                          )}
                        </span>
                        <span className="text-slate-500">{p.at}</span>
                      </div>
                      <p className="mt-1 text-slate-400">{p.reason}</p>
                      <p className="mt-0.5 text-slate-500">{p.intersection} - {p.approach} approach</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
