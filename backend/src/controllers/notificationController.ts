import { Response } from 'express';
import { query, queryOne, execute } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { savedRouteSchema, zodFieldErrors, z } from '../utils/validation';

/** GET /api/notifications */
export async function myNotifications(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const rows = await query(
    `SELECT id, title, message, type, is_read AS "isRead", created_at AS "createdAt"
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [auth.id]
  );
  const unread = rows.filter((r) => !r.isRead).length;
  ok(res, { notifications: rows, unread });
}

/** PUT /api/notifications/:id/read */
export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const row = await queryOne('SELECT user_id AS "userId" FROM notifications WHERE id = $1', [id]);
  if (!row) throw ApiError.notFound('Notification not found');
  if (Number(row.userId) !== auth.id) {
    throw ApiError.forbidden('You do not have permission for this notification');
  }
  await execute('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
  ok(res, null, 'Notification marked as read');
}

/** PUT /api/notifications/read-all */
export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  await execute('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [auth.id]);
  ok(res, null, 'All notifications marked as read');
}

/** DELETE /api/notifications/:id */
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const row = await queryOne('SELECT user_id AS "userId" FROM notifications WHERE id = $1', [id]);
  if (!row) throw ApiError.notFound('Notification not found');
  if (Number(row.userId) !== auth.id) {
    throw ApiError.forbidden('You do not have permission for this notification');
  }
  await execute('DELETE FROM notifications WHERE id = $1', [id]);
  ok(res, null, 'Notification deleted');
}

/** GET /api/saved-routes */
export async function listSavedRoutes(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const rows = await query(
    `SELECT id, name, start_location AS "startLocation", destination, created_at AS "createdAt"
     FROM saved_routes WHERE user_id = $1 ORDER BY created_at DESC`,
    [auth.id]
  );
  ok(res, { routes: rows });
}

/** POST /api/saved-routes */
export async function createSavedRoute(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const parsed = savedRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const route = await queryOne(
    `INSERT INTO saved_routes (user_id, name, start_location, destination)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, start_location AS "startLocation", destination, created_at AS "createdAt"`,
    [auth.id, parsed.data.name, parsed.data.startLocation, parsed.data.destination]
  );
  ok(res, { route }, 'Route saved successfully', 201);
}

/** DELETE /api/saved-routes/:id */
export async function deleteSavedRoute(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const row = await queryOne('SELECT user_id AS "userId" FROM saved_routes WHERE id = $1', [id]);
  if (!row) throw ApiError.notFound('Route not found');
  if (Number(row.userId) !== auth.id) {
    throw ApiError.forbidden('You do not have permission to delete this route');
  }
  await execute('DELETE FROM saved_routes WHERE id = $1', [id]);
  ok(res, null, 'Route removed');
}
