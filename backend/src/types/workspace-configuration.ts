// [advice from AI] 워크스페이스 설정 관리 타입 정의

export interface WorkspaceConfiguration {
  id: string;
  workspace_id: string;
  config_category: string;
  config_key: string;
  config_value: any;
  environment: 'development' | 'staging' | 'production';
  version: number;
  is_active: boolean;
  deployed_to_solution: boolean;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
  deployed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationHistory {
  id: string;
  workspace_id: string;
  configuration_id?: string;
  change_type: 'create' | 'update' | 'delete' | 'rollback' | 'deploy';
  config_category: string;
  config_key: string;
  old_value?: any;
  new_value?: any;
  change_reason?: string;
  change_description?: string;
  changed_by: string;
  changed_by_username?: string;
  changed_by_email?: string;
  changed_at: string;
  applied_at?: string;
}

export interface WorkspaceConfigRequest {
  workspaceId: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface ConfigurationUpdateRequest {
  workspaceId: string;
  configCategory: string;
  configKey: string;
  configValue: any;
  environment: 'development' | 'staging' | 'production';
  updatedBy: string;
  changeReason?: string;
  changeDescription?: string;
}

export interface ConfigurationRollbackRequest {
  workspaceId: string;
  configCategory: string;
  configKey: string;
  targetVersion: number;
  environment: 'development' | 'staging' | 'production';
  rolledBackBy: string;
  rollbackReason?: string;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ConfigurationDeploymentRequest {
  workspaceId: string;
  targetSolutionId: string;
  environment: 'development' | 'staging' | 'production';
  configCategories?: string[]; // 특정 카테고리만 배포하는 경우
  deployedBy: string;
  deploymentReason?: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  workspace_type: 'KMS' | 'ADVISOR' | 'COMMON';
  template_config: any;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationCategory {
  category: string;
  display_name: string;
  description: string;
  workspace_types: ('KMS' | 'ADVISOR')[];
  required_keys: string[];
  optional_keys: string[];
  validation_schema?: any;
}

export interface ConfigurationVersion {
  version: number;
  config_value: any;
  created_by?: string;
  created_at: string;
  is_active: boolean;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
}

// API 응답 타입들
export interface GetConfigurationResponse {
  success: boolean;
  data?: WorkspaceConfiguration[];
  error?: string;
}

export interface UpdateConfigurationResponse {
  success: boolean;
  data?: {
    configurationId: string;
    version: number;
  };
  error?: string;
}

export interface GetConfigurationHistoryResponse {
  success: boolean;
  data?: ConfigurationHistory[];
  total?: number;
  error?: string;
}

export interface ValidateConfigurationResponse {
  success: boolean;
  data?: ConfigurationValidationResult;
  error?: string;
}

export interface DeployConfigurationResponse {
  success: boolean;
  data?: {
    deploymentId: string;
  };
  error?: string;
}

export interface GetConfigurationTemplatesResponse {
  success: boolean;
  data?: ConfigurationTemplate[];
  error?: string;
}

// 프론트엔드용 설정 구조
export interface WorkspaceConfigurationTree {
  [category: string]: {
    [key: string]: {
      value: any;
      version: number;
      isActive: boolean;
      deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
      lastUpdated: string;
      updatedBy?: string;
    };
  };
}

export interface ConfigurationDiff {
  category: string;
  key: string;
  changeType: 'added' | 'modified' | 'deleted';
  oldValue?: any;
  newValue?: any;
  version: {
    from: number;
    to: number;
  };
}

export interface ConfigurationExport {
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'KMS' | 'ADVISOR';
  environment: 'development' | 'staging' | 'production';
  exportedAt: string;
  exportedBy: string;
  configurations: {
    [category: string]: {
      [key: string]: any;
    };
  };
  metadata: {
    totalConfigurations: number;
    categories: string[];
    version: string;
  };
}

export interface ConfigurationImport {
  workspaceId: string;
  environment: 'development' | 'staging' | 'production';
  configurations: {
    [category: string]: {
      [key: string]: any;
    };
  };
  importedBy: string;
  overwriteExisting: boolean;
  validateBeforeImport: boolean;
}

// 설정 변경 요청 배치 타입
export interface BulkConfigurationUpdateRequest {
  workspaceId: string;
  environment: 'development' | 'staging' | 'production';
  updates: Array<{
    configCategory: string;
    configKey: string;
    configValue: any;
  }>;
  updatedBy: string;
  changeReason?: string;
  changeDescription?: string;
}

// 설정 비교 요청
export interface ConfigurationCompareRequest {
  workspaceId: string;
  sourceEnvironment: 'development' | 'staging' | 'production';
  targetEnvironment: 'development' | 'staging' | 'production';
  categories?: string[];
}

export interface ConfigurationCompareResponse {
  success: boolean;
  data?: {
    differences: ConfigurationDiff[];
    summary: {
      added: number;
      modified: number;
      deleted: number;
      identical: number;
    };
  };
  error?: string;
}

// 설정 동기화 요청
export interface ConfigurationSyncRequest {
  workspaceId: string;
  sourceEnvironment: 'development' | 'staging' | 'production';
  targetEnvironment: 'development' | 'staging' | 'production';
  categories?: string[];
  syncedBy: string;
  syncReason?: string;
}
