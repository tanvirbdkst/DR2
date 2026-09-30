import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pool from './db.js';
import { RowDataPacket } from 'mysql2/promise';

const JWT_SECRET = process.env.JWT_SECRET || 'daktar-serial-secure-jwt-secret-key-2026';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'compounder';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: string;
  doctorId?: number;
  compounderId?: number;
  patientId?: number;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      doctorId: user.doctorId,
      compounderId: user.compounderId,
      patientId: user.patientId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Check if user still exists and active in DB
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, phone, name, role, status, doctor_id FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = userRows[0] as any;
    if (user) {
      decoded.phone = user.phone || decoded.phone;
      decoded.name = user.name || decoded.name;
      decoded.email = user.email || decoded.email;

      // If doctor, retrieve doctor id
      if (user.role === 'doctor') {
        const [docRows] = await pool.query<RowDataPacket[]>(
          'SELECT id, approval_status FROM doctors WHERE user_id = ?',
          [user.id]
        );
        const doc = docRows[0] as any;
        decoded.doctorId = doc?.id;
        decoded.status = doc?.approval_status || user.status;
      } else if (user.role === 'compounder') {
        // The assigned doctor is read fresh from the DB on every request.
        // This is authoritative and cannot be altered by the client (JWT/POST/URL tampering).
        const [cmRows] = await pool.query<RowDataPacket[]>(
          'SELECT id, doctor_id FROM compounders WHERE user_id = ?',
          [user.id]
        );
        const compounder = cmRows[0] as any;
        decoded.compounderId = compounder?.id;
        decoded.doctorId = compounder?.doctor_id ?? user.doctor_id ?? undefined;
      } else if (user.role === 'patient') {
        const [patRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM patients WHERE user_id = ?',
          [user.id]
        );
        const pat = patRows[0] as any;
        decoded.patientId = pat?.id || user.id;
      }
      (req as any).user = decoded;
    }
  } catch (err) {
    // Invalid or expired token, proceed as unauthenticated
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Access denied. Requires ${allowedRoles.join(' or ')} role.` });
    }
    next();
  };
}

/**
 * CompounderMiddleware
 * Server-side guard for the restricted Compounder / Chamber Staff role.
 *
 * A compounder is only ever allowed to touch the single doctor they are bound to.
 * The authorized doctor id is read from the database (never from the request body,
 * query string, or any other client-controlled source), then requests are rejected
 * whenever the client tries to reference a different doctor.
 */
export function compounderMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  if (user.role !== 'compounder') {
    return res.status(403).json({ error: 'Access denied. Compounder role required.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Your account is not active. Please contact the administrator.' });
  }

  if (!user.doctorId) {
    return res.status(403).json({ error: 'No doctor is assigned to this account. Please contact the administrator.' });
  }

  // Reject any request that attempts to reference another doctor via body/query/params.
  const declaredDoctorId = req.body?.doctorId ?? req.query?.doctorId ?? (req.params as any)?.doctorId;
  if (declaredDoctorId !== undefined && declaredDoctorId !== null && declaredDoctorId !== '') {
    if (Number(declaredDoctorId) !== Number(user.doctorId)) {
      return res.status(403).json({ error: 'Access denied. You can only manage the doctor assigned to you.' });
    }
  }

  // Freeze the authorized doctor id so route handlers can never be tricked into
  // using a client-supplied value.
  (req as any).authorizedDoctorId = user.doctorId;

  next();
}
