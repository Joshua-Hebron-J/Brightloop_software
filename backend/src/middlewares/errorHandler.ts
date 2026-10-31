import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, message: string, code = 'HTTP_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', formattedIssues);
    return;
  }

  // 2. Custom HttpError
  if (err instanceof HttpError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // 3. SQLite Constraint Errors
  if (err && typeof err.message === 'string' && err.message.includes('UNIQUE constraint failed')) {
    const match = err.message.match(/UNIQUE constraint failed: (.*)/);
    const field = match ? match[1] : 'field';
    sendError(res, `A record with this ${field} already exists.`, 409, 'CONFLICT', { conflict: field });
    return;
  }

  // 4. Default Internal Server Error
  console.error('Unhandled server error:', err);
  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message || 'Unknown error',
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
