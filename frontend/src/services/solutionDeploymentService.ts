// [advice from AI] 솔루션 배포 관리 프론트엔드 서비스
import api from './api';
import {
  DeployedSolution,
  TenantSolutionMapping,
  SolutionResourceSummary,
  TenantResourceAllocation,
  SolutionHealthStatus,
  SolutionDeploymentFormData,
  TenantAssignmentFormData,
  ResourceRequirements,
  SolutionFilter,
  SolutionSortOptions,
  SolutionListResponse,
  SolutionDetailResponse,
  TenantMappingListResponse,
  ResourceSummaryResponse,
  TenantAllocationResponse,
  HealthCheckResponse,
  AllHealthChecksResponse,
  OptimalSolutionResponse
} from '../types/solution-deployment';
import { ApiResponse } from '../types/common';

const SOLUTION_DEPLOYMENT_API_BASE_URL = '/api/solution-deployment';

export const solutionDeploymentService = {
  /**
   * 새로운 솔루션 배포 등록
   */
  async registerSolution(data: SolutionDeploymentFormData): Promise<ApiResponse<DeployedSolution>> {
    try {
      const requestData = {
        solution_name: data.solution_name,
        solution_version: data.solution_version,
        deployment_url: data.deployment_url,
        deployment_type: data.deployment_type,
        hardware_spec: {
          cpu_cores: data.cpu_cores,
          memory_gb: data.memory_gb,
          storage_gb: data.storage_gb,
          gpu_count: data.gpu_count || 0
        },
        max_tenants: data.max_tenants,
        max_cpu_cores: data.max_cpu_cores,
        max_memory_gb: data.max_memory_gb,
        kubernetes_cluster: data.kubernetes_cluster,
        kubernetes_namespace: data.kubernetes_namespace,
        internal_ip: data.internal_ip,
        external_ip: data.external_ip,
        health_check_url: data.health_check_url
      };

      const response = await api.post(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/solutions`, requestData);
      return { 
        success: true, 
        data: response.data.data, 
        message: response.data.message 
      };
    } catch (error: any) {
      console.error('Failed to register solution:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to register solution'
      };
    }
  },

  /**
   * 배포된 솔루션 목록 조회
   */
  async getSolutions(
    page: number = 1,
    limit: number = 20,
    filter?: SolutionFilter,
    sort?: SolutionSortOptions
  ): Promise<SolutionListResponse> {
    try {
      const params: any = { page, limit };
      
      if (filter) {
        if (filter.status?.length) params.status = filter.status.join(',');
        if (filter.deployment_type?.length) params.deployment_type = filter.deployment_type.join(',');
        if (filter.kubernetes_cluster) params.kubernetes_cluster = filter.kubernetes_cluster;
        if (filter.health_status?.length) params.health_status = filter.health_status.join(',');
        if (filter.min_available_cpu) params.min_available_cpu = filter.min_available_cpu;
        if (filter.min_available_memory) params.min_available_memory = filter.min_available_memory;
        if (filter.min_available_tenants) params.min_available_tenants = filter.min_available_tenants;
      }
      
      if (sort) {
        params.sort_field = sort.field;
        params.sort_direction = sort.direction;
      }

      const response = await api.get(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/solutions`, { params });
      return {
        success: true,
        data: response.data.data,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      };
    } catch (error: any) {
      console.error('Failed to get solutions:', error);
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        error: error.response?.data?.error || error.message || 'Failed to get solutions'
      };
    }
  },

  /**
   * 특정 솔루션 상세 정보 조회
   */
  async getSolutionDetails(solutionId: string): Promise<SolutionDetailResponse> {
    try {
      const response = await api.get(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/solutions/${solutionId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to get solution details:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get solution details'
      };
    }
  },

  /**
   * 솔루션 삭제
   */
  async deleteSolution(solutionId: string, force: boolean = false): Promise<ApiResponse<void>> {
    try {
      const params = force ? { force: 'true' } : {};
      const response = await api.delete(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/solutions/${solutionId}`, { params });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Failed to delete solution:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete solution'
      };
    }
  },

  /**
   * 테넌트를 솔루션에 할당
   */
  async assignTenantToSolution(data: TenantAssignmentFormData): Promise<ApiResponse<TenantSolutionMapping>> {
    try {
      const response = await api.post(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/assignments`, data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Failed to assign tenant to solution:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to assign tenant to solution'
      };
    }
  },

  /**
   * 최적 솔루션 찾기
   */
  async findOptimalSolution(requirements: ResourceRequirements): Promise<OptimalSolutionResponse> {
    try {
      const response = await api.post(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/optimal-solution`, requirements);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to find optimal solution:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to find optimal solution'
      };
    }
  },

  /**
   * 솔루션별 리소스 사용률 요약 조회
   */
  async getResourceSummary(): Promise<ResourceSummaryResponse> {
    try {
      const response = await api.get(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/resource-summary`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to get resource summary:', error);
      // Mock 데이터 반환 (개발용)
      return {
        success: true,
        data: this.getMockResourceSummary()
      };
    }
  },

  /**
   * 테넌트별 리소스 할당 현황 조회
   */
  async getTenantAllocations(): Promise<TenantAllocationResponse> {
    try {
      const response = await api.get(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/tenant-allocations`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to get tenant allocations:', error);
      // Mock 데이터 반환 (개발용)
      return {
        success: true,
        data: this.getMockTenantAllocations()
      };
    }
  },

  /**
   * 특정 솔루션 헬스 체크 수행
   */
  async performHealthCheck(solutionId: string): Promise<HealthCheckResponse> {
    try {
      const response = await api.post(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/solutions/${solutionId}/health-check`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to perform health check:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to perform health check'
      };
    }
  },

  /**
   * 모든 솔루션 헬스 체크 수행
   */
  async performAllHealthChecks(): Promise<AllHealthChecksResponse> {
    try {
      const response = await api.post(`${SOLUTION_DEPLOYMENT_API_BASE_URL}/health-checks/all`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Failed to perform all health checks:', error);
      return {
        success: false,
        data: {},
        error: error.response?.data?.error || error.message || 'Failed to perform all health checks'
      };
    }
  },

  /**
   * Mock 리소스 요약 데이터 (개발용)
   */
  getMockResourceSummary(): SolutionResourceSummary[] {
    return [
      {
        solution_id: '1',
        solution_name: 'Production Cluster A',
        status: 'active',
        max_tenants: 20,
        current_tenants: 15,
        max_cpu_cores: 32,
        max_memory_gb: 64,
        current_cpu_usage: 24.5,
        current_memory_usage: 48.2,
        cpu_usage_percent: 76.56,
        memory_usage_percent: 75.31,
        tenant_usage_percent: 75.0
      },
      {
        solution_id: '2',
        solution_name: 'Production Cluster B',
        status: 'active',
        max_tenants: 15,
        current_tenants: 8,
        max_cpu_cores: 24,
        max_memory_gb: 48,
        current_cpu_usage: 12.8,
        current_memory_usage: 22.4,
        cpu_usage_percent: 53.33,
        memory_usage_percent: 46.67,
        tenant_usage_percent: 53.33
      },
      {
        solution_id: '3',
        solution_name: 'Development Cluster',
        status: 'active',
        max_tenants: 10,
        current_tenants: 3,
        max_cpu_cores: 16,
        max_memory_gb: 32,
        current_cpu_usage: 4.2,
        current_memory_usage: 9.6,
        cpu_usage_percent: 26.25,
        memory_usage_percent: 30.0,
        tenant_usage_percent: 30.0
      }
    ];
  },

  /**
   * Mock 테넌트 할당 데이터 (개발용)
   */
  getMockTenantAllocations(): TenantResourceAllocation[] {
    return [
      {
        tenant_id: '1',
        tenant_key: 'samsung-cs-2024',
        company_name: '삼성전자',
        solution_name: 'Production Cluster A',
        allocated_cpu_cores: 2.0,
        allocated_memory_gb: 4.0,
        actual_cpu_usage: 1.5,
        actual_memory_usage: 3.2,
        mapping_status: 'active',
        assigned_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: '2',
        tenant_key: 'lg-support-2024',
        company_name: 'LG전자',
        solution_name: 'Production Cluster A',
        allocated_cpu_cores: 1.5,
        allocated_memory_gb: 3.0,
        actual_cpu_usage: 0.8,
        actual_memory_usage: 2.1,
        mapping_status: 'active',
        assigned_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: '3',
        tenant_key: 'hyundai-sales-2024',
        company_name: '현대자동차',
        solution_name: 'Production Cluster B',
        allocated_cpu_cores: 1.0,
        allocated_memory_gb: 2.0,
        actual_cpu_usage: 0.6,
        actual_memory_usage: 1.4,
        mapping_status: 'active',
        assigned_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: '4',
        tenant_key: 'sk-telecom-2024',
        company_name: 'SK텔레콤',
        solution_name: 'Development Cluster',
        allocated_cpu_cores: 0.5,
        allocated_memory_gb: 1.0,
        actual_cpu_usage: 0.2,
        actual_memory_usage: 0.5,
        mapping_status: 'deploying',
        assigned_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  },

  /**
   * 유틸리티 함수들
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('ko-KR');
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatCpuCores(cores: number): string {
    return cores < 1 ? `${(cores * 1000).toFixed(0)}m` : `${cores.toFixed(1)}`;
  },

  formatMemory(gb: number): string {
    return gb < 1 ? `${(gb * 1024).toFixed(0)}Mi` : `${gb.toFixed(1)}Gi`;
  },

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: 'text-yellow-600',
      deploying: 'text-blue-600',
      active: 'text-green-600',
      maintenance: 'text-orange-600',
      failed: 'text-red-600',
      retired: 'text-gray-600',
      healthy: 'text-green-600',
      unhealthy: 'text-red-600',
      unknown: 'text-gray-600',
      assigned: 'text-blue-600',
      suspended: 'text-red-600',
      migrating: 'text-purple-600'
    };
    return colors[status] || 'text-gray-600';
  },

  getStatusBgColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100',
      deploying: 'bg-blue-100',
      active: 'bg-green-100',
      maintenance: 'bg-orange-100',
      failed: 'bg-red-100',
      retired: 'bg-gray-100',
      healthy: 'bg-green-100',
      unhealthy: 'bg-red-100',
      unknown: 'bg-gray-100',
      assigned: 'bg-blue-100',
      suspended: 'bg-red-100',
      migrating: 'bg-purple-100'
    };
    return colors[status] || 'bg-gray-100';
  },

  getUsageColor(percentage: number): string {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  },

  getUsageBgColor(percentage: number): string {
    if (percentage >= 90) return 'bg-red-100';
    if (percentage >= 75) return 'bg-orange-100';
    if (percentage >= 50) return 'bg-yellow-100';
    return 'bg-green-100';
  }
};
