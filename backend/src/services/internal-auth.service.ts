// backend/src/services/internal-auth.service.ts

import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import { authConfig } from '../config/auth';
import { AuthenticatedUser } from '../types/auth';

export interface InternalLoginRequest {
  username: string;
  password: string;
}

export interface InternalLoginResponse {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

class InternalAuthService {
  
  // [advice from AI] 기본 사용자 초기화 (개발용)
  async initializeDefaultUsers(): Promise<void> {
    if (!authConfig.internal.enabled) {
      return;
    }

    try {
      logger.info('🔐 Initializing default users for internal authentication...');
      
      for (const defaultUser of authConfig.internal.defaultUsers) {
        // 사용자 존재 확인
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [defaultUser.username, defaultUser.email]
        );

        if (existingUser.rows.length === 0) {
          // 비밀번호 해시화
          const hashedPassword = await bcrypt.hash(defaultUser.password, 10);
          
          // 사용자 생성
          await pool.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, ecp_user_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            defaultUser.tenantId,
            defaultUser.username,
            defaultUser.email,
            hashedPassword,
            defaultUser.role,
            null // ECP 사용자 ID는 null
          ]);

          logger.info(`✅ Created default user: ${defaultUser.username} (${defaultUser.role})`);
        } else {
          logger.info(`👤 User already exists: ${defaultUser.username}`);
        }
      }
      
      logger.info('🎉 Default users initialization completed');
    } catch (error) {
      logger.error('❌ Failed to initialize default users:', error);
      throw error;
    }
  }

  // [advice from AI] 내부 인증 로그인
  async login(credentials: InternalLoginRequest): Promise<InternalLoginResponse> {
    try {
      logger.info(`🔐 Internal login attempt for user: ${credentials.username}`);

      // 사용자 조회
      const result = await pool.query(`
        SELECT 
          u.id,
          u.tenant_id,
          u.username,
          u.email,
          u.password_hash,
          u.role,
          u.ecp_user_id,
          t.tenant_key
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.username = $1 OR u.email = $1
      `, [credentials.username]);

      if (result.rows.length === 0) {
        logger.warn(`⚠️ Login failed: User not found - ${credentials.username}`);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      const user = result.rows[0];

      // 비밀번호 확인
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      
      if (!isPasswordValid) {
        logger.warn(`⚠️ Login failed: Invalid password - ${credentials.username}`);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // 인증된 사용자 정보 구성
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        tenantId: user.tenant_id,
        tenantKey: user.tenant_key,
        username: user.username,
        email: user.email,
        role: user.role,
        ecpUserId: user.ecp_user_id || undefined
      };

      logger.info(`✅ Internal login successful: ${credentials.username} (${user.role})`);
      
      return {
        success: true,
        user: authenticatedUser
      };

    } catch (error) {
      logger.error(`❌ Internal login error for ${credentials.username}:`, error);
      return {
        success: false,
        error: 'Login failed due to server error'
      };
    }
  }

  // [advice from AI] 사용자 정보 조회 (토큰 검증용)
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      const result = await pool.query(`
        SELECT 
          u.id,
          u.tenant_id,
          u.username,
          u.email,
          u.role,
          u.ecp_user_id,
          t.tenant_key
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        tenantId: user.tenant_id,
        tenantKey: user.tenant_key,
        username: user.username,
        email: user.email,
        role: user.role,
        ecpUserId: user.ecp_user_id || undefined
      };

    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      return null;
    }
  }

  // [advice from AI] 비밀번호 변경
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 현재 비밀번호 확인
      const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
      if (!isOldPasswordValid) {
        return false;
      }

      // 새 비밀번호 해시화 및 업데이트
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedNewPassword, userId]
      );

      logger.info(`🔐 Password changed successfully for user: ${userId}`);
      return true;

    } catch (error) {
      logger.error('Error changing password:', error);
      return false;
    }
  }
}

export const internalAuthService = new InternalAuthService();
export default internalAuthService;
