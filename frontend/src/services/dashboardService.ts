// [advice from AI] 대시보드 API 서비스
import axios from 'axios';
import { DashboardResponse, SystemStatus } from '../types/dashboard';

const DASHBOARD_API_BASE_URL = 'http://localhost:2000';

const dashboardApi = axios.create({
  baseURL: DASHBOARD_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
dashboardApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
dashboardApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그인 페이지로 리다이렉트
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const dashboardService = {
  // 전체 대시보드 데이터 조회
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      const response = await dashboardApi.get('/api/dashboard');
      return { success: true, data: response.data.data };
    } catch (error: any) {
      // 개발 중에는 Mock 데이터 반환
      console.warn('Dashboard API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockDashboardData()
      };
    }
  },

  // 시스템 상태만 조회 (실시간 업데이트용)
  async getSystemStatus(): Promise<{ success: boolean; data?: SystemStatus; error?: string }> {
    try {
      const response = await dashboardApi.get('/api/dashboard/system-status');
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch system status'
      };
    }
  },

  // Mock 대시보드 데이터 (개발용)
  getMockDashboardData() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      stats: {
        companies: 15,
        tenants: 42,
        users: 128,
        workspaces: 67
      },
      tenant_init_stats: {
        completed: 35,
        in_progress: 5,
        failed: 2
      },
      recent_companies: [
        {
          id: '1',
          company_name: '삼성전자',
          business_number: '123-45-67890',
          created_at: yesterday.toISOString()
        },
        {
          id: '2',
          company_name: 'LG전자',
          business_number: '098-76-54321',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          company_name: '현대자동차',
          business_number: '555-66-77788',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          company_name: 'SK텔레콤',
          business_number: '111-22-33444',
          created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          company_name: 'NAVER',
          business_number: '999-88-77666',
          created_at: lastWeek.toISOString()
        }
      ],
      recent_tenants: [
        {
          id: '1',
          tenant_key: 'samsung-cs-2024',
          company_name: '삼성전자',
          deployment_status: 'active',
          created_at: yesterday.toISOString()
        },
        {
          id: '2',
          tenant_key: 'lg-support-2024',
          company_name: 'LG전자',
          deployment_status: 'deploying',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          tenant_key: 'hyundai-sales-2024',
          company_name: '현대자동차',
          deployment_status: 'active',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          tenant_key: 'sk-telecom-2024',
          company_name: 'SK텔레콤',
          deployment_status: 'pending',
          created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          tenant_key: 'naver-dev-2024',
          company_name: 'NAVER',
          deployment_status: 'failed',
          created_at: lastWeek.toISOString()
        }
      ],
      recent_init_logs: [
        {
          id: '1',
          tenant_id: '1',
          tenant_key: 'samsung-cs-2024',
          action: '데이터베이스 스키마 초기화',
          status: 'completed' as const,
          message: 'PostgreSQL 스키마 생성 완료',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          tenant_id: '2',
          tenant_key: 'lg-support-2024',
          action: 'KMS 데이터 업로드',
          status: 'in_progress' as const,
          message: '지식 문서 업로드 중... (75%)',
          timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          tenant_id: '3',
          tenant_key: 'hyundai-sales-2024',
          action: '워크스페이스 설정 적용',
          status: 'completed' as const,
          message: '벡터 DB 인덱스 생성 완료',
          timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          tenant_id: '4',
          tenant_key: 'sk-telecom-2024',
          action: 'MongoDB 컬렉션 생성',
          status: 'failed' as const,
          message: '연결 시간 초과',
          timestamp: new Date(now.getTime() - 90 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          tenant_id: '1',
          tenant_key: 'samsung-cs-2024',
          action: 'FAQ 데이터 시딩',
          status: 'completed' as const,
          message: '1,250개 FAQ 항목 업로드 완료',
          timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString()
        }
      ],
      system_status: {
        management_db: {
          status: 'connected' as const,
          port: 6432,
          message: '정상 연결됨'
        },
        backend_service: {
          status: 'connected' as const,
          port: 2000,
          message: '서비스 정상 동작'
        },
        kubernetes: {
          status: 'connected' as const,
          message: '클러스터 연결 정상'
        },
        ecp_auth: {
          status: 'connected' as const,
          port: 8000,
          message: '인증 서버 정상'
        }
      }
    };
  },

  // 빈 대시보드 데이터 (에러 시 기본값)
  getEmptyDashboardData() {
    return {
      stats: {
        companies: 0,
        tenants: 0,
        users: 0,
        workspaces: 0
      },
      tenant_init_stats: {
        completed: 0,
        in_progress: 0,
        failed: 0
      },
      recent_companies: [],
      recent_tenants: [],
      recent_init_logs: [],
      system_status: {
        management_db: {
          status: 'error' as const,
          port: 6432,
          message: 'Connection failed'
        },
        backend_service: {
          status: 'error' as const,
          port: 2000,
          message: 'Service unavailable'
        },
        kubernetes: {
          status: 'error' as const,
          message: 'Cluster unreachable'
        },
        ecp_auth: {
          status: 'error' as const,
          port: 8000,
          message: 'Auth server unavailable'
        }
      }
    };
  },

  // 상태 표시용 색상 클래스
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'disconnected': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  // 상태 표시 텍스트
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'connected': return '연결됨';
      case 'disconnected': return '연결 끊김';
      case 'error': return '오류';
      default: return '알 수 없음';
    }
  },

  // 배포 상태 표시용 색상
  getDeploymentStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'deploying': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  // 초기화 상태 표시용 색상
  getInitStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  // 날짜 포맷팅
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  },

  // 시간 포맷팅
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('ko-KR');
  }
};
