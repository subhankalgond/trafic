import { Response } from 'express';
import { query, queryOne } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { vehicleSchema, zodFieldErrors, z } from '../utils/validation';
import { logEvent } from '../utils/logger';

/** GET /api/vehicles (operator+) : emergency vehicle registry. */
export async function listVehicles(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(vehicle_number ILIKE $${params.length} OR organization ILIKE $${params.length})`);
  }
  if (type && ['ambulance', 'patient_transport', 'emergency_medical'].includes(type)) {
    params.push(type);
    where.push(`vehicle_type = $${params.length}`);
  }

  const vehicles = await query(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
            organization, priority, status, created_at AS "createdAt"
     FROM vehicles
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
       vehicle_number ASC`,
    params
  );
  ok(res, { vehicles });
}

/** GET /api/vehicles/:id (operator+) */
export async function getVehicle(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const vehicle = await queryOne(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
            organization, priority, status, created_at AS "createdAt"
     FROM vehicles WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  ok(res, { vehicle });
}

/** POST /api/vehicles (admin) */
export async function createVehicle(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const v = parsed.data;
  const existing = await queryOne(
    'SELECT id FROM vehicles WHERE vehicle_number = $1 LIMIT 1',
    [v.vehicleNumber]
  );
  if (existing) throw ApiError.conflict('A vehicle with this number is already registered');

  const vehicle = await queryOne(
    `INSERT INTO vehicles (vehicle_number, vehicle_type, organization, priority, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
       organization, priority, status, created_at AS "createdAt"`,
    [v.vehicleNumber, v.vehicleType, v.organization, v.priority, v.status]
  );
  await logEvent('vehicle_registered', `Emergency vehicle registered: ${v.vehicleNumber}`, 'info');
  ok(res, { vehicle }, 'Vehicle registered successfully', 201);
}

/** PUT /api/vehicles/:id (admin) */
export async function updateVehicle(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const v = parsed.data;
  const existing = await queryOne(
    'SELECT id FROM vehicles WHERE vehicle_number = $1 AND id != $2 LIMIT 1',
    [v.vehicleNumber, id]
  );
  if (existing) throw ApiError.conflict('Another vehicle with this number already exists');

  const vehicle = await queryOne(
    `UPDATE vehicles SET vehicle_number = $1, vehicle_type = $2, organization = $3,
       priority = $4, status = $5
     WHERE id = $6
     RETURNING id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
       organization, priority, status, created_at AS "createdAt"`,
    [v.vehicleNumber, v.vehicleType, v.organization, v.priority, v.status, id]
  );
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  await logEvent('vehicle_updated', `Emergency vehicle updated: ${v.vehicleNumber}`, 'info');
  ok(res, { vehicle }, 'Vehicle updated successfully');
}

/** DELETE /api/vehicles/:id (admin) */
export async function deleteVehicle(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const deleted = await queryOne<{ vehicleNumber: string }>(
    'DELETE FROM vehicles WHERE id = $1 RETURNING vehicle_number AS "vehicleNumber"',
    [id]
  );
  if (!deleted) throw ApiError.notFound('Vehicle not found');
  await logEvent('vehicle_deleted', `Emergency vehicle removed: ${deleted.vehicleNumber}`, 'warning');
  ok(res, null, 'Vehicle removed successfully');
}

/** GET /api/detections (public) : recent AI detection feed. */
export async function listDetections(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await query(
    `SELECT d.id, d.camera_id AS "cameraId", d.vehicle_number AS "vehicleNumber",
            d.vehicle_type AS "vehicleType", d.confidence, d.direction, d.distance,
            d.detected_at AS "detectedAt",
            CASE WHEN v.id IS NOT NULL THEN TRUE ELSE FALSE END AS "verified"
     FROM detections d
     LEFT JOIN vehicles v ON v.vehicle_number = d.vehicle_number
     ORDER BY d.detected_at DESC LIMIT 30`
  );
  ok(res, {
    detections: rows.map((r) => ({ ...r, confidence: Number(r.confidence), verified: r.verified })),
    dataSource: 'simulated',
    note: 'Detection feed is generated by the simulation engine, not live CCTV hardware.',
  });
}
