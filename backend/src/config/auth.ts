// backend/src/config/auth.ts

export interface AuthConfig {
  provider: 'internal' | 'ecp';
  internal: {
    enabled: boolean;
    defaultUsers: Array<{
      username: string;
      email: string;
      password: string;
      role: 'admin' | 'manager' | 'user';
      tenantId: string;
    }>;
  };
  ecp: {
    enabled: boolean;
    serverUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
}

// [advice from AI] 인증 설정 - 환경변수로 제어 가능
export const getAuthConfig = (): AuthConfig => {
  const provider = (process.env.AUTH_PROVIDER as 'internal' | 'ecp') || 'internal';
  
  return {
    provider,
    internal: {
      enabled: provider === 'internal' || process.env.INTERNAL_AUTH_ENABLED === 'true',
      defaultUsers: [
        {
          username: 'admin',
          email: 'admin@aicc-ops.com',
          password: 'admin123!', // 실제 환경에서는 해시된 비밀번호 사용
          role: 'admin',
          tenantId: '00000000-0000-0000-0000-000000000001'
        },
        {
          username: 'manager1',
          email: 'manager1@aicc-ops.com',
          password: 'manager123!',
          role: 'manager',
          tenantId: '00000000-0000-0000-0000-000000000001'
        },
        {
          username: 'user1',
          email: 'user1@aicc-ops.com',
          password: 'user123!',
          role: 'user',
          tenantId: '00000000-0000-0000-0000-000000000001'
        }
      ]
    },
    ecp: {
      enabled: provider === 'ecp' || process.env.ECP_AUTH_ENABLED === 'true',
      serverUrl: process.env.ECP_AUTH_URL || 'http://ecp-auth-server:8080/oauth',
      clientId: process.env.ECP_CLIENT_ID || 'aicc-ops-client',
      clientSecret: process.env.ECP_CLIENT_SECRET || 'aicc-ops-secret',
      redirectUri: process.env.ECP_REDIRECT_URI || 'http://localhost:6000/api/auth/ecp/callback'
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret_key_for_development',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_key_for_development',
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
    }
  };
};

// [advice from AI] 현재 인증 설정 조회
export const authConfig = getAuthConfig();

// [advice from AI] 인증 제공자 확인
export const isInternalAuth = () => authConfig.provider === 'internal' || authConfig.internal.enabled;
export const isEcpAuth = () => authConfig.provider === 'ecp' || authConfig.ecp.enabled;

export default authConfig;
