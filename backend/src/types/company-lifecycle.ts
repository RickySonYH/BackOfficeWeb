// [advice from AI] 회사 생명주기 관리 타입 정의
import { Company, Tenant, Workspace, User } from './database';

export interface CreateCompanyRequest {
  name: string;
  businessNumber: string;
  contractDate: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface CreateCompanyWithSetupRequest {
  // 기본 회사 정보
  name: string;
  businessNumber: string;
  contractDate: string;
  status?: 'active' | 'inactive' | 'suspended';
  
  // 관리자 계정 정보
  adminEmail: string;
  adminUsername: string;
  
  // 기본 워크스페이스 설정
  defaultWorkspaces?: {
    createKMS: boolean;
    createAdvisor: boolean;
    kmsConfig?: KMSWorkspaceConfig;
    advisorConfig?: AdvisorWorkspaceConfig;
  };
  
  // 솔루션 할당 설정 (선택사항)
  solutionAssignment?: {
    autoAssign: boolean;
    preferredSolutionId?: string;
    resourceRequirements?: ResourceRequirements;
  };
}

export interface CompleteCompanyResponse {
  company: Company;
  tenant: Tenant;
  workspaces: Workspace[];
  adminUser: User;
  kubernetesNamespace: string;
  solutionMapping?: TenantSolutionMapping;
}

export interface KMSWorkspaceConfig {
  knowledge_sources: string[];
  indexing_enabled: boolean;
  auto_learning: boolean;
  vector_db_config: {
    dimension: number;
    similarity_metric: 'cosine' | 'euclidean' | 'dot_product';
    index_type: 'hnsw' | 'ivf';
  };
  search_config: {
    max_results: number;
    similarity_threshold: number;
    enable_semantic_search: boolean;
  };
  data_processing: {
    chunk_size: number;
    chunk_overlap: number;
    enable_preprocessing: boolean;
    supported_formats: string[];
  };
  ui_settings: {
    theme: 'light' | 'dark';
    language: string;
    show_confidence_scores: boolean;
  };
}

export interface AdvisorWorkspaceConfig {
  response_templates: ResponseTemplate[];
  escalation_rules: EscalationRule[];
  sentiment_analysis: {
    enabled: boolean;
    threshold_positive: number;
    threshold_negative: number;
    language: string;
  };
  conversation_config: {
    max_context_length: number;
    enable_context_memory: boolean;
    session_timeout: number;
  };
  auto_response_settings: {
    enabled: boolean;
    confidence_threshold: number;
    max_auto_responses: number;
  };
  ui_settings: {
    theme: 'light' | 'dark';
    language: string;
    show_confidence_scores: boolean;
    enable_quick_replies: boolean;
  };
}

export interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  personalization?: boolean;
  dynamic?: boolean;
}

export interface EscalationRule {
  condition: string;
  action: 'human_handoff' | 'priority_escalation' | 'suggest_alternatives' | 'summary_and_escalate';
  message: string;
}

export interface ResourceRequirements {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count?: number;
}

export interface TenantSolutionMapping {
  id: string;
  tenant_id: string;
  solution_id: string;
  allocated_cpu_cores: number;
  allocated_memory_gb: number;
  allocated_storage_gb: number;
  status: 'assigned' | 'deploying' | 'active' | 'suspended' | 'migrating';
  priority: number;
  assigned_at: string;
  assigned_by: string;
  activated_at?: string;
}

export interface DeployedSolution {
  id: string;
  solution_name: string;
  solution_version: string;
  deployment_url: string;
  deployment_type: 'kubernetes' | 'docker' | 'vm' | 'cloud';
  hardware_spec: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    gpu_count: number;
  };
  max_tenants: number;
  current_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  current_cpu_usage: number;
  current_memory_usage: number;
  kubernetes_cluster?: string;
  kubernetes_namespace?: string;
  status: 'pending' | 'deploying' | 'active' | 'maintenance' | 'failed' | 'retired';
  health_check_url?: string;
  last_health_check?: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  deployment_config: Record<string, any>;
  deployed_by?: string;
  deployed_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  type: 'KMS' | 'ADVISOR';
  default_config: Record<string, any>;
  is_system_default: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreationResult {
  success: boolean;
  data?: CompleteCompanyResponse;
  error?: string;
  rollback_info?: {
    company_created: boolean;
    tenant_created: boolean;
    workspaces_created: string[];
    admin_user_created: boolean;
    kubernetes_namespace_created: boolean;
  };
}

export interface CompanyDeletionOptions {
  force: boolean;
  cleanup_kubernetes: boolean;
  cleanup_solution_mappings: boolean;
  backup_data: boolean;
}

export interface CompanyDeletionResult {
  success: boolean;
  cleaned_resources: {
    company: boolean;
    tenants: string[];
    workspaces: string[];
    users: string[];
    kubernetes_namespaces: string[];
    solution_mappings: string[];
  };
  error?: string;
  backup_location?: string;
}
