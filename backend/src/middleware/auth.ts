import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { AuthRequest, Role } from '../types/express';

interface TokenPayload {
  sub: number;
  role: Role;
  name: string;
  email: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), env.jwt.secret) as unknown as TokenPayload;
    req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized('Your session has expired. Please log in again.'));
  }
}

/** Attaches user when a valid token is present; continues either way. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwt.secret) as unknown as TokenPayload;
      req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
    } catch {
      // invalid token on a public route: treat as anonymous
    }
  }
  next();
}

const ROLE_RANK: Record<Role, number> = { user: 1, operator: 2, admin: 3 };

/** Require at least the given role (admin passes operator and admin checks). */
export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    if (!roles.some((r) => ROLE_RANK[req.user!.role] >= ROLE_RANK[r])) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

export const requireOperator = requireRole('operator');
export const requireAdmin = requireRole('admin');
