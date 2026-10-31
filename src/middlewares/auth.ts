import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { getDb } from '../database/db';
import { User, UserRole } from '../../shared/types';
import { HttpError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication token missing or invalid', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      email: string;
      role: UserRole;
    };

    const db = getDb();
    const userRow = db.prepare('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?').get(decoded.userId) as any;

    if (!userRow || !userRow.is_active) {
      return next(new HttpError(401, 'User account not found or deactivated', 'ACCOUNT_INACTIVE'));
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role as UserRole,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Authentication token has expired', 'TOKEN_EXPIRED'));
    }
    return next(new HttpError(401, 'Invalid authentication token', 'INVALID_TOKEN'));
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          `Access forbidden: required role ${allowedRoles.join(' or ')} but current user has ${req.user.role}`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
