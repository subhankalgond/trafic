import { Response } from 'express';
import { query, queryOne, execute } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/response';
import { AuthRequest, requireUser } from '../types/express';
import { manualSignalSchema, zodFieldErrors } from '../utils/validation';
import { logEvent } from '../utils/logger';

/** GET /api/signals */
export async function listSignals(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await query(
    `SELECT id, intersection_name AS "intersection", direction, state,
            remaining_seconds AS "remainingSeconds", mode, updated_at AS "updatedAt"
     FROM traffic_signals ORDER BY intersection_name, direction`
  );
  ok(res, { signals: rows });
}

/** PUT /api/signals/:direction (operator+) : manual override for the demo intersection. */
export async function manualControl(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const parsed = manualSignalSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Invalid signal control request', zodFieldErrors(parsed.error));
  }
  const { direction, state, seconds } = parsed.data;
  const intersection = 'NH 66 Central Junction';

  const signal = await queryOne<{ id: number; state: string }>(
    'SELECT id, state FROM traffic_signals WHERE intersection_name = $1 AND direction = $2 LIMIT 1',
    [intersection, direction]
  );
  if (!signal) throw ApiError.notFound(`No signal found for direction ${direction}`);

  const previous = signal.state;
  await execute(
    `UPDATE traffic_signals SET state = $1, remaining_seconds = $2, mode = 'manual', updated_at = NOW()
     WHERE id = $3`,
    [state, seconds ?? 30, signal.id]
  );
  // When one approach turns green, conflicting approaches go red (demo logic).
  if (state === 'green') {
    await execute(
      `UPDATE traffic_signals SET state = 'red', remaining_seconds = $1, mode = 'manual', updated_at = NOW()
       WHERE intersection_name = $2 AND direction != $3`,
      [seconds ?? 30, intersection, direction]
    );
  }

  await execute(
    `INSERT INTO signal_events (signal_id, previous_state, new_state, reason)
     VALUES ($1, $2, $3, $4)`,
    [signal.id, previous, state, 'Manual control override from admin panel']
  );
  await logEvent(
    'signal_change',
    `${direction} signal set to ${state.toUpperCase()} (manual override)`,
    state === 'green' ? 'warning' : 'info'
  );
  ok(res, { direction, state }, `Signal ${direction} set to ${state}`);
}

/** PUT /api/signals/mode (operator+) : set intersection control mode. */
export async function setMode(req: AuthRequest, res: Response): Promise<void> {
  requireUser(req);
  const mode = String((req.body as { mode?: string }).mode ?? '');
  if (!['auto', 'traffic_aware', 'emergency', 'manual'].includes(mode)) {
    throw ApiError.badRequest('Invalid control mode');
  }
  await execute(
    'UPDATE traffic_signals SET mode = $1, updated_at = NOW() WHERE intersection_name = $2',
    [mode, 'NH 66 Central Junction']
  );
  await logEvent('signal_mode', `Intersection control mode changed to ${mode}`, 'info');
  ok(res, { mode }, `Control mode set to ${mode.replace('_', ' ')}`);
}
