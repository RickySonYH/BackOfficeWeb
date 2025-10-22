// backend/src/routes/auth.ts

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, generateToken } from '../middleware/auth';
import { logger } from '../config/logger';
import { authConfig, isInternalAuth, isEcpAuth } from '../config/auth';
import { internalAuthService } from '../services/internal-auth.service';
import Joi from 'joi';
import { ApiError } from '../utils/ApiError';

const router = Router();

// [advice from AI] 로그인 요청 스키마
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required()
});

// [advice from AI] 인증 설정 정보 조회
router.get('/config', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    config: {
      provider: authConfig.provider,
      internalEnabled: authConfig.internal.enabled,
      ecpEnabled: authConfig.ecp.enabled,
      ecpServerUrl: authConfig.ecp.enabled ? authConfig.ecp.serverUrl : null
    },
    timestamp: new Date().toISOString()
  });
});

// [advice from AI] 내부 인증 로그인
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isInternalAuth()) {
      return next(new ApiError(400, 'Internal authentication is not enabled'));
    }

    // 요청 데이터 검증
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0]?.message || 'Validation error'));
    }

    const { username, password } = value;

    // 내부 인증 시도
    const loginResult = await internalAuthService.login({ username, password });
    
    if (!loginResult.success || !loginResult.user) {
      return next(new ApiError(401, loginResult.error || 'Login failed'));
    }

    // JWT 토큰 생성
    const tokenData = generateToken(loginResult.user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: tokenData.token,
      expiresIn: tokenData.expiresIn,
      user: {
        id: loginResult.user.id,
        username: loginResult.user.username,
        email: loginResult.user.email,
        role: loginResult.user.role,
        tenantId: loginResult.user.tenantId,
        tenantKey: loginResult.user.tenantKey || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Login error:', error);
    next(new ApiError(500, 'Login failed due to server error'));
  }
});

// [advice from AI] ECP 로그인 (향후 구현)
router.post('/ecp/login', (req: Request, res: Response, next: NextFunction) => {
  if (!isEcpAuth()) {
    return next(new ApiError(400, 'ECP authentication is not enabled'));
  }

  // TODO: ECP OAuth2 플로우 구현
  res.status(501).json({
    success: false,
    message: 'ECP authentication not implemented yet',
    redirectUrl: `${authConfig.ecp.serverUrl}/authorize?client_id=${authConfig.ecp.clientId}&redirect_uri=${authConfig.ecp.redirectUri}&response_type=code`
  });
});

// [advice from AI] ECP 콜백 (향후 구현)
router.get('/ecp/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!isEcpAuth()) {
    return next(new ApiError(400, 'ECP authentication is not enabled'));
  }

  // TODO: ECP OAuth2 콜백 처리
  res.status(501).json({
    success: false,
    message: 'ECP callback not implemented yet'
  });
});

// [advice from AI] 토큰 검증 엔드포인트
router.post('/verify', authenticate, (req: Request, res: Response) => {
  // authenticate 미들웨어를 통과했다면 토큰이 유효함
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// [advice from AI] 사용자 정보 조회
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// [advice from AI] 비밀번호 변경 (내부 인증용)
const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).max(100).required(),
  newPassword: Joi.string().min(6).max(100).required()
});

router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isInternalAuth()) {
      return next(new ApiError(400, 'Password change is only available for internal authentication'));
    }

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0]?.message || 'Validation error'));
    }

    const { oldPassword, newPassword } = value;
    const userId = req.user?.id;
    if (!userId) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    const success = await internalAuthService.changePassword(userId, oldPassword, newPassword);
    
    if (!success) {
      return next(new ApiError(400, 'Failed to change password. Please check your current password.'));
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Change password error:', error);
    next(new ApiError(500, 'Failed to change password due to server error'));
  }
});

// [advice from AI] 로그아웃 (클라이언트에서 토큰 삭제)
router.post('/logout', authenticate, (req: Request, res: Response) => {
  // JWT는 stateless이므로 서버에서 할 일은 없음
  // 클라이언트에서 토큰을 삭제하도록 안내
  logger.info(`User logged out: ${req.user?.username}`);
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client.',
    timestamp: new Date().toISOString()
  });
});

export default router;