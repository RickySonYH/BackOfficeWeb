// 워크스페이스 타입
export type WorkspaceType = 'kms' | 'advisor';

// 워크스페이스 상태
export type WorkspaceStatus = 'active' | 'inactive' | 'configuring';

// KMS 워크스페이스 설정
export interface KmsConfig {
  // 지식 카테고리 구조
  categories: {
    id: string;
    name: string;
    description?: string;
    parent_id?: string;
    order: number;
  }[];
  
  // 검색 파라미터
  searchParams: {
    similarityThreshold: number; // 유사도 임계값 (0.0 - 1.0)
    topK: number; // 상위 K개 결과
    maxResults: number; // 최대 결과 수
  };
  
  // RAG 설정
  ragConfig: {
    vectorDb: {
      provider: 'pinecone' | 'weaviate' | 'chroma';
      endpoint?: string;
      apiKey?: string;
      indexName?: string;
    };
    embeddingModel: {
      provider: 'openai' | 'huggingface' | 'cohere';
      model: string;
      dimension: number;
    };
    chunkSize: number;
    chunkOverlap: number;
  };
}

// 어드바이저 워크스페이스 설정
export interface AdvisorConfig {
  // 상담 시나리오 구조
  scenarios: {
    id: string;
    name: string;
    description?: string;
    category: string;
    triggers: string[];
    order: number;
  }[];
  
  // 응답 템플릿 카테고리
  responseTemplates: {
    category: string;
    templates: {
      id: string;
      name: string;
      content: string;
      variables: string[];
    }[];
  }[];
  
  // 트리거 조건 설정
  triggerConditions: {
    keywords: string[];
    sentiment: 'positive' | 'negative' | 'neutral' | 'any';
    contextRules: {
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
      value: string;
    }[];
  };
}

// 워크스페이스 기본 정보
export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  tenant_id: string;
  tenant_name?: string;
  description?: string;
  config: KmsConfig | AdvisorConfig;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// 워크스페이스 생성 폼 데이터
export interface WorkspaceFormData {
  name: string;
  type: WorkspaceType;
  tenant_id: string;
  description?: string;
}

// 워크스페이스 생성 폼 에러
export interface WorkspaceFormErrors {
  name?: string;
  type?: string;
  tenant_id?: string;
  description?: string;
}

// 워크스페이스 목록 응답
export interface WorkspacesResponse {
  success: boolean;
  data?: {
    workspaces: Workspace[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

// 단일 워크스페이스 응답
export interface WorkspaceResponse {
  success: boolean;
  data?: Workspace;
  error?: string;
}

// 워크스페이스 설정 업데이트 데이터
export interface WorkspaceConfigUpdateData {
  config: KmsConfig | AdvisorConfig;
}

// 테넌트별 워크스페이스 맵핑
export interface TenantWorkspaceMapping {
  tenant_id: string;
  tenant_name?: string;
  default_kms_workspace_id?: string;
  default_advisor_workspace_id?: string;
  workspace_priorities: {
    workspace_id: string;
    workspace_name?: string;
    workspace_type?: WorkspaceType;
    priority: number;
    is_default: boolean;
  }[];
  workspace_assignments: {
    user_id: string;
    workspace_id: string;
    role: 'admin' | 'editor' | 'viewer';
  }[];
}

// 워크스페이스 맵핑 업데이트 데이터
export interface WorkspaceMappingUpdateData {
  default_kms_workspace_id?: string;
  default_advisor_workspace_id?: string;
  workspace_priorities: {
    workspace_id: string;
    priority: number;
    is_default: boolean;
  }[];
}

// 테넌트별 워크스페이스 맵핑 응답
export interface TenantWorkspaceMappingResponse {
  success: boolean;
  data?: TenantWorkspaceMapping;
  error?: string;
}

// 워크스페이스 타입 설명
export interface WorkspaceTypeDescription {
  type: WorkspaceType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// 워크스페이스 상태 표시
export interface WorkspaceStatusDisplay {
  status: WorkspaceStatus;
  text: string;
  color: string;
}
