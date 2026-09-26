import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, execute } from '../config/db';
import { env, isDev } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ok, okMessage } from '../utils/response';
import { AuthRequest, requireUser, Role } from '../types/express';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  zodFieldErrors,
} from '../utils/validation';

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: string;
  createdAt: string | Date;
}

const USER_COLS = `id, name, email, phone, password_hash AS "passwordHash",
  role, status, created_at AS "createdAt"`;

function signToken(user: UserRow): string {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn } as jwt.SignOptions
  );
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

/** POST /api/auth/register */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Try logging in instead.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await queryOne<UserRow>(
    `INSERT INTO users (name, email, phone, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'user', 'active')
     RETURNING ${USER_COLS}`,
    [name, email, phone, passwordHash]
  );
  if (!user) throw new ApiError(500, 'Account could not be created. Please try again.');

  await execute(
    'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
    [
      user.id,
      'Welcome to SmartFlow AI',
      'Your account is ready. Report traffic issues and monitor live road conditions.',
      'system',
    ]
  );

  ok(res, { token: signToken(user), user: publicUser(user) }, 'Account created successfully', 201);
}

/** POST /api/auth/login */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const { email, password } = parsed.data;

  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLS} FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (!user) throw ApiError.unauthorized('Incorrect email or password');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Incorrect email or password');
  if (user.status !== 'active') {
    throw ApiError.forbidden('Your account has been deactivated. Contact support for help.');
  }

  ok(res, { token: signToken(user), user: publicUser(user) }, 'Logged in successfully');
}

/** POST /api/auth/forgot-password
 *  No email provider is configured. In development the reset token is returned and the
 *  UI surfaces it. In production integrate an email provider and send a link instead.
 */
export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please enter a valid email address', zodFieldErrors(parsed.error));
  }
  const { email } = parsed.data;

  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLS} FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (!user) {
    okMessage(res, 'If an account exists for that email, a reset link has been generated.');
    return;
  }

  const resetToken = jwt.sign(
    { sub: user.id, purpose: 'password_reset' },
    env.jwt.secret,
    { expiresIn: '15m' } as jwt.SignOptions
  );
  ok(
    res,
    isDev ? { resetToken } : null,
    'If an account exists for that email, a reset link has been generated. It expires in 15 minutes.'
  );
}

/** POST /api/auth/reset-password */
export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const { token, password } = parsed.data;

  let payload: { sub: number; purpose?: string };
  try {
    payload = jwt.verify(token, env.jwt.secret) as unknown as { sub: number; purpose?: string };
  } catch {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }
  if (payload.purpose !== 'password_reset') {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await execute(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, payload.sub]
  );
  if (updated === 0) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }
  okMessage(res, 'Password updated successfully. You can now log in with your new password.');
}

/** GET /api/users/me */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [auth.id]
  );
  if (!user) throw ApiError.notFound('Account not found');
  ok(res, { user: publicUser(user) });
}

/** PUT /api/users/me */
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const user = await queryOne<UserRow>(
    `UPDATE users SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3
     RETURNING ${USER_COLS}`,
    [parsed.data.name, parsed.data.phone, auth.id]
  );
  ok(res, { user: user ? publicUser(user) : null }, 'Profile updated successfully');
}

/** PUT /api/users/change-password */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const auth = requireUser(req);
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.validation('Please correct the highlighted fields', zodFieldErrors(parsed.error));
  }
  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [auth.id]
  );
  if (!user) throw ApiError.notFound('Account not found');

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest('Your current password is incorrect');

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await execute('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    auth.id,
  ]);
  okMessage(res, 'Password changed successfully');
}
