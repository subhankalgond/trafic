import { execute } from '../config/db';

type LogSeverity = 'info' | 'warning' | 'critical' | 'success';

/** Write an entry to the system_logs table. Never throws into the request path. */
export async function logEvent(
  eventType: string,
  message: string,
  severity: LogSeverity = 'info'
): Promise<void> {
  try {
    await execute(
      'INSERT INTO system_logs (event_type, message, severity) VALUES ($1, $2, $3)',
      [eventType, message.slice(0, 500), severity]
    );
  } catch (err) {
    console.error('[logEvent] failed:', err instanceof Error ? err.message : err);
  }
}

/** Insert a notification for a user. Never throws into the request path. */
export async function notifyUser(
  userId: number,
  title: string,
  message: string,
  type: 'system' | 'incident' | 'traffic' | 'emergency' = 'system'
): Promise<void> {
  try {
    await execute(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, title.slice(0, 150), message.slice(0, 500), type]
    );
  } catch (err) {
    console.error('[notifyUser] failed:', err instanceof Error ? err.message : err);
  }
}
