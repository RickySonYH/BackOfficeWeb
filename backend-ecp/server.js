// [advice from AI] ECP 인증 서버 메인 파일
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

const app = express();

// CORS 설정
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 메모리 저장소 (실제 환경에서는 Redis나 데이터베이스 사용)
const sessions = new Map(); // OAuth 세션 저장
const refreshTokens = new Map(); // 리프레시 토큰 저장
const users = new Map(); // 사용자 정보 저장

// 테스트용 ECP 사용자 데이터
const ecpUsers = [
  {
    id: 'ecp_001',
    username: 'admin',
    email: 'admin@aicc-ops.com',
    full_name: '시스템 관리자',
    role: 'admin',
    tenant_id: '1',
    tenant_name: 'AICC Solutions',
    department: 'IT',
    position: 'Manager',
    phone: '010-1234-5678',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    last_login: null
  },
  {
    id: 'ecp_002',
    username: 'manager1',
    email: 'manager1@aicc-ops.com',
    full_name: '김매니저',
    role: 'manager',
    tenant_id: '1',
    tenant_name: 'AICC Solutions',
    department: 'Operations',
    position: 'Team Lead',
    phone: '010-2345-6789',
    is_active: true,
    created_at: '2023-02-15T00:00:00.000Z',
    last_login: null
  },
  {
    id: 'ecp_003',
    username: 'user1',
    email: 'user1@globaltech.com',
    full_name: '이사용자',
    role: 'user',
    tenant_id: '2',
    tenant_name: 'Global Tech',
    department: 'Customer Service',
    position: 'Agent',
    phone: '010-3456-7890',
    is_active: true,
    created_at: '2023-03-20T00:00:00.000Z',
    last_login: null
  }
];

// JWT 토큰 생성
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
    iat: Math.floor(Date.now() / 1000)
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  // 리프레시 토큰 저장
  refreshTokens.set(refreshToken, {
    userId: user.id,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일
  });

  return { accessToken, refreshToken };
};

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// ECP OAuth 상태 생성
const generateOAuthState = () => {
  return uuidv4();
};

// ECP 사용자 인증 시뮬레이션 (실제로는 ECP 서버와 통신)
const authenticateWithECP = async (code, state) => {
  // 실제 환경에서는 ECP 서버에 토큰 교환 요청
  console.log(`[ECP Auth] Authenticating with code: ${code}, state: ${state}`);
  
  // 시뮬레이션: 코드 기반으로 사용자 찾기
  const userIndex = parseInt(code) || 0;
  const user = ecpUsers[userIndex] || ecpUsers[0];
  
  // 로그인 시간 업데이트
  user.last_login = new Date().toISOString();
  
  return {
    success: true,
    user: user,
    ecpToken: `ecp_token_${user.id}_${Date.now()}`,
    ecpRefreshToken: `ecp_refresh_${user.id}_${Date.now()}`
  };
};

// 라우트들

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'ECP Authentication Server running on port ' + config.port
  });
});

// ECP 로그인 시작 (리다이렉트)
app.get('/api/auth/ecp/login', (req, res) => {
  try {
    const state = generateOAuthState();
    const sessionId = uuidv4();
    
    // 세션 저장
    sessions.set(sessionId, {
      state,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10분
    });
    
    // ECP 서버로 리다이렉트 URL 생성
    const ecpAuthUrl = new URL('/oauth/authorize', config.ecp.serverUrl);
    ecpAuthUrl.searchParams.set('client_id', config.ecp.clientId);
    ecpAuthUrl.searchParams.set('redirect_uri', config.ecp.redirectUri);
    ecpAuthUrl.searchParams.set('response_type', 'code');
    ecpAuthUrl.searchParams.set('scope', config.ecp.scope);
    ecpAuthUrl.searchParams.set('state', state);
    
    console.log(`[ECP Auth] Redirecting to ECP server: ${ecpAuthUrl.toString()}`);
    
    // 실제 환경에서는 ECP 서버로 리다이렉트
    // res.redirect(ecpAuthUrl.toString());
    
    // 개발/테스트용: 시뮬레이션 페이지로 리다이렉트
    const simulationUrl = `${config.cors.frontendUrl}/ecp-simulation?state=${state}&session=${sessionId}`;
    
    res.json({
      success: true,
      redirect_url: simulationUrl,
      state,
      session_id: sessionId,
      message: 'ECP login initiated'
    });
    
  } catch (error) {
    console.error('ECP login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate ECP login'
    });
  }
});

// ECP 콜백 처리
app.post('/api/auth/ecp/callback', async (req, res) => {
  try {
    const { code, state, session_id } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }
    
    // 세션 검증
    const session = sessions.get(session_id);
    if (!session || session.state !== state) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session or state'
      });
    }
    
    // 세션 만료 확인
    if (new Date() > session.expiresAt) {
      sessions.delete(session_id);
      return res.status(400).json({
        success: false,
        error: 'Session expired'
      });
    }
    
    // ECP 서버와 인증
    const ecpResult = await authenticateWithECP(code, state);
    
    if (!ecpResult.success) {
      return res.status(401).json({
        success: false,
        error: 'ECP authentication failed'
      });
    }
    
    // JWT 토큰 생성
    const tokens = generateTokens(ecpResult.user);
    
    // 사용자 정보 저장
    users.set(ecpResult.user.id, {
      ...ecpResult.user,
      ecpToken: ecpResult.ecpToken,
      ecpRefreshToken: ecpResult.ecpRefreshToken
    });
    
    // 세션 정리
    sessions.delete(session_id);
    
    console.log(`[ECP Auth] User ${ecpResult.user.username} authenticated successfully`);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 24 * 60 * 60, // 24시간 (초)
      token_type: 'Bearer',
      user: {
        id: ecpResult.user.id,
        username: ecpResult.user.username,
        email: ecpResult.user.email,
        full_name: ecpResult.user.full_name,
        role: ecpResult.user.role,
        tenant_id: ecpResult.user.tenant_id,
        tenant_name: ecpResult.user.tenant_name,
        department: ecpResult.user.department,
        position: ecpResult.user.position
      }
    });
    
  } catch (error) {
    console.error('ECP callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication callback failed'
    });
  }
});

// 토큰 갱신
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    // 리프레시 토큰 검증
    const tokenData = refreshTokens.get(refresh_token);
    if (!tokenData || new Date() > tokenData.expiresAt) {
      refreshTokens.delete(refresh_token);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }
    
    // 사용자 정보 조회
    const user = users.get(tokenData.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // 새 토큰 생성
    const tokens = generateTokens(user);
    
    // 기존 리프레시 토큰 삭제
    refreshTokens.delete(refresh_token);
    
    res.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 24 * 60 * 60,
      token_type: 'Bearer'
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// 현재 사용자 정보 조회
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name,
        department: user.department,
        position: user.position,
        last_login: user.last_login
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// 로그아웃
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    // 리프레시 토큰 삭제
    if (refresh_token) {
      refreshTokens.delete(refresh_token);
    }
    
    console.log(`[ECP Auth] User ${req.user.username} logged out`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ECP 사용자 목록 (개발/테스트용)
app.get('/api/auth/ecp/users', (req, res) => {
  res.json({
    success: true,
    users: ecpUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_name: user.tenant_name,
      department: user.department,
      position: user.position
    }))
  });
});

// 서버 시작
app.listen(config.port, () => {
  console.log(`🚀 ECP Authentication Server running on port ${config.port}`);
  console.log(`📊 Health: http://localhost:${config.port}/api/health`);
  console.log(`🔐 ECP Login: http://localhost:${config.port}/api/auth/ecp/login`);
  console.log(`🔄 Token Refresh: http://localhost:${config.port}/api/auth/refresh`);
  console.log(`👤 User Info: http://localhost:${config.port}/api/auth/me`);
  console.log(`👥 ECP Users: http://localhost:${config.port}/api/auth/ecp/users`);
  console.log('');
  console.log('🔧 Available ECP Authentication Endpoints:');
  console.log('  - GET /api/auth/ecp/login - Start ECP login');
  console.log('  - POST /api/auth/ecp/callback - Handle ECP callback');
  console.log('  - POST /api/auth/refresh - Refresh access token');
  console.log('  - GET /api/auth/me - Get current user info');
  console.log('  - POST /api/auth/logout - Logout user');
  console.log('  - GET /api/auth/ecp/users - List ECP users (dev)');
  console.log('');
  console.log('📋 Test ECP Users:');
  ecpUsers.forEach((user, index) => {
    console.log(`  - Code ${index}: ${user.username} (${user.role}) - ${user.full_name}`);
  });
});
