// [advice from AI] 회사 완전 설정 관련 타입 정의

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

export interface CompleteCompanySetupResponse {
  success: boolean;
  data: {
    company: {
      id: string;
      name: string;
      businessNumber: string;
      contractDate: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
    tenant: {
      id: string;
      tenantKey: string;
      kubernetesNamespace: string;
      deploymentStatus: string;
      createdAt: string;
    };
    workspaces: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      isDefault: boolean;
      priority: number;
      createdAt: string;
    }>;
    adminUser: {
      id: string;
      username: string;
      email: string;
      role: string;
      createdAt: string;
    };
    kubernetesNamespace: string;
    solutionMapping?: {
      id: string;
      solutionId: string;
      status: string;
      allocatedResources: {
        cpu: number;
        memory: number;
        storage: number;
      };
    };
  };
  message: string;
  timestamp: string;
}

// 다단계 폼 단계 정의
export type CompanySetupStep = 'company-info' | 'admin-account' | 'workspace-config' | 'solution-assignment' | 'review';

export interface CompanySetupFormData {
  // Step 1: 회사 정보
  companyInfo: {
    name: string;
    businessNumber: string;
    contractDate: string;
    status: 'active' | 'inactive' | 'suspended';
  };
  
  // Step 2: 관리자 계정
  adminAccount: {
    email: string;
    username: string;
  };
  
  // Step 3: 워크스페이스 설정
  workspaceConfig: {
    createKMS: boolean;
    createAdvisor: boolean;
    kmsSettings: {
      autoLearning: boolean;
      semanticSearch: boolean;
      maxResults: number;
      similarityThreshold: number;
    };
    advisorSettings: {
      autoResponse: boolean;
      confidenceThreshold: number;
      sentimentAnalysis: boolean;
      contextMemory: boolean;
    };
  };
  
  // Step 4: 솔루션 할당 (선택사항)
  solutionAssignment: {
    autoAssign: boolean;
    preferredSolutionId: string;
    resourceRequirements: {
      cpu_cores: number;
      memory_gb: number;
      storage_gb: number;
    };
  };
}

export interface FormValidationErrors {
  [key: string]: string | undefined;
}

export interface StepValidation {
  isValid: boolean;
  errors: FormValidationErrors;
}