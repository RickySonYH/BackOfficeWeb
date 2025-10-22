// [advice from AI] 인증 관련 TypeScript 타입 정의

// [advice from AI] 사용자 역할 enum
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

// [advice from AI] JWT 페이로드 인터페이스
export interface JWTPayload {
  userId: string;
  tenantId: string;
  username: string;
  email: string;
  role: UserRole;
  ecpUserId?: string | undefined;
  iat: number;
  exp: number;
}

// [advice from AI] ECP 토큰 응답 인터페이스
export interface ECPTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  user_info: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
}

// [advice from AI] 인증된 사용자 정보 인터페이스
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  tenantKey?: string;
  username: string;
  email: string;
  role: UserRole;
  ecpUserId?: string;
  isActive?: boolean;
}

// [advice from AI] 로그인 요청 인터페이스
export interface LoginRequest {
  username?: string;
  email?: string;
  password?: string;
  ecpToken?: string;
}

// [advice from AI] 로그인 응답 인터페이스
export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string | undefined;
  user: AuthenticatedUser;
  expiresIn: number;
}

// [advice from AI] 토큰 검증 응답 인터페이스
export interface TokenVerificationResponse {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// [advice from AI] 권한 체크 옵션 인터페이스
export interface PermissionCheckOptions {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requireSameTenant?: boolean;
  resourceTenantId?: string;
}

// [advice from AI] Express Request 확장 (인증된 사용자 정보 추가)
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      token?: string;
    }
  }
}
