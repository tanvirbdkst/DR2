import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pool from './db.js';
import { RowDataPacket } from 'mysql2/promise';

const JWT_SECRET = process.env.JWT_SECRET || 'daktar-serial-secure-jwt-secret-key-2026';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  status: string;
  doctorId?: number;
  patientId?: number;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      doctorId: user.doctorId,
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
      'SELECT id, email, name, role, status FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = userRows[0] as any;
    if (user) {
      // If doctor, retrieve doctor id
      if (user.role === 'doctor') {
        const [docRows] = await pool.query<RowDataPacket[]>(
          'SELECT id, approval_status FROM doctors WHERE user_id = ?',
          [user.id]
        );
        const doc = docRows[0] as any;
        decoded.doctorId = doc?.id;
        decoded.status = doc?.approval_status || user.status;
      } else if (user.role === 'patient') {
        const [patRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM patients WHERE user_id = ?',
          [user.id]
        );
        const pat = patRows[0] as any;
        decoded.patientId = pat?.id;
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

export function requireRole(allowedRoles: ('patient' | 'doctor' | 'admin')[]) {
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
