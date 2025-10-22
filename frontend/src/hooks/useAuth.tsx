// frontend/src/hooks/useAuth.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthenticatedUser, AuthContextType, LoginRequest } from '../types/auth';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsLoading(true);
    
    try {
      const storedToken = authService.getToken();
      const storedUser = authService.getCurrentUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // 오류 발생 시 로컬 스토리지 정리
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);
      
      if (response.success && response.token) {
        setToken(response.token);
        setUser(response.user);
        return true;
      } else {
        console.error('Login failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout service error:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const isAuthenticated = !!token && !!user;

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
