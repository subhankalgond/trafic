import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, queryOne } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import {
  createIncidentSchema,
  updateIncidentStatusSchema,
  zodFieldErrors,
  z,
} from '../utils/validation';
import { UPLOAD_ROOT } from '../middleware/upload';
import { logEvent, notifyUser } from '../utils/logger';

const INCIDENT_COLS = `i.id, i.incident_id AS "incidentId", i.user_id AS "userId",
  i.type, i.severity, i.description, i.latitude, i.longitude,
  i.location_name AS "locationName", i.image_url AS "imageUrl", i.status,
  i.admin_note AS "adminNote", i.created_at AS "createdAt", i.resolved_at AS "resolvedAt"`;

function withImageUrl(row: Record<string, unknown>) {
  return {
    ...row,
    imageUrl: row.imageUrl ? `${env.apiUrlBase}/uploads/${path.basename(String(row.imageUrl))}` : null,
  };
}

/** GET /api/incidents : public list with filters. */
export async function listIncidents(req: AuthRequest, res: Response): Promise<void> {
  const q = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const params: unknown[] = [];

  if (q.type && q.type !== 'all') {
    params.push(q.type);
    where.push(`i.type = $${params.length}`);
  }
  if (q.status && q.status !== 'all') {
    params.push(q.status);
    where.push(`i.status = $${params.length}`);
  }
  if (q.severity && q.severity !== 'all') {
    params.push(q.severity);
    where.push(`i.severity = $${params.length}`);
  }

  const rows = await query(
    `SELECT ${INCIDENT_COLS}, u.name AS "reporterName"
     FROM incidents i
     LEFT JOIN users u ON u.id = i.user_id
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY i.created_at DESC LIMIT 100`,
    params
  );
  ok(res, { incidents: rows.map(withImageUrl) });
}

/** GET /api/incidents/:id : accepts numeric id or incident code. */
export async function getIncident(req: AuthRequest, res: Response): Promise<void> {
  const key = req.params.id;
  const isNumeric = /^\d+$/.test(key);
  const row = await queryOne(
    `SELECT ${INCIDENT_COLS}, u.name AS "reporterName"
     FROM incidents i
     LEFT JOIN users u ON u.id = i.user_id
     WHERE ${isNumeric ? 'i.id = $1' : 'i.incident_id = $1'} LIMIT 1`,
    [isNumeric ? Number(key) : key]
  );
  if (!row) throw ApiError.notFound('Incident not found');
  ok(res, { incident: withImageUrl(row) });
}

/** POST /api/incidents (auth) : user incident report with optional photo. */
export async function createIncident(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const parsed = createIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const d = parsed.data;

  let imageUrl: string | null = null;
  if (req.file) imageUrl = path.basename(req.file.path);

  const year = new Date().getFullYear();
  const seqRow = await queryOne<{ next: string }>(
    `SELECT COALESCE(MAX(CAST(RIGHT(incident_id, 6) AS INTEGER)), 0) + 1 AS next
     FROM incidents WHERE incident_id LIKE $1`,
    [`INC-${year}-%`]
  );
  let incidentId = `INC-${year}-${String(Number(seqRow?.next ?? 1)).padStart(6, '0')}`;
  const dup = await queryOne('SELECT id FROM incidents WHERE incident_id = $1 LIMIT 1', [incidentId]);
  if (dup) incidentId = `INC-${year}-${String(Date.now()).slice(-6)}`;

  const incident = await queryOne(
    `INSERT INTO incidents
       (incident_id, user_id, type, severity, description, latitude, longitude, location_name, image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reported')
     RETURNING ${INCIDENT_COLS}`,
    [incidentId, auth.id, d.type, d.severity, d.description, d.latitude, d.longitude, d.locationName, imageUrl]
  );

  await logEvent('incident_report', `New incident reported: ${incidentId} at ${d.locationName}`, 'warning');
  ok(
    res,
    { incident: incident ? withImageUrl(incident) : null },
    'Thank you. Your report has been submitted successfully.',
    201
  );
}

/** PUT /api/incidents/:id (operator+) : status workflow with optional note. */
export async function updateIncidentStatus(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const parsed = updateIncidentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please choose a valid status', zodFieldErrors(parsed.error));
  }
  const { status, note } = parsed.data;

  const existing = await queryOne(
    'SELECT id, incident_id AS "incidentId", user_id AS "userId" FROM incidents WHERE id = $1 LIMIT 1',
    [id]
  );
  if (!existing) throw ApiError.notFound('Incident not found');

  const incident = await queryOne(
    `UPDATE incidents SET status = $1,
       admin_note = COALESCE($2, admin_note),
       resolved_at = ${status === 'resolved' ? 'NOW()' : 'NULL'},
       updated_at = NOW()
     WHERE id = $3
     RETURNING ${INCIDENT_COLS}`,
    [status, note ?? null, id]
  );
  if (!incident) throw ApiError.notFound('Incident not found');

  if (existing.userId) {
    await notifyUser(
      Number(existing.userId),
      'Incident update',
      `Your report ${existing.incidentId} is now marked ${status.replace('_', ' ')}.`,
      'incident'
    );
  }
  await logEvent('incident_status', `Incident ${existing.incidentId} marked ${status}`, 'info');
  ok(res, { incident: withImageUrl(incident) }, 'Incident updated successfully');
}

/** DELETE /api/incidents/:id (admin) */
export async function deleteIncident(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const existing = await queryOne(
    'SELECT incident_id AS "incidentId", image_url AS "imageUrl" FROM incidents WHERE id = $1 LIMIT 1',
    [id]
  );
  if (!existing) throw ApiError.notFound('Incident not found');

  if (existing.imageUrl) {
    const filePath = path.join(UPLOAD_ROOT, path.basename(String(existing.imageUrl)));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await query('DELETE FROM incidents WHERE id = $1', [id]);
  await logEvent('incident_deleted', `Incident deleted: ${existing.incidentId}`, 'warning');
  ok(res, null, 'Incident deleted successfully');
}

/** GET /api/my-reports (auth) : the logged-in user's incident reports. */
export async function myReports(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const rows = await query(
    `SELECT ${INCIDENT_COLS} FROM incidents i WHERE i.user_id = $1 ORDER BY i.created_at DESC`,
    [auth.id]
  );
  ok(res, { reports: rows.map(withImageUrl) });
}
