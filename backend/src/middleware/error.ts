import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { isDev } from '../config/env';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { error: err.details } : {}),
    });
    return;
  }

  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'Image is too large. Maximum size is 5 MB.' });
      return;
    }
    if (code === '23505') {
      res.status(409).json({ success: false, message: 'A record with these details already exists.' });
      return;
    }
  }

  const loggable = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
  console.error(`[error] ${loggable}`);

  // Always surface a safe, short cause code so production 500s can be
  // diagnosed without full stack traces.
  const cause =
    err instanceof Error && err.message
      ? err.message.slice(0, 160)
      : 'unknown';

  if (isDev && err instanceof Error) {
    res.status(500).json({ success: false, message: err.message, cause });
    return;
  }
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    cause,
  });
}

/** Wrap async route handlers so rejected promises reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
