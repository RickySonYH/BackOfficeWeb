// [advice from AI] ECP 인증 서버 설정
module.exports = {
  port: process.env.PORT || 6000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET || 'ecp_auth_jwt_secret_key_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'ecp_refresh_token_secret_2024',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  
  // ECP 서버 설정 (시뮬레이션용)
  ecp: {
    serverUrl: process.env.ECP_SERVER_URL || 'https://ecp-auth.aicc.co.kr',
    clientId: process.env.ECP_CLIENT_ID || 'aicc_ops_platform_client',
    clientSecret: process.env.ECP_CLIENT_SECRET || 'aicc_ops_platform_secret_2024',
    redirectUri: process.env.ECP_REDIRECT_URI || 'http://localhost:6000/api/auth/ecp/callback',
    scope: process.env.ECP_SCOPE || 'openid profile email'
  },
  
  // CORS 설정
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:6002',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:6002,http://localhost:6001').split(',')
  },
  
  // 기타 설정
  session: {
    secret: process.env.SESSION_SECRET || 'ecp_session_secret_2024',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax'
  }
};
