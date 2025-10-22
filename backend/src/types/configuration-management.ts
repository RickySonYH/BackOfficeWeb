// [advice from AI] 구조화된 설정 관리 타입 정의

export interface WorkspaceConfiguration {
  id: string;
  workspace_id: string;
  config_category: string;
  config_key: string;
  config_value: any;
  environment: 'development' | 'staging' | 'production';
  version: number;
  is_active: boolean;
  validation_schema?: any;
  is_validated: boolean;
  validation_errors?: string[];
  deployed_to_solution: boolean;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
  deployed_at?: string;
  created_by?: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationHistory {
  id: string;
  workspace_id: string;
  configuration_id?: string;
  change_type: 'create' | 'update' | 'delete' | 'rollback';
  config_category: string;
  config_key: string;
  old_value?: any;
  new_value: any;
  change_reason?: string;
  change_description?: string;
  impact_assessment?: any;
  rollback_available: boolean;
  changed_by: string;
  changed_by_username?: string;
  change_approved_by?: string;
  approved_by_username?: string;
  changed_at: string;
  applied_at?: string;
  deployed_to_solutions?: string[];
  deployment_completed: boolean;
}

// 요청/응답 타입들

export interface ConfigurationRequest {
  workspace_id: string;
  config_category: string;
  config_key: string;
  config_value: any;
  environment?: 'development' | 'staging' | 'production';
  validation_schema?: any;
  change_reason?: string;
  change_description?: string;
  created_by: string;
}

export interface ConfigurationUpdateRequest {
  configuration_id: string;
  config_value: any;
  validation_schema?: any;
  change_reason?: string;
  change_description?: string;
  impact_assessment?: any;
  updated_by: string;
  approved_by?: string;
}

export interface ConfigurationRollbackRequest {
  workspace_id: string;
  config_category: string;
  config_key: string;
  target_version: number;
  environment?: 'development' | 'staging' | 'production';
  rollback_reason: string;
  impact_assessment?: any;
  rolled_back_by: string;
}

export interface ConfigurationHistoryFilter {
  category?: string;
  config_key?: string;
  change_type?: 'create' | 'update' | 'delete' | 'rollback';
  changed_by?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface ConfigurationValidationResult {
  is_valid: boolean;
  errors?: string[];
}

export interface ConfigurationDeploymentResult {
  success: boolean;
  deployed_solutions: string[];
  failed_solutions: string[];
}

// 설정 카테고리별 특화 타입들

export interface VectorDbConfig {
  dimension: number;
  similarity_metric: 'cosine' | 'euclidean' | 'dot_product';
  index_type: 'hnsw' | 'ivf';
  index_params?: {
    m?: number;
    ef_construction?: number;
    ef_search?: number;
    nlist?: number;
    nprobe?: number;
  };
  connection_params?: {
    host: string;
    port: number;
    database: string;
    collection: string;
    username?: string;
    password?: string;
  };
}

export interface ModelParams {
  model_name: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  system_prompt?: string;
}

export interface SearchConfig {
  max_results: number;
  similarity_threshold: number;
  enable_semantic_search: boolean;
  enable_hybrid_search?: boolean;
  keyword_weight?: number;
  semantic_weight?: number;
  rerank_enabled?: boolean;
  rerank_model?: string;
}

export interface DataProcessingConfig {
  chunk_size: number;
  chunk_overlap: number;
  enable_preprocessing: boolean;
  supported_formats: string[];
  text_extraction_params?: {
    remove_headers?: boolean;
    remove_footers?: boolean;
    preserve_tables?: boolean;
    preserve_images?: boolean;
  };
  embedding_params?: {
    model_name: string;
    batch_size: number;
    max_sequence_length: number;
  };
}

export interface UiSettings {
  theme: 'light' | 'dark';
  language: string;
  show_confidence_scores: boolean;
  enable_quick_replies?: boolean;
  max_chat_history?: number;
  auto_save_interval?: number;
  notification_settings?: {
    enable_sound: boolean;
    enable_desktop: boolean;
    enable_email: boolean;
  };
}

export interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  variables?: string[];
  personalization?: boolean;
  dynamic?: boolean;
  conditions?: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    intent?: string[];
    confidence_threshold?: number;
  };
}

export interface EscalationRule {
  id: string;
  name: string;
  condition: string;
  action: 'human_handoff' | 'priority_escalation' | 'suggest_alternatives' | 'summary_and_escalate';
  message: string;
  priority: number;
  enabled: boolean;
  conditions?: {
    sentiment_threshold?: number;
    confidence_threshold?: number;
    keywords?: string[];
    session_duration?: number;
    interaction_count?: number;
  };
}

export interface ConversationConfig {
  max_context_length: number;
  enable_context_memory: boolean;
  session_timeout: number;
  context_window_strategy: 'sliding' | 'truncate' | 'summarize';
  memory_retention_days?: number;
  enable_conversation_summary?: boolean;
  summary_trigger_threshold?: number;
}

export interface AutoResponseSettings {
  enabled: boolean;
  confidence_threshold: number;
  max_auto_responses: number;
  enable_learning?: boolean;
  feedback_threshold?: number;
  escalation_triggers?: {
    low_confidence_count: number;
    negative_feedback_count: number;
    session_duration_minutes: number;
  };
}

// API 응답 타입들

export interface ConfigurationListResponse {
  success: boolean;
  data: WorkspaceConfiguration[];
  total: number;
  error?: string;
}

export interface ConfigurationDetailResponse {
  success: boolean;
  data?: WorkspaceConfiguration;
  error?: string;
}

export interface ConfigurationHistoryResponse {
  success: boolean;
  data: ConfigurationHistory[];
  total: number;
  error?: string;
}

export interface ConfigurationValidationResponse {
  success: boolean;
  data?: ConfigurationValidationResult;
  error?: string;
}

export interface ConfigurationDeploymentResponse {
  success: boolean;
  data?: ConfigurationDeploymentResult;
  error?: string;
}

// 설정 템플릿 타입들

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workspace_type: 'KMS' | 'ADVISOR' | 'BOTH';
  template_config: any;
  validation_schema?: any;
  is_system_template: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationTemplateRequest {
  name: string;
  description: string;
  category: string;
  workspace_type: 'KMS' | 'ADVISOR' | 'BOTH';
  template_config: any;
  validation_schema?: any;
  created_by: string;
}

// 설정 비교 및 차이점 분석

export interface ConfigurationDiff {
  config_key: string;
  old_value: any;
  new_value: any;
  change_type: 'added' | 'modified' | 'removed';
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

export interface ConfigurationComparisonResult {
  workspace_id: string;
  from_version: number;
  to_version: number;
  differences: ConfigurationDiff[];
  total_changes: number;
  impact_summary: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// 설정 내보내기/가져오기

export interface ConfigurationExportRequest {
  workspace_id: string;
  categories?: string[];
  environment?: string;
  include_history?: boolean;
  format: 'json' | 'yaml' | 'csv';
}

export interface ConfigurationImportRequest {
  workspace_id: string;
  configurations: any[];
  environment?: string;
  overwrite_existing?: boolean;
  validate_before_import?: boolean;
  imported_by: string;
}

export interface ConfigurationExportResult {
  workspace_id: string;
  export_format: string;
  configurations: WorkspaceConfiguration[];
  history?: ConfigurationHistory[];
  exported_at: string;
  exported_by?: string;
}

export interface ConfigurationImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  errors?: string[];
  imported_configurations?: string[];
}
