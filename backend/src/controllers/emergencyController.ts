import { Response } from 'express';
import { query, queryOne, execute } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { emergencySimulateSchema, zodFieldErrors } from '../utils/validation';
import { logEvent } from '../utils/logger';

const INTERSECTION = 'NH 66 Central Junction';

/** GET /api/emergency : active + recent emergency events with vehicle info. */
export async function listEmergencyEvents(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await query(
    `SELECT e.id, e.intersection_id AS "intersection", e.priority, e.distance,
            e.direction, e.status, e.created_at AS "createdAt", e.cleared_at AS "clearedAt",
            v.vehicle_number AS "vehicleNumber", v.vehicle_type AS "vehicleType",
            v.organization
     FROM emergency_events e
     LEFT JOIN vehicles v ON v.id = e.vehicle_id
     ORDER BY e.created_at DESC LIMIT 25`
  );
  ok(res, {
    events: rows.map((r) => ({ ...r, distance: Number(r.distance) })),
    dataSource: 'simulated',
  });
}

/**
 * POST /api/emergency/simulate (operator+)
 * Simulates the full detection + verification + priority pipeline for one or two
 * emergency vehicles and records the resulting events, signal change and logs.
 * This is a DEMO endpoint: it simulates ANPR and priority logic, it does not
 * talk to real CCTV or signal hardware.
 */
export async function simulateEmergency(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = emergencySimulateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid simulation request', zodFieldErrors(parsed.error));
  }
  const { plate, direction, distance, scenario } = parsed.data;

  // 1. Number plate lookup against the registered emergency database.
  const vehicle = await queryOne<{ id: number; vehicleNumber: string; vehicleType: string; priority: string; status: string }>(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
            priority, status FROM vehicles WHERE vehicle_number = $1 LIMIT 1`,
    [plate]
  );
  if (!vehicle || vehicle.status !== 'active') {
    await logEvent(
      'vehicle_verification',
      `Plate ${plate} not found in the emergency vehicle database. Priority denied.`,
      'warning'
    );
    throw ApiError.badRequest(
      `Plate ${plate} is not a registered emergency vehicle. Priority denied.`
    );
  }

  // 2. Record the detection event (simulated CCTV + AI + ANPR).
  await execute(
    `INSERT INTO detections (vehicle_id, camera_id, vehicle_number, vehicle_type, confidence, direction, distance)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [vehicle.id, 'CCTV-01', vehicle.vehicleNumber, vehicle.vehicleType, 0.97, direction, distance]
  );

  // 3. Priority decision: criticality first, then distance (smaller is higher).
  const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  const candidate: { plate: string; distance: number; priority: string } = {
    plate: vehicle.vehicleNumber,
    distance,
    priority: vehicle.priority,
  };

  // Optional second vehicle for the two-ambulance scenario.
  let second: { plate: string; distance: number; priority: string } | null = null;
  if (scenario === 'two_ambulance') {
    const secondRow = await queryOne<{ id: number; vehicleNumber: string; vehicleType: string; priority: string }>(
      `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType", priority
       FROM vehicles WHERE vehicle_number != $1 AND vehicle_type = 'ambulance' AND status = 'active'
       ORDER BY priority LIMIT 1`,
      [vehicle.vehicleNumber]
    );
    if (secondRow) {
      second = {
        plate: secondRow.vehicleNumber,
        distance: Math.min(2000, distance + 230),
        priority: secondRow.priority,
      };
      await execute(
        `INSERT INTO detections (vehicle_id, camera_id, vehicle_number, vehicle_type, confidence, direction, distance)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [secondRow.id, 'CCTV-02', secondRow.vehicleNumber, secondRow.vehicleType, 0.95, direction === 'N' ? 'S' : 'N', second.distance]
      );
    }
  }

  const queue = [candidate, second].filter(Boolean) as Array<typeof candidate>;
  queue.sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 3;
    const pb = priorityRank[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return a.distance - b.distance;
  });

  // 4. Activate priority for the winner; queue the rest.
  const winner = queue[0];
  const loser = queue[1] ?? null;

  const emergencyEvent = await queryOne(
    `INSERT INTO emergency_events (vehicle_id, intersection_id, priority, distance, direction, status)
     VALUES ($1, $2, $3, $4, $5, 'priority')
     RETURNING id`,
    [vehicle.id, INTERSECTION, winner.priority, winner.distance, direction]
  );

  // 5. Green corridor: approach direction green, others red, mode = emergency.
  await execute(
    `UPDATE traffic_signals SET state = 'green', remaining_seconds = 45, mode = 'emergency', updated_at = NOW()
     WHERE intersection_name = $1 AND direction = $2`,
    [INTERSECTION, direction]
  );
  await execute(
    `UPDATE traffic_signals SET state = 'red', remaining_seconds = 45, mode = 'emergency', updated_at = NOW()
     WHERE intersection_name = $1 AND direction != $2`,
    [INTERSECTION, direction]
  );

  const signal = await queryOne<{ id: number }>(
    'SELECT id FROM traffic_signals WHERE intersection_name = $1 AND direction = $2 LIMIT 1',
    [INTERSECTION, direction]
  );
  if (signal) {
    await execute(
      `INSERT INTO signal_events (signal_id, vehicle_id, previous_state, new_state, reason)
       VALUES ($1, $2, 'red', 'green', $3)`,
      [signal.id, vehicle.id, `Emergency priority corridor for ${winner.plate} (Critical + Nearest)`]
    );
  }

  await logEvent(
    'priority_activated',
    `Emergency priority activated for ${winner.plate} (${winner.priority} priority, ${winner.distance}m). ${loser ? `${loser.plate} queued.` : ''}`,
    'critical'
  );

  ok(
    res,
    {
      selected: {
        vehicleNumber: winner.plate,
        priority: winner.priority,
        distance: winner.distance,
        direction,
        reason: `${winner.priority} priority + ${loser ? 'nearest of two candidates' : 'verified emergency vehicle'}`,
      },
      queued: loser ? { vehicleNumber: loser.plate, distance: loser.distance, priority: loser.priority } : null,
      emergencyEventId: emergencyEvent?.id ?? null,
      signal: { direction, state: 'green', mode: 'emergency' },
    },
    'Emergency priority activated. Conflicting traffic stopped in simulation.',
    201
  );
}

/** POST /api/emergency/reset (operator+) : clears the corridor and restores normal operation. */
export async function resetEmergency(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);

  // Mark active emergency events cleared.
  await execute(
    `UPDATE emergency_events SET status = 'cleared', cleared_at = NOW()
     WHERE status IN ('detected','verifying','verified','priority','crossing')`
  );
  // Restore signals to normal auto cycle.
  await execute(
    `UPDATE traffic_signals SET mode = 'auto', updated_at = NOW() WHERE intersection_name = $1`,
    [INTERSECTION]
  );
  await execute(
    `UPDATE traffic_signals SET state = 'green', remaining_seconds = 15 WHERE intersection_name = $1 AND direction = 'N'`,
    [INTERSECTION]
  );
  await execute(
    `UPDATE traffic_signals SET state = 'red', remaining_seconds = 15 WHERE intersection_name = $1 AND direction != 'N'`,
    [INTERSECTION]
  );

  await logEvent('traffic_normal', 'Emergency corridor cleared. Normal traffic operation restored.', 'success');
  ok(res, { restored: true }, 'Corridor cleared. Normal traffic simulation restored.');
}

/** GET /api/analytics/emergency : emergency KPIs and per-day activations. */
export async function emergencyAnalytics(_req: AuthRequest, res: Response): Promise<void> {
  const [total, active, perDay, avgClear] = await Promise.all([
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM emergency_events'),
    queryOne<{ v: string }>(
      `SELECT COUNT(*)::text AS v FROM emergency_events WHERE status NOT IN ('cleared')`
    ),
    query<{ day: string; count: string }>(
      `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM emergency_events WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY DATE(created_at)`
    ),
    queryOne<{ v: string }>(
      `SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (cleared_at - created_at)) / 60)), 0)::text AS v
       FROM emergency_events WHERE cleared_at IS NOT NULL`
    ),
  ]);

  ok(res, {
    totals: {
      detected: Number(total?.v ?? 0),
      active: Number(active?.v ?? 0),
      avgClearanceMinutes: Number(avgClear?.v ?? 0),
    },
    perDay: perDay.map((d) => ({ day: d.day, count: Number(d.count) })),
    dataSource: 'simulated',
  });
}
