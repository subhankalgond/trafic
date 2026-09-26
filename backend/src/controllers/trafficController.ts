import { Response } from 'express';
import { query, queryOne } from '../config/db';
import { ok } from '../utils/response';
import { AuthRequest } from '../types/express';

/** GET /api/traffic : dashboard KPI snapshot fed from seeded sample data. */
export async function trafficOverview(_req: AuthRequest, res: Response): Promise<void> {
  const [vehiclesToday, activeIncidents, congested, emergencyActive, signalsOnline, avgSpeed] =
    await Promise.all([
      queryOne<{ v: string }>(
        `SELECT COALESCE(SUM(vehicle_count), 0)::text AS v FROM traffic_records
         WHERE recorded_at >= NOW() - INTERVAL '24 hours'`
      ),
      queryOne<{ v: string }>(
        `SELECT COUNT(*)::text AS v FROM incidents WHERE status IN ('reported','under_review','verified','active')`
      ),
      queryOne<{ v: string }>(
        `SELECT COUNT(*)::text AS v FROM roads WHERE traffic_level IN ('high','severe')`
      ),
      queryOne<{ v: string }>(
        `SELECT COUNT(*)::text AS v FROM emergency_events WHERE status IN ('detected','verifying','verified','priority','crossing')`
      ),
      queryOne<{ v: string }>(`SELECT COUNT(*)::text AS v FROM traffic_signals`),
      queryOne<{ v: string }>(
        `SELECT COALESCE(ROUND(AVG(average_speed)), 0)::text AS v FROM traffic_records
         WHERE recorded_at >= NOW() - INTERVAL '24 hours'`
      ),
    ]);

  ok(res, {
    kpis: {
      totalVehicles: Number(vehiclesToday?.v ?? 0),
      activeIncidents: Number(activeIncidents?.v ?? 0),
      congestedRoads: Number(congested?.v ?? 0),
      emergencyVehicles: Number(emergencyActive?.v ?? 0),
      signalsMonitored: Number(signalsOnline?.v ?? 0),
      averageSpeed: Number(avgSpeed?.v ?? 0),
    },
    dataSource: 'simulated',
    note: 'All figures are simulated sample data for the SmartFlow AI demo, not real-world measurements.',
  });
}

/** GET /api/traffic/roads : per-road density feed. */
export async function trafficRoads(_req: AuthRequest, res: Response): Promise<void> {
  const roads = await query(
    `SELECT r.id, r.name, r.area, r.city, r.latitude, r.longitude, r.traffic_level,
            r.road_status, r.speed_limit AS "speedLimit",
            COALESCE(t.vehicle_count, 0) AS "vehicleCount",
            COALESCE(t.average_speed, 0) AS "averageSpeed",
            COALESCE(t.density, 0) AS density,
            (SELECT COUNT(*)::int FROM incidents i
              WHERE i.latitude BETWEEN r.latitude - 0.02 AND r.latitude + 0.02
                AND i.longitude BETWEEN r.longitude - 0.02 AND r.longitude + 0.02
                AND i.status NOT IN ('resolved')) AS "incidentCount"
     FROM roads r
     LEFT JOIN LATERAL (
       SELECT vehicle_count, average_speed, density FROM traffic_records
       WHERE road_id = r.id ORDER BY recorded_at DESC LIMIT 1
     ) t ON TRUE
     ORDER BY r.name ASC`
  );
  ok(res, {
    roads: roads.map((r) => ({
      ...r,
      vehicleCount: Number(r.vehicleCount),
      averageSpeed: Number(r.averageSpeed),
      density: Number(r.density),
      incidentCount: Number(r.incidentCount),
    })),
    dataSource: 'simulated',
  });
}

/** GET /api/traffic/intersections : grouped signal state per intersection. */
export async function trafficIntersections(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await query(
    `SELECT id, intersection_name AS "intersection", direction, state,
            remaining_seconds AS "remainingSeconds", mode, updated_at AS "updatedAt"
     FROM traffic_signals ORDER BY intersection_name, direction`
  );
  const intersections = new Map<string, unknown[]>();
  for (const row of rows) {
    const key = String(row.intersection);
    if (!intersections.has(key)) intersections.set(key, []);
    intersections.get(key)!.push({
      id: row.id,
      direction: row.direction,
      state: row.state,
      remainingSeconds: row.remainingSeconds,
      mode: row.mode,
      updatedAt: row.updatedAt,
    });
  }
  ok(res, {
    intersections: Array.from(intersections.entries()).map(([name, signals]) => ({
      name,
      signals,
    })),
  });
}

/** GET /api/traffic/density : per-approach density for the four-way demo intersection. */
export async function trafficDensity(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await query(
    `SELECT r.name, r.traffic_level AS "trafficLevel", r.road_status AS "roadStatus",
            COALESCE(t.vehicle_count, 0) AS "vehicleCount",
            COALESCE(t.average_speed, 0) AS "averageSpeed",
            COALESCE(t.density, 0) AS density
     FROM roads r
     LEFT JOIN LATERAL (
       SELECT vehicle_count, average_speed, density FROM traffic_records
       WHERE road_id = r.id ORDER BY recorded_at DESC LIMIT 1
     ) t ON TRUE
     WHERE r.traffic_level IN ('high','severe') OR r.id <= 4
     ORDER BY density DESC LIMIT 8`
  );
  ok(res, {
    density: rows.map((r) => ({
      ...r,
      vehicleCount: Number(r.vehicleCount),
      averageSpeed: Number(r.averageSpeed),
      density: Number(r.density),
    })),
    dataSource: 'simulated',
  });
}
