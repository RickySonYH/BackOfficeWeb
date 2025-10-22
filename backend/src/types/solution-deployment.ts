// [advice from AI] 솔루션 배포 관리 타입 정의

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

export interface ResourceUsageMetric {
  id?: string;
  solution_id?: string;
  tenant_id?: string;
  metric_type: 'cpu' | 'memory' | 'storage' | 'network' | 'requests';
  metric_name: string;
  metric_value: number;
  metric_unit: 'cores' | 'bytes' | 'percent' | 'requests/sec' | 'mbps';
  collected_at: string;
  time_window?: number;
  tags?: Record<string, any>;
  created_at?: string;
}

export interface SolutionHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  response_code: number;
  response_time_ms: number;
  checked_at: string;
  error_message?: string;
}

// 요청/응답 타입들

export interface SolutionDeploymentRequest {
  solution_name: string;
  solution_version: string;
  deployment_url: string;
  deployment_type: 'kubernetes' | 'docker' | 'vm' | 'cloud';
  
  hardware_spec: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    gpu_count?: number;
  };
  
  max_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  
  kubernetes_cluster?: string;
  kubernetes_namespace?: string;
  internal_ip?: string;
  external_ip?: string;
  port_mappings?: { [key: string]: number };
  
  health_check_url?: string;
  deployment_config?: Record<string, any>;
  monitoring_config?: Record<string, any>;
  backup_config?: Record<string, any>;
  
  deployed_by?: string;
}

export interface TenantAssignmentRequest {
  tenant_id: string;
  solution_id: string;
  allocated_cpu_cores?: number;
  allocated_memory_gb?: number;
  allocated_storage_gb?: number;
  assigned_subdomain?: string;
  assigned_ports?: number[];
  priority?: number;
  assigned_by?: string;
}

export interface ResourceRequirements {
  cpu_cores?: number;
  memory_gb?: number;
  storage_gb?: number;
  gpu_count?: number;
  network_bandwidth?: number;
}

export interface SolutionListResponse {
  success: boolean;
  data: DeployedSolution[];
  total: number;
  page: number;
  limit: number;
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

export interface TenantMappingFilter {
  status?: string[];
  solution_id?: string;
  tenant_id?: string;
  company_name?: string;
  assigned_after?: string;
  assigned_before?: string;
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

// 알림 및 경고 타입들

export interface ResourceAlert {
  id: string;
  solution_id: string;
  alert_type: 'high_cpu' | 'high_memory' | 'high_storage' | 'tenant_capacity' | 'health_check_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold_value: number;
  current_value: number;
  created_at: string;
  resolved_at?: string;
  acknowledged_by?: string;
}

export interface AlertConfiguration {
  solution_id: string;
  alert_type: string;
  enabled: boolean;
  threshold_value: number;
  notification_channels: string[];
  cooldown_minutes: number;
}

// 마이그레이션 관련 타입들

export interface TenantMigrationRequest {
  tenant_id: string;
  source_solution_id: string;
  target_solution_id: string;
  migration_type: 'hot' | 'cold' | 'blue_green';
  scheduled_at?: string;
  rollback_enabled: boolean;
  data_migration_required: boolean;
  estimated_downtime_minutes: number;
}

export interface TenantMigrationStatus {
  migration_id: string;
  tenant_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  progress_percentage: number;
  current_step: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  rollback_available: boolean;
}
