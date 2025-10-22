// [advice from AI] 데이터 초기화 관련 타입 정의

export type InitializationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type DataType = 'KNOWLEDGE' | 'FAQ' | 'SCENARIO' | 'TEMPLATE';

export type DatabaseType = 'postgresql' | 'mongodb';

export interface InitializationLog {
  id: string;
  tenant_id: string;
  workspace_id?: string;
  timestamp: string;
  action: string;
  status: InitializationStatus;
  message: string;
  details?: any;
  error?: string;
}

export interface TenantInitStatus {
  tenant_id: string;
  schema_initialized: boolean;
  workspaces: WorkspaceInitStatus[];
  overall_progress: {
    completed: number;
    total: number;
  };
  last_updated: string;
}

export interface WorkspaceInitStatus {
  workspace_id: string;
  workspace_name: string;
  workspace_type: 'kms' | 'advisor';
  data_uploaded: boolean;
  config_applied: boolean;
}

export interface SchemaInitRequest {
  tenant_id: string;
}

export interface SchemaInitResponse {
  success: boolean;
  message: string;
  logs: InitializationLog[];
  error?: string;
}

export interface DataUploadRequest {
  workspace_id: string;
  data_type: DataType;
  files: File[];
}

export interface DataUploadResponse {
  success: boolean;
  message: string;
  processed_files: number;
  total_records: number;
  logs: InitializationLog[];
  error?: string;
}

export interface ConfigApplyRequest {
  workspace_id: string;
}

export interface ConfigApplyResponse {
  success: boolean;
  message: string;
  applied_configs: string[];
  logs: InitializationLog[];
  error?: string;
}

export interface InitStatusResponse {
  success: boolean;
  data: TenantInitStatus;
  error?: string;
}

export interface LogsResponse {
  success: boolean;
  data: InitializationLog[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}