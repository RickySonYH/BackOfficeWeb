export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

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

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken?: string;
  user: AuthenticatedUser;
  expiresIn: number;
  timestamp: string;
}

export interface AuthConfigResponse {
  success: boolean;
  config: {
    provider: 'internal' | 'ecp';
    internalEnabled: boolean;
    ecpEnabled: boolean;
  };
  timestamp: string;
}

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Legacy types for backward compatibility
export type User = AuthenticatedUser;