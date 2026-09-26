import { Response } from 'express';
import { query, queryOne } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { adminUserStatusSchema, adminUserRoleSchema, zodFieldErrors, z } from '../utils/validation';
import { logEvent } from '../utils/logger';

/** GET /api/admin/dashboard : KPI snapshot + chart series for the admin overview. */
export async function dashboard(_req: AuthRequest, res: Response): Promise<void> {
  const [users, incidents, vehicles, roads, signals, emergency, congestion] = await Promise.all([
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM users'),
    queryOne<{ v: string }>(
      `SELECT COUNT(*)::text AS v FROM incidents WHERE status != 'resolved'`
    ),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM vehicles WHERE status = $1', ['active']),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM roads'),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM traffic_signals'),
    queryOne<{ v: string }>(
      `SELECT COUNT(*)::text AS v FROM emergency_events WHERE status NOT IN ('cleared')`
    ),
    queryOne<{ v: string }>(`SELECT COUNT(*)::text AS v FROM roads WHERE traffic_level IN ('high','severe')`),
  ]);

  const [volumeTrend, byType, bySeverity, clearance] = await Promise.all([
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(recorded_at), 'YYYY-MM-DD') AS day, SUM(vehicle_count)::text AS v
       FROM traffic_records WHERE recorded_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(recorded_at) ORDER BY DATE(recorded_at)`
    ),
    query<{ type: string; count: string }>(
      `SELECT type, COUNT(*)::text AS count FROM incidents GROUP BY type ORDER BY count DESC`
    ),
    query<{ severity: string; count: string }>(
      `SELECT severity, COUNT(*)::text AS count FROM incidents GROUP BY severity`
    ),
    query<{ day: string; minutes: string }>(
      `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
              ROUND(AVG(EXTRACT(EPOCH FROM (cleared_at - created_at)) / 60))::text AS minutes
       FROM emergency_events WHERE cleared_at IS NOT NULL
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY DATE(created_at)`
    ),
  ]);

  ok(res, {
    kpis: {
      totalUsers: Number(users?.v ?? 0),
      openIncidents: Number(incidents?.v ?? 0),
      activeEmergencyVehicles: Number(vehicles?.v ?? 0),
      monitoredRoads: Number(roads?.v ?? 0),
      signalsOnline: Number(signals?.v ?? 0),
      activeEmergencyEvents: Number(emergency?.v ?? 0),
      congestedRoads: Number(congestion?.v ?? 0),
    },
    volumeTrend: volumeTrend.map((d) => ({ day: d.day, count: Number(d.v) })),
    incidentsByType: byType.map((d) => ({ type: d.type, count: Number(d.count) })),
    incidentsBySeverity: bySeverity.map((d) => ({ severity: d.severity, count: Number(d.count) })),
    clearanceTrend: clearance.map((d) => ({ day: d.day, minutes: Number(d.minutes) })),
    dataSource: 'simulated',
  });
}

/** GET /api/admin/analytics?range=7 : analytics with day filter. */
export async function analytics(req: AuthRequest, res: Response): Promise<void> {
  const rangeRaw = typeof req.query.range === 'string' ? req.query.range : '7';
  const range = ['1', '7', '30', '90'].includes(rangeRaw) ? parseInt(rangeRaw, 10) : 7;

  const [volume, density, speed, incidentsByDay, emergencyByDay, activations] = await Promise.all([
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(recorded_at), 'YYYY-MM-DD') AS day, SUM(vehicle_count)::text AS v
       FROM traffic_records WHERE recorded_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(recorded_at) ORDER BY DATE(recorded_at)`,
      [String(range)]
    ),
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(recorded_at), 'YYYY-MM-DD') AS day, ROUND(AVG(density))::text AS v
       FROM traffic_records WHERE recorded_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(recorded_at) ORDER BY DATE(recorded_at)`,
      [String(range)]
    ),
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(recorded_at), 'YYYY-MM-DD') AS day, ROUND(AVG(average_speed))::text AS v
       FROM traffic_records WHERE recorded_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(recorded_at) ORDER BY DATE(recorded_at)`,
      [String(range)]
    ),
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*)::text AS v
       FROM incidents WHERE created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      [String(range)]
    ),
    query<{ day: string; v: string }>(
      `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*)::text AS v
       FROM emergency_events WHERE created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      [String(range)]
    ),
    query<{ type: string; count: string }>(
      `SELECT v.vehicle_type AS type, COUNT(*)::text AS count
       FROM emergency_events e JOIN vehicles v ON v.id = e.vehicle_id
       WHERE e.created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY v.vehicle_type`,
      [String(range)]
    ),
  ]);

  ok(res, {
    range,
    volume: volume.map((d) => ({ day: d.day, value: Number(d.v) })),
    density: density.map((d) => ({ day: d.day, value: Number(d.v) })),
    speed: speed.map((d) => ({ day: d.day, value: Number(d.v) })),
    incidentsByDay: incidentsByDay.map((d) => ({ day: d.day, value: Number(d.v) })),
    emergencyByDay: emergencyByDay.map((d) => ({ day: d.day, value: Number(d.v) })),
    emergencyByType: activations.map((d) => ({ type: d.type, count: Number(d.count) })),
    dataSource: 'simulated',
  });
}

/** GET /api/admin/users (admin) */
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize ?? 10) || 10));
  const offset = (page - 1) * pageSize;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await queryOne<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM users ${whereSql}`,
    params
  );
  const users = await query(
    `SELECT id, name, email, phone, role, status, created_at AS "createdAt"
     FROM users ${whereSql}
     ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );
  ok(res, { users, pagination: { page, pageSize, total: Number(totalRow?.total ?? 0) } });
}

/** PUT /api/admin/users/:id/status (admin) */
export async function setUserStatus(req: AuthRequest, res: Response): Promise<void> {
  const admin = requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const parsed = adminUserStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please choose a valid status', zodFieldErrors(parsed.error));
  }
  if (id === admin.id) throw ApiError.badRequest('You cannot change your own account status');

  const updated = await queryOne<{ id: number }>(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [parsed.data.status, id]
  );
  if (!updated) throw ApiError.notFound('User not found');
  await logEvent('user_status', `User ${id} set to ${parsed.data.status}`, 'info');
  ok(res, null, `User ${parsed.data.status === 'active' ? 'activated' : 'deactivated'} successfully`);
}

/** PUT /api/admin/users/:id/role (admin) */
export async function setUserRole(req: AuthRequest, res: Response): Promise<void> {
  const admin = requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const parsed = adminUserRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please choose a valid role', zodFieldErrors(parsed.error));
  }
  if (id === admin.id) throw ApiError.badRequest('You cannot change your own role');

  const updated = await queryOne<{ id: number }>(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [parsed.data.role, id]
  );
  if (!updated) throw ApiError.notFound('User found check failed');
  await logEvent('user_role', `User ${id} role set to ${parsed.data.role}`, 'info');
  ok(res, null, 'User role updated successfully');
}

/** GET /api/logs (operator+) : system event log feed. */
export async function listLogs(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const limit = Math.min(200, Math.max(10, Number(req.query.limit ?? 50) || 50));
  const severity = typeof req.query.severity === 'string' ? req.query.severity : '';
  const params: unknown[] = [];
  const where: string[] = [];
  if (severity && ['info', 'warning', 'critical', 'success'].includes(severity)) {
    params.push(severity);
    where.push(`severity = $${params.length}`);
  }
  const rows = await query(
    `SELECT id, event_type AS "eventType", message, severity, created_at AS "createdAt"
     FROM system_logs ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC LIMIT ${limit}`,
    params
  );
  ok(res, { logs: rows });
}

/** GET /api/admin/settings (admin) : non-secret system settings snapshot. */
export async function settings(_req: AuthRequest, res: Response): Promise<void> {
  const counts = await Promise.all([
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM roads'),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM vehicles'),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM traffic_signals'),
    queryOne<{ v: string }>('SELECT COUNT(*)::text AS v FROM users'),
  ]);
  ok(res, {
    settings: {
      database: 'Supabase PostgreSQL',
      dataSource: 'Simulated demo data',
      roads: Number(counts[0]?.v ?? 0),
      registeredVehicles: Number(counts[1]?.v ?? 0),
      signals: Number(counts[2]?.v ?? 0),
      users: Number(counts[3]?.v ?? 0),
    },
  });
}
