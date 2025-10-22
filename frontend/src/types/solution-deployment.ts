// [advice from AI] 솔루션 배포 관리 프론트엔드 타입 정의

export interface DeployedSolution {
  id: string;
  solution_name: string;
  solution_version: string;
  deployment_url: string;
  deployment_type: 'kubernetes' | 'docker' | 'vm' | 'cloud';
  
  // 하드웨어 스펙
  hardware_spec: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    gpu_count: number;
  };
  
  // 리소스 제한 및 현황
  max_tenants: number;
  current_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  current_cpu_usage: number;
  current_memory_usage: number;
  
  // Kubernetes 관련
  kubernetes_cluster?: string;
  kubernetes_namespace?: string;
  
  // 네트워크 정보
  internal_ip?: string;
  external_ip?: string;
  port_mappings: { [key: string]: number };
  
  // 상태 관리
  status: 'pending' | 'deploying' | 'active' | 'maintenance' | 'failed' | 'retired';
  health_check_url?: string;
  last_health_check?: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  
  // 설정
  deployment_config: Record<string, any>;
  monitoring_config: Record<string, any>;
  backup_config: Record<string, any>;
  
  // 메타데이터
  deployed_by?: string;
  deployed_by_username?: string;
  deployed_at: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSolutionMapping {
  id: string;
  tenant_id: string;
  solution_id: string;
  
  // 리소스 할당량
  allocated_cpu_cores: number;
  allocated_memory_gb: number;
  allocated_storage_gb: number;
  
  // 실제 사용량
  actual_cpu_usage: number;
  actual_memory_usage: number;
  actual_storage_usage: number;
  
  // 네트워크 설정
  assigned_subdomain?: string;
  assigned_ports: number[];
  
  // 상태 관리
  status: 'assigned' | 'deploying' | 'active' | 'suspended' | 'migrating';
  priority: number;
  
  // 할당 정보
  assigned_at: string;
  assigned_by?: string;
  activated_at?: string;
}

export interface SolutionResourceSummary {
  solution_id: string;
  solution_name: string;
  status: string;
  max_tenants: number;
  current_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  current_cpu_usage: number;
  current_memory_usage: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  tenant_usage_percent: number;
}

export interface TenantResourceAllocation {
  tenant_id: string;
  tenant_key: string;
  company_name: string;
  solution_name?: string;
  allocated_cpu_cores?: number;
  allocated_memory_gb?: number;
  actual_cpu_usage?: number;
  actual_memory_usage?: number;
  mapping_status?: string;
  assigned_at?: string;
}

export interface SolutionHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  response_code: number;
  response_time_ms: number;
  checked_at: string;
  error_message?: string;
}

// 폼 데이터 타입들

export interface SolutionDeploymentFormData {
  solution_name: string;
  solution_version: string;
  deployment_url: string;
  deployment_type: 'kubernetes' | 'docker' | 'vm' | 'cloud';
  
  // 하드웨어 스펙
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count: number;
  
  // 리소스 제한
  max_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  
  // Kubernetes 설정
  kubernetes_cluster?: string;
  kubernetes_namespace?: string;
  
  // 네트워크 설정
  internal_ip?: string;
  external_ip?: string;
  
  // 헬스 체크
  health_check_url?: string;
}

export interface TenantAssignmentFormData {
  tenant_id: string;
  solution_id: string;
  allocated_cpu_cores: number;
  allocated_memory_gb: number;
  allocated_storage_gb: number;
  assigned_subdomain?: string;
  priority: number;
}

export interface ResourceRequirements {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count?: number;
}

// API 응답 타입들

export interface SolutionListResponse {
  success: boolean;
  data: DeployedSolution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface SolutionDetailResponse {
  success: boolean;
  data?: DeployedSolution;
  error?: string;
}

export interface TenantMappingListResponse {
  success: boolean;
  data: TenantSolutionMapping[];
  total: number;
  error?: string;
}

export interface ResourceSummaryResponse {
  success: boolean;
  data: SolutionResourceSummary[];
  error?: string;
}

export interface TenantAllocationResponse {
  success: boolean;
  data: TenantResourceAllocation[];
  error?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  data?: SolutionHealthStatus;
  error?: string;
}

export interface AllHealthChecksResponse {
  success: boolean;
  data: { [solutionId: string]: SolutionHealthStatus };
  error?: string;
}

export interface OptimalSolutionResponse {
  success: boolean;
  data?: {
    optimal_solution_id: string;
    solution_details: DeployedSolution;
    requirements: ResourceRequirements;
  };
  error?: string;
}

// 필터 및 정렬 타입들

export interface SolutionFilter {
  status?: string[];
  deployment_type?: string[];
  kubernetes_cluster?: string;
  health_status?: string[];
  min_available_cpu?: number;
  min_available_memory?: number;
  min_available_tenants?: number;
}

export interface SolutionSortOptions {
  field: 'solution_name' | 'created_at' | 'cpu_usage_percent' | 'memory_usage_percent' | 'tenant_usage_percent';
  direction: 'asc' | 'desc';
}

// 대시보드용 요약 타입들

export interface SolutionDashboardSummary {
  total_solutions: number;
  active_solutions: number;
  total_tenants_assigned: number;
  average_cpu_usage: number;
  average_memory_usage: number;
  healthy_solutions: number;
  unhealthy_solutions: number;
  solutions_at_capacity: number;
}

export interface ResourceUtilizationSummary {
  total_cpu_allocated: number;
  total_memory_allocated: number;
  total_storage_allocated: number;
  total_cpu_used: number;
  total_memory_used: number;
  total_storage_used: number;
  cpu_efficiency: number;
  memory_efficiency: number;
  storage_efficiency: number;
}

// 상태별 색상 매핑
export const SOLUTION_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  deploying: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  maintenance: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
  retired: 'bg-gray-100 text-gray-800'
};

export const HEALTH_STATUS_COLORS = {
  healthy: 'bg-green-100 text-green-800',
  unhealthy: 'bg-red-100 text-red-800',
  unknown: 'bg-gray-100 text-gray-800'
};

export const MAPPING_STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-800',
  deploying: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  migrating: 'bg-purple-100 text-purple-800'
};

// 유틸리티 함수들
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatCpuCores = (cores: number): string => {
  return cores < 1 ? `${(cores * 1000).toFixed(0)}m` : `${cores}`;
};

export const formatMemory = (gb: number): string => {
  return gb < 1 ? `${(gb * 1024).toFixed(0)}Mi` : `${gb}Gi`;
};

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-red-600';
  if (percentage >= 75) return 'text-orange-600';
  if (percentage >= 50) return 'text-yellow-600';
  return 'text-green-600';
};

export const getUsageBgColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-100';
  if (percentage >= 75) return 'bg-orange-100';
  if (percentage >= 50) return 'bg-yellow-100';
  return 'bg-green-100';
};
