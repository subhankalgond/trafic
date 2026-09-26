import { Request } from 'express';

export type Role = 'user' | 'operator' | 'admin';

/** Type helper for routes where auth middleware has run. */
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: Role;
    name: string;
    email: string;
  };
}

export function requireUser(req: AuthRequest): NonNullable<AuthRequest['user']> {
  if (!req.user) {
    throw new Error('requireUser called on unauthenticated request');
  }
  return req.user;
}
