import api from './api';
import { LoginRequest, LoginResponse, AuthConfigResponse, AuthenticatedUser } from '../types/auth';
import { ApiResponse } from '../types/common';

const AUTH_API_BASE_URL = '/api/auth';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(`${AUTH_API_BASE_URL}/login`, credentials);
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout(): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`${AUTH_API_BASE_URL}/logout`);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response.data;
  },

  async getAuthConfig(): Promise<AuthConfigResponse> {
    const response = await api.get<AuthConfigResponse>(`${AUTH_API_BASE_URL}/config`);
    return response.data;
  },

  getCurrentUser(): AuthenticatedUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },
};