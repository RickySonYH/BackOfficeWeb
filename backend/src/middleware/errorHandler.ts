// [advice from AI] 전역 에러 핸들링 미들웨어
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // [advice from AI] 에러 로깅
  logger.error(`Error: ${error.message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // [advice from AI] PostgreSQL 에러 처리
  if (err.code === '23505') {
    const message = 'Duplicate field value entered';
    error = { statusCode: 400, message } as CustomError;
  }

  // [advice from AI] PostgreSQL 연결 에러
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection failed';
    error = { statusCode: 500, message } as CustomError;
  }

  // [advice from AI] Validation 에러
  if (err.name === 'ValidationError') {
    const message = 'Invalid input data';
    error = { statusCode: 400, message } as CustomError;
  }

  // [advice from AI] JWT 에러
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { statusCode: 401, message } as CustomError;
  }

  // [advice from AI] JWT 만료 에러
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { statusCode: 401, message } as CustomError;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
