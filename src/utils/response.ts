import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../../shared/types';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const responseBody: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(responseBody);
}

export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): Response {
  const paginatedData: PaginatedResult<T> = {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };

  const responseBody: ApiResponse<PaginatedResult<T>> = {
    success: true,
    message,
    data: paginatedData,
  };

  return res.status(200).json(responseBody);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: any
): Response {
  const responseBody: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(responseBody);
}
