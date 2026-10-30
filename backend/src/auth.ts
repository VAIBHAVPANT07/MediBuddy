import { createHmac, createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import argon2 from 'argon2';
import { z } from 'zod';
import { pool, audit } from './db.js';

export const roleSchema = z.enum(['patient', 'doctor', 'admin', 'seller']);
export const registerSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
  email: z.string().email().max(254).optional(),
  password: z.string().min(12).max(128),
  role: z.literal('patient').default('patient'),
}).refine((value) => value.phone || value.email, { message: 'Provide a phone number or email.' });
const loginSchema = z.object({ identifier: z.string().min(3).max(254), password: z.string().min(1).max(128) });
export const emailOtpRequestSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  email: z.string().email().max(254),
  role: roleSchema,
});
const emailOtpVerifySchema = emailOtpRequestSchema.extend({ challengeId: z.string().uuid(), otp: z.string().regex(/^\d{6}$/) });
export function canSelfAssignRole(environment: string | undefined, assignedRoles: string[], requestedRole: string) {
  if (environment !== 'production') return true;
  if (assignedRoles.length > 0) return assignedRoles.includes(requestedRole);
  return requestedRole === 'patient';
}

const accessCookie = 'mb_access';
const refreshCookie = 'mb_refresh';
const secret = process.env.JWT_SECRET ?? '';
if (process.env.NODE_ENV === 'production' && secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
const jwtSecret = secret || 'local-development-only-change-before-deployment-9f2f71b2';
const isSecure = process.env.NODE_ENV === 'production';
const sameSite = process.env.NODE_ENV === 'production' && process.env.WEB_ORIGIN ? 'None' : 'Lax';

interface SessionUser { id: string; role: string; phone: string | null; email: string | null }
export interface AuthenticatedRequest extends Request { user?: SessionUser }

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const otpDigest = (challengeId: string, otp: string) => createHmac('sha256', jwtSecret).update(`${challengeId}:${otp}`).digest('hex');
function cookies(request: Request) {
  const raw = request.headers.cookie ?? '';
  return Object.fromEntries(raw.split(';').map((item) => item.trim().split(/=(.*)/s, 2)).filter(([key, value]) => key && value));
}
function setAuthCookies(response: Response, access: string, refresh: string) {
  const secure = isSecure ? '; Secure' : '';
  response.setHeader('Set-Cookie', [
    `${accessCookie}=${access}; HttpOnly; SameSite=${sameSite}; Path=/api${secure}; Max-Age=900`,
    `${refreshCookie}=${refresh}; HttpOnly; SameSite=${sameSite}; Path=/api/auth${secure}; Max-Age=2592000`,
  ]);
}
function clearAuthCookies(response: Response) {
  const secure = isSecure ? '; Secure' : '';
  response.setHeader('Set-Cookie', [
    `${accessCookie}=; HttpOnly; SameSite=${sameSite}; Path=/api${secure}; Max-Age=0`,
    `${refreshCookie}=; HttpOnly; SameSite=${sameSite}; Path=/api/auth${secure}; Max-Age=0`,
  ]);
}
async function issueSession(user: SessionUser, response: Response) {
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '15m', issuer: 'medibuddy-api', audience: 'medibuddy-web' });
  const refreshToken = randomBytes(48).toString('base64url');
  await pool.query(`INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '30 days')`, [user.id, hash(refreshToken)]);
  setAuthCookies(response, accessToken, refreshToken);
}
async function userRoles(userId: string) {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1 ORDER BY r.name`, [userId]);
  return rows.map((row) => row.name);
}
async function attachRole(client: import('pg').PoolClient, userId: string, role: string) {
  await client.query(`INSERT INTO user_roles(user_id, role_id) SELECT $1,id FROM roles WHERE name=$2 ON CONFLICT DO NOTHING`, [userId, role]);
}
async function createProfile(client: import('pg').PoolClient, userId: string, role: string, auditPurpose = 'account_registration') {
  if (role === 'patient') {
    const { rows } = await client.query<{ id: string }>(`INSERT INTO patients(user_id) VALUES($1)
      ON CONFLICT(user_id) DO NOTHING RETURNING id`, [userId]);
    if (rows[0]) await client.query(`INSERT INTO audit_logs(actor_user_id,patient_id,action,resource_type,resource_id,purpose)
      VALUES($1,$2,'create','patient_profile',$3,$4)`, [userId, rows[0].id, rows[0].id, auditPurpose]);
  }
  if (role === 'doctor') await client.query('INSERT INTO doctors(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
  if (role === 'seller') await client.query('INSERT INTO medicine_sellers(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
}

export async function register(request: Request, response: Response) {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  const { phone, email, password, role } = parsed.data;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<SessionUser>(
      `INSERT INTO users(phone,email,password_hash) VALUES($1,$2,$3) RETURNING id,phone,email`, [phone ?? null, email?.toLowerCase() ?? null, passwordHash]);
    await attachRole(client, rows[0].id, role);
    await createProfile(client, rows[0].id, role);
    await client.query('COMMIT');
    await audit({ actorUserId: rows[0].id, action: 'register', resourceType: 'user' });
    await issueSession({ ...rows[0], role }, response);
    return response.status(201).json({ user: { ...rows[0], role }, message: 'Account created.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') return response.status(409).json({ error: 'account_exists' });
    throw error;
  } finally { client.release(); }
}

export async function login(request: Request, response: Response) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  const identifier = parsed.data.identifier.trim();
  const { rows } = await pool.query<SessionUser & { password_hash: string | null }>(
    `SELECT u.id,u.phone,u.email,u.password_hash,r.name AS role
     FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
     WHERE (lower(u.email)=lower($1) OR u.phone=$1) AND u.is_active=true ORDER BY r.name LIMIT 1`, [identifier]);
  if (!rows[0]?.password_hash || !(await argon2.verify(rows[0].password_hash, parsed.data.password))) {
    await audit({ action: 'login', resourceType: 'user', outcome: 'denied', metadata: { identifier: identifier.slice(0, 3) } });
    return response.status(401).json({ error: 'invalid_credentials' });
  }
  const { password_hash: _passwordHash, ...user } = rows[0];
  await audit({ actorUserId: user.id, action: 'login', resourceType: 'user' });
  await issueSession(user, response);
  return response.json({ user });
}

export async function requestEmailOtp(request: Request, response: Response) {
  const parsed = emailOtpRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  if (process.env.NODE_ENV === 'production') {
    return response.status(503).json({ error: 'email_delivery_unavailable' });
  }
  const phone = parsed.data.phone.startsWith('+') ? parsed.data.phone : `+${parsed.data.phone}`;
  const email = parsed.data.email.toLowerCase();
  const recent = await pool.query<{ minute_count: string; hour_count: string }>(`SELECT
    count(*) FILTER (WHERE created_at > now() - interval '1 minute') AS minute_count,
    count(*) FILTER (WHERE created_at > now() - interval '1 hour') AS hour_count
    FROM auth_challenges WHERE phone=$1 OR email=$2`, [phone, email]);
  if (Number(recent.rows[0].minute_count) >= 1 || Number(recent.rows[0].hour_count) >= 5) {
    return response.status(429).json({ error: 'otp_rate_limited' });
  }
  await pool.query(`DELETE FROM auth_challenges WHERE expires_at < now() - interval '1 day'`);
  const challengeId = randomUUID();
  const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
  await pool.query(`INSERT INTO auth_challenges(id,phone,email,code_hash,role,expires_at)
    VALUES($1,$2,$3,$4,$5,now() + interval '10 minutes')`, [challengeId, phone, email, otpDigest(challengeId, otp), parsed.data.role]);
  return response.status(202).json({ challengeId, expiresInSeconds: 600, destination: email, developmentOtp: otp, delivery: 'local_fallback' });
}

export async function verifyEmailOtp(request: Request, response: Response) {
  const parsed = emailOtpVerifySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  const phone = parsed.data.phone.startsWith('+') ? parsed.data.phone : `+${parsed.data.phone}`;
  const email = parsed.data.email.toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const challenges = await client.query<{ code_hash: string; attempts: number }>(`SELECT code_hash,attempts FROM auth_challenges
      WHERE id=$1 AND phone=$2 AND email=$3 AND role=$4 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,
    [parsed.data.challengeId, phone, email, parsed.data.role]);
    if (!challenges.rows[0] || challenges.rows[0].attempts >= 5) {
      await client.query('ROLLBACK');
      return response.status(400).json({ error: 'otp_expired_or_invalid' });
    }
    const expected = Buffer.from(challenges.rows[0].code_hash, 'hex');
    const received = Buffer.from(otpDigest(parsed.data.challengeId, parsed.data.otp), 'hex');
    if (!timingSafeEqual(expected, received)) {
      await client.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1', [parsed.data.challengeId]);
      await client.query('COMMIT');
      return response.status(401).json({ error: 'invalid_otp' });
    }
    const existingUsers = await client.query<SessionUser>(`SELECT id,phone,email FROM users
      WHERE phone=$1 OR lower(email)=lower($2) FOR UPDATE`, [phone, email]);
    const account = existingUsers.rows[0];
    if (existingUsers.rows.some((user) => user.phone !== phone || user.email?.toLowerCase() !== email)) {
      await client.query('ROLLBACK');
      return response.status(409).json({ error: 'account_contact_mismatch' });
    }
    const { rows } = account
      ? await client.query<SessionUser>(`UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()), is_active=true WHERE id=$1 RETURNING id,phone,email`, [account.id])
      : await client.query<SessionUser>(`INSERT INTO users(phone,email,email_verified_at) VALUES($1,$2,now()) RETURNING id,phone,email`, [phone, email]);
    const user = rows[0];
    let assignedRoles = await client.query<{ name: string }>(`SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1`, [user.id]);
    if (process.env.NODE_ENV !== 'production' && assignedRoles.rows.length === 0 && parsed.data.role !== 'patient') {
      await attachRole(client,user.id,parsed.data.role);
      assignedRoles = await client.query<{ name: string }>(`SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1`, [user.id]);
    }
    if (!canSelfAssignRole(process.env.NODE_ENV, assignedRoles.rows.map((role) => role.name), parsed.data.role)) {
      await client.query('ROLLBACK');
      return response.status(403).json({ error: 'role_not_assigned' });
    }
    await attachRole(client, user.id, parsed.data.role);
    await createProfile(client, user.id, parsed.data.role, 'email_otp_verification');
    await client.query('UPDATE auth_challenges SET consumed_at=now() WHERE id=$1', [parsed.data.challengeId]);
    await client.query('COMMIT');
    await audit({ actorUserId: user.id, action: 'email_otp_login', resourceType: 'user', metadata: { role: parsed.data.role } });
    await issueSession({ ...user, role: parsed.data.role }, response);
    return response.json({ user: { ...user, role: parsed.data.role } });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function refresh(request: Request, response: Response) {
  const token = cookies(request)[refreshCookie];
  if (!token) return response.status(401).json({ error: 'refresh_required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string; user_id: string }>(
      `SELECT id,user_id FROM refresh_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`, [hash(token)]);
    if (!rows[0]) { await client.query('ROLLBACK'); clearAuthCookies(response); return response.status(401).json({ error: 'refresh_invalid' }); }
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1', [rows[0].id]);
    const userResult = await client.query<SessionUser>(`SELECT id,phone,email FROM users WHERE id=$1 AND is_active=true`, [rows[0].user_id]);
    if (!userResult.rows[0]) { await client.query('ROLLBACK'); clearAuthCookies(response); return response.status(401).json({ error: 'account_inactive' }); }
    const roles = await userRoles(rows[0].user_id);
    await client.query('COMMIT');
    const user = { ...userResult.rows[0], role: roles[0] ?? 'patient' };
    await issueSession(user, response);
    await audit({ actorUserId: user.id, action: 'refresh', resourceType: 'session' });
    return response.json({ user, roles });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function logout(request: AuthenticatedRequest, response: Response) {
  const token = cookies(request)[refreshCookie];
  if (token) await pool.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL', [hash(token)]);
  if (request.user?.id) await audit({ actorUserId: request.user.id, action: 'logout', resourceType: 'session' });
  clearAuthCookies(response);
  return response.status(204).end();
}

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const bearer = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
  const token = bearer ?? cookies(request)[accessCookie];
  if (!token) return response.status(401).json({ error: 'authentication_required' });
  try {
    const payload = jwt.verify(token, jwtSecret, { issuer: 'medibuddy-api', audience: 'medibuddy-web' }) as JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') throw new Error('Invalid subject');
    request.user = { id: payload.sub, role: payload.role, phone: null, email: null };
    return next();
  } catch { return response.status(401).json({ error: 'invalid_or_expired_token' }); }
}

export function requireRole(...roles: string[]) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) return response.status(401).json({ error: 'authentication_required' });
    try {
      const actualRoles = await userRoles(request.user.id);
      if (!roles.some((role) => actualRoles.includes(role))) {
        await audit({ actorUserId: request.user.id, action: 'authorize', resourceType: 'route', outcome: 'denied', metadata: { requiredRoles: roles } });
        return response.status(403).json({ error: 'forbidden' });
      }
      return next();
    } catch (error) { return next(error); }
  };
}
