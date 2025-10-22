// backend/src/middleware/auth.ts

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { authConfig } from '../config/auth';
import { internalAuthService } from '../services/internal-auth.service';
import { 
  JWTPayload, 
  AuthenticatedUser, 
  UserRole
} from '../types/auth';

// [advice from AI] JWT 토큰 검증 미들웨어
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, authConfig.jwt.secret) as JWTPayload;
    
    // 사용자 정보 조회
    const user = await internalAuthService.getUserById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Request 객체에 사용자 정보 추가
    req.user = user;
    next();

  } catch (error) {
    logger.error('Token authentication failed:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// [advice from AI] 권한 확인 미들웨어
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(`Access denied for user ${user.username} with role ${user.role}. Required roles: ${allowedRoles.join(', ')}`);
      
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: user.role
      });
      return;
    }

    next();
  };
};

// [advice from AI] JWT 토큰 생성
export const generateToken = (user: AuthenticatedUser): { token: string; expiresIn: number } => {
  const jwtSecret = authConfig.jwt.secret;
  const expiresIn = authConfig.jwt.expiresIn;

  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    username: user.username,
    email: user.email,
    role: user.role,
    ecpUserId: user.ecpUserId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
  };

  const token = jwt.sign(payload, jwtSecret);

  return {
    token,
    expiresIn: 24 * 60 * 60 // 24시간 (초 단위)
  };
};

// [advice from AI] 관리자 권한 확인 미들웨어
export const requireAdmin = authorize([UserRole.ADMIN]);

// [advice from AI] 관리자 또는 매니저 권한 확인 미들웨어
export const requireManagerOrAdmin = authorize([UserRole.ADMIN, UserRole.MANAGER]);

// [advice from AI] 모든 권한 허용 (인증된 사용자)
export const requireAuthenticated = authenticate;

export default {
  authenticate,
  authorize,
  generateToken,
  requireAdmin,
  requireManagerOrAdmin,
  requireAuthenticated
};