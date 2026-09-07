import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dawamy_super_secure_jwt_secret_key_2026';

export interface AuthUserPayload {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'hr' | 'admin';
  department: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function generateAuthToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch {
    return null;
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  // 1. Check HTTP-only cookie first
  let token = req.cookies?.dawamy_token;

  // 2. Or fallback to Authorization header if provided
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in with valid credentials.',
    });
  }
  next();
}

export function requireRole(allowedRoles: Array<'employee' | 'manager' | 'hr' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Your current role (${req.user.role}) does not have permission to perform this action.`,
      });
    }

    next();
  };
}
