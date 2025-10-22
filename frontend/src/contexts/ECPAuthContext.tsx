// [advice from AI] ECP 인증 Context API 구현
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ecpAuthService, ECPUser } from '../services/ecpAuthService';

interface ECPAuthContextType {
  user: ECPUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
}

const ECPAuthContext = createContext<ECPAuthContextType | undefined>(undefined);

interface ECPAuthProviderProps {
  children: ReactNode;
}

export const ECPAuthProvider: React.FC<ECPAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ECPUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 인증 상태 확인
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // 로컬 스토리지에서 사용자 정보 확인
        const storedUser = ecpAuthService.getStoredUser();
        const hasToken = ecpAuthService.isAuthenticated();
        
        if (hasToken && storedUser) {
          // 서버에서 최신 사용자 정보 확인
          const response = await ecpAuthService.getCurrentUser();
          if (response.success && response.user) {
            setUser(response.user);
            setIsAuthenticated(true);
            // 최신 정보로 로컬 스토리지 업데이트
            localStorage.setItem('ecp_user', JSON.stringify(response.user));
          } else {
            // 서버 검증 실패 시 로컬 데이터 사용
            setUser(storedUser);
            setIsAuthenticated(true);
          }
        } else {
          // 인증 정보가 없으면 로그아웃 상태로 설정
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // 에러 발생 시 로컬 데이터 정리
        await ecpAuthService.logout();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 토큰 만료 체크 (5분마다)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = async () => {
      try {
        const response = await ecpAuthService.getCurrentUser();
        if (!response.success) {
          // 토큰이 만료되었거나 유효하지 않음
          console.log('Token expired, attempting refresh...');
          const refreshResult = await ecpAuthService.refreshToken();
          if (!refreshResult.success) {
            // 리프레시도 실패하면 로그아웃
            await handleLogout();
          }
        }
      } catch (error) {
        console.error('Token check failed:', error);
      }
    };

    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000); // 5분마다 체크
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await ecpAuthService.startLogin();
      
      if (response.success && response.redirect_url) {
        // ECP 로그인 페이지로 리다이렉트
        window.location.href = response.redirect_url;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await ecpAuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // 에러가 발생해도 상태는 초기화
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserInfo = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await ecpAuthService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('ecp_user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('Failed to refresh user info:', error);
    }
  };

  const value: ECPAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    refreshUserInfo
  };

  return (
    <ECPAuthContext.Provider value={value}>
      {children}
    </ECPAuthContext.Provider>
  );
};

export const useECPAuth = (): ECPAuthContextType => {
  const context = useContext(ECPAuthContext);
  if (context === undefined) {
    throw new Error('useECPAuth must be used within an ECPAuthProvider');
  }
  return context;
};
