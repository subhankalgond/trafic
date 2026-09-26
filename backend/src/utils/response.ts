import { Response } from 'express';

/** Send a success response in the standard envelope. */
export function ok(res: Response, data: unknown, message = 'Request successful', status = 200): void {
  res.status(status).json({ success: true, message, data });
}

/** Send a success response with no data payload. */
export function okMessage(res: Response, message: string, status = 200): void {
  res.status(status).json({ success: true, message, data: null });
}
