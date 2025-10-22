// frontend/src/services/tenantService.ts

import api from './api';
import { 
  Tenant, 
  TenantListResponse, 
  TenantResponse,
  TenantDbConnectionsResponse,
  TenantDbConnection,
  CreateTenantRequest, 
  CreateTenantDbConnectionRequest 
} from '../types/tenant';
import { ApiResponse } from '../types/common';

const TENANTS_API_BASE_URL = '/api/tenants';

export const tenantService = {
  // 테넌트 목록 조회 (페이지네이션 및 회사별 필터링)
  async getTenants(page: number = 1, limit: number = 10, companyId?: string): Promise<ApiResponse<TenantListResponse['data']>> {
    try {
      let url = `${TENANTS_API_BASE_URL}?page=${page}&limit=${limit}`;
      if (companyId) {
        url += `&company_id=${companyId}`;
      }
      
      const response = await api.get(url);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch tenants'
      };
    }
  },

  // 테넌트 상세 조회
  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    try {
      const response = await api.get(`${TENANTS_API_BASE_URL}/${id}`);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch tenant'
      };
    }
  },

  // 특정 테넌트 조회 (getTenantById 별칭)
  async getTenantById(tenantId: string): Promise<ApiResponse<Tenant>> {
    return this.getTenant(tenantId);
  },

  // 테넌트 생성
  async createTenant(tenantData: CreateTenantRequest): Promise<ApiResponse<Tenant>> {
    try {
      const response = await api.post(TENANTS_API_BASE_URL, tenantData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create tenant'
      };
    }
  },

  // 테넌트 DB 연결 정보 조회
  async getTenantDbConnections(tenantId: string): Promise<ApiResponse<TenantDbConnection[]>> {
    try {
      const response = await api.get(`${TENANTS_API_BASE_URL}/${tenantId}/db-connections`);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch database connections'
      };
    }
  },

  // 테넌트 DB 연결 정보 등록
  async createTenantDbConnection(tenantId: string, connectionData: CreateTenantDbConnectionRequest): Promise<ApiResponse<TenantDbConnection>> {
    try {
      const response = await api.post(`${TENANTS_API_BASE_URL}/${tenantId}/db-connections`, connectionData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create database connection'
      };
    }
  },

  // DB 연결 테스트
  async testDbConnection(tenantId: string, connectionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`${TENANTS_API_BASE_URL}/${tenantId}/db-connections/${connectionId}/test`);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to test database connection'
      };
    }
  },

  // 테넌트 키 생성 (클라이언트 사이드 미리보기용)
  generateTenantKeyPreview(companyName: string): string {
    const cleanCompanyName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(16).substring(2, 6);
    
    return `${cleanCompanyName}-${date}-${randomSuffix}`;
  },

  // Kubernetes namespace 이름 생성 미리보기
  generateNamespacePreview(tenantKey: string): string {
    return `tenant-${tenantKey}`;
  },

  // 배포 상태 표시용 함수
  getDeploymentStatusDisplay(status: string) {
    const statusMap = {
      pending: { text: '대기중', color: 'bg-gray-100 text-gray-800' },
      deploying: { text: '배포중', color: 'bg-blue-100 text-blue-800' },
      active: { text: '활성', color: 'bg-success-100 text-success-800' },
      failed: { text: '실패', color: 'bg-red-100 text-red-800' },
      inactive: { text: '비활성', color: 'bg-gray-100 text-gray-800' }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  },

  // 연결 상태 표시용 함수
  getConnectionStatusDisplay(status: string) {
    const statusMap = {
      pending: { text: '테스트 대기중', color: 'bg-gray-100 text-gray-800' },
      connected: { text: '연결됨', color: 'bg-success-100 text-success-800' },
      failed: { text: '연결 실패', color: 'bg-red-100 text-red-800' }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  },

  // 날짜 포맷팅
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ko-KR');
  },

  // 날짜시간 포맷팅
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('ko-KR');
  },


  // 테넌트 DB 연결 테스트 (testTenantDbConnection 별칭)
  async testTenantDbConnection(tenantId: string, connectionId: string): Promise<ApiResponse<{ status: string; message: string }>> {
    return this.testDbConnection(tenantId, connectionId);
  }
};
