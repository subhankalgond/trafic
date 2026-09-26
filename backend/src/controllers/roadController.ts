import { Response } from 'express';
import { query, queryOne } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { roadSchema, zodFieldErrors, z } from '../utils/validation';
import { logEvent } from '../utils/logger';

/** GET /api/roads */
export async function listRoads(req: AuthRequest, res: Response): Promise<void> {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR area ILIKE $${params.length} OR city ILIKE $${params.length})`);
  }
  if (status && ['open', 'busy', 'congested', 'blocked', 'construction'].includes(status)) {
    params.push(status);
    where.push(`road_status = $${params.length}`);
  }

  const roads = await query(
    `SELECT id, name, area, city, latitude, longitude, lanes,
            speed_limit AS "speedLimit", traffic_level AS "trafficLevel",
            road_status AS "roadStatus", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM roads
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY name ASC`,
    params
  );
  ok(res, { roads });
}

/** GET /api/roads/:id */
export async function getRoad(req: AuthRequest, res: Response): Promise<void> {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const road = await queryOne(
    `SELECT id, name, area, city, latitude, longitude, lanes,
            speed_limit AS "speedLimit", traffic_level AS "trafficLevel",
            road_status AS "roadStatus", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM roads WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!road) throw ApiError.notFound('Road not found');
  ok(res, { road });
}

/** POST /api/roads (admin) */
export async function createRoad(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = roadSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const r = parsed.data;
  const road = await queryOne(
    `INSERT INTO roads (name, area, city, latitude, longitude, lanes, speed_limit, traffic_level, road_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, area, city, latitude, longitude, lanes,
       speed_limit AS "speedLimit", traffic_level AS "trafficLevel",
       road_status AS "roadStatus", created_at AS "createdAt"`,
    [r.name, r.area, r.city, r.latitude, r.longitude, r.lanes, r.speedLimit, r.trafficLevel, r.roadStatus]
  );
  await logEvent('road_added', `Road added: ${r.name}`, 'info');
  ok(res, { road }, 'Road added successfully', 201);
}

/** PUT /api/roads/:id (admin) */
export async function updateRoad(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const parsed = roadSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const r = parsed.data;
  const existing = await queryOne('SELECT id FROM roads WHERE id = $1 LIMIT 1', [id]);
  if (!existing) throw ApiError.notFound('Road not found');

  const road = await queryOne(
    `UPDATE roads SET name = $1, area = $2, city = $3, latitude = $4, longitude = $5,
       lanes = $6, speed_limit = $7, traffic_level = $8, road_status = $9, updated_at = NOW()
     WHERE id = $10
     RETURNING id, name, area, city, latitude, longitude, lanes,
       speed_limit AS "speedLimit", traffic_level AS "trafficLevel",
       road_status AS "roadStatus", updated_at AS "updatedAt"`,
    [r.name, r.area, r.city, r.latitude, r.longitude, r.lanes, r.speedLimit, r.trafficLevel, r.roadStatus, id]
  );
  await logEvent('road_updated', `Road updated: ${r.name}`, 'info');
  ok(res, { road }, 'Road updated successfully');
}

/** DELETE /api/roads/:id (admin) */
export async function deleteRoad(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const deleted = await queryOne<{ name: string }>(
    'DELETE FROM roads WHERE id = $1 RETURNING name',
    [id]
  );
  if (!deleted) throw ApiError.notFound('Road not found');
  await logEvent('road_deleted', `Road deleted: ${deleted.name}`, 'warning');
  ok(res, null, 'Road deleted successfully');
}
