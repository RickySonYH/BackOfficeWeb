// [advice from AI] ECP 인증 서비스 (포트 6000 연동)
import axios from 'axios';

const ECP_API_BASE_URL = 'http://localhost:6000';

const ecpApi = axios.create({
  baseURL: ECP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 응답 인터셉터로 토큰 만료 처리
ecpApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('ecp_refresh_token');
        if (refreshToken) {
          const response = await ecpApi.post('/api/auth/refresh', {
            refresh_token: refreshToken
          });
          
          if (response.data.success) {
            const { access_token, refresh_token } = response.data;
            localStorage.setItem('ecp_token', access_token);
            localStorage.setItem('ecp_refresh_token', refresh_token);
            
            // 원래 요청에 새 토큰 적용
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return ecpApi(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // 토큰 갱신 실패 시 로그아웃 처리
        localStorage.removeItem('ecp_token');
        localStorage.removeItem('ecp_refresh_token');
        localStorage.removeItem('ecp_user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// 요청 인터셉터로 토큰 자동 추가
ecpApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ecp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface ECPUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  department: string;
  position: string;
  last_login?: string;
}

export interface ECPLoginResponse {
  success: boolean;
  redirect_url?: string;
  state?: string;
  session_id?: string;
  message?: string;
  error?: string;
}

export interface ECPCallbackResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: ECPUser;
  message?: string;
  error?: string;
}

export interface ECPUserResponse {
  success: boolean;
  user?: ECPUser;
  error?: string;
}

export const ecpAuthService = {
  // ECP 로그인 시작
  async startLogin(): Promise<ECPLoginResponse> {
    try {
      const response = await ecpApi.get('/api/auth/ecp/login');
      return response.data;
    } catch (error: any) {
      console.error('ECP login start failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to start ECP login'
      };
    }
  },

  // ECP 콜백 처리
  async handleCallback(code: string, state: string, sessionId: string): Promise<ECPCallbackResponse> {
    try {
      const response = await ecpApi.post('/api/auth/ecp/callback', {
        code,
        state,
        session_id: sessionId
      });
      
      if (response.data.success) {
        // 토큰과 사용자 정보 저장
        localStorage.setItem('ecp_token', response.data.access_token);
        localStorage.setItem('ecp_refresh_token', response.data.refresh_token);
        localStorage.setItem('ecp_user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('ECP callback failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'ECP callback failed'
      };
    }
  },

  // 현재 사용자 정보 조회
  async getCurrentUser(): Promise<ECPUserResponse> {
    try {
      const response = await ecpApi.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      console.error('Get current user failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user info'
      };
    }
  },

  // 로그아웃
  async logout(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const refreshToken = localStorage.getItem('ecp_refresh_token');
      const response = await ecpApi.post('/api/auth/logout', {
        refresh_token: refreshToken
      });
      
      // 로컬 스토리지 정리
      localStorage.removeItem('ecp_token');
      localStorage.removeItem('ecp_refresh_token');
      localStorage.removeItem('ecp_user');
      
      return response.data;
    } catch (error: any) {
      console.error('Logout failed:', error);
      // 에러가 발생해도 로컬 스토리지는 정리
      localStorage.removeItem('ecp_token');
      localStorage.removeItem('ecp_refresh_token');
      localStorage.removeItem('ecp_user');
      
      return {
        success: false,
        error: error.response?.data?.error || 'Logout failed'
      };
    }
  },

  // 토큰 갱신
  async refreshToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const refreshToken = localStorage.getItem('ecp_refresh_token');
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      const response = await ecpApi.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });
      
      if (response.data.success) {
        localStorage.setItem('ecp_token', response.data.access_token);
        localStorage.setItem('ecp_refresh_token', response.data.refresh_token);
        return { success: true };
      }
      
      return { success: false, error: response.data.error };
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed'
      };
    }
  },

  // 로그인 상태 확인
  isAuthenticated(): boolean {
    const token = localStorage.getItem('ecp_token');
    const user = localStorage.getItem('ecp_user');
    return !!(token && user);
  },

  // 저장된 사용자 정보 가져오기
  getStoredUser(): ECPUser | null {
    try {
      const userStr = localStorage.getItem('ecp_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      return null;
    }
  },

  // ECP 사용자 목록 가져오기 (개발/테스트용)
  async getECPUsers(): Promise<{ success: boolean; users?: ECPUser[]; error?: string }> {
    try {
      const response = await ecpApi.get('/api/auth/ecp/users');
      return response.data;
    } catch (error: any) {
      console.error('Get ECP users failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get ECP users'
      };
    }
  }
};
