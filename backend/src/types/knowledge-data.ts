// [advice from AI] 지식 데이터 관리 타입 정의

export interface KnowledgeDocument {
  id: string;
  workspace_id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category_id?: string;
  tags: string[];
  metadata: any;
  extracted_text?: string;
  status: 'uploaded' | 'text_extracted' | 'processed' | 'processing_failed' | 'indexed';
  chunk_count?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface KnowledgeCategory {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  document_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentProcessingJob {
  id: string;
  document_id: string;
  workspace_id: string;
  job_type: 'text_extraction' | 'chunking' | 'vectorization' | 'indexing' | 'full_processing';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processing_config: any;
  processing_result?: any;
  error_message?: string;
  progress_percentage?: number;
  created_by: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  workspace_id: string;
  chunk_index: number;
  content: string;
  chunk_size: number;
  metadata: any;
  embedding_vector?: number[];
  vector_generated_at?: string;
  created_at: string;
}

export interface KnowledgeUploadRequest {
  workspaceId: string;
  originalName: string;
  fileBuffer: Buffer;
  fileType: string;
  fileSize: number;
  title?: string;
  categoryId?: string;
  tags?: string[];
  metadata?: any;
  uploadedBy: string;
}

export interface KnowledgeSearchRequest {
  workspaceId: string;
  query: string;
  limit?: number;
  offset?: number;
  categoryId?: string;
  tags?: string[];
  similarityThreshold?: number;
  includeChunks?: boolean;
}

export interface DocumentProcessingResult {
  documentId: string;
  processingJobId: string;
  status: 'success' | 'partial' | 'failed';
  chunksCreated: number;
  vectorsGenerated: number;
  indexUpdated: boolean;
  processingTime: number;
  errors?: string[];
}

export interface VectorIndexRequest {
  workspaceId: string;
  documentIds?: string[];
  rebuildIndex: boolean;
  indexedBy: string;
}

export interface KnowledgeExportRequest {
  workspaceId: string;
  documentIds?: string[];
  categoryIds?: string[];
  includeVectors: boolean;
  includeMetadata: boolean;
  format: 'json' | 'csv' | 'xml';
  exportedBy: string;
}

export interface KnowledgeImportRequest {
  workspaceId: string;
  importData: any;
  format: 'json' | 'csv' | 'xml';
  overwriteExisting: boolean;
  validateBeforeImport: boolean;
  importedBy: string;
}

// API 응답 타입들
export interface UploadKnowledgeResponse {
  success: boolean;
  data?: {
    documentId: string;
    processingJobId: string;
  };
  error?: string;
}

export interface SearchKnowledgeResponse {
  success: boolean;
  data?: {
    documents: Array<{
      document: KnowledgeDocument;
      chunks: Array<{
        chunk: DocumentChunk;
        similarity: number;
      }>;
      relevanceScore: number;
    }>;
    total: number;
    searchTime: number;
  };
  error?: string;
}

export interface GetKnowledgeDocumentsResponse {
  success: boolean;
  data?: {
    documents: KnowledgeDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

export interface GetProcessingStatusResponse {
  success: boolean;
  data?: DocumentProcessingJob;
  error?: string;
}

export interface DeleteKnowledgeDocumentResponse {
  success: boolean;
  error?: string;
}

// 지식 베이스 통계
export interface KnowledgeBaseStats {
  totalDocuments: number;
  processedDocuments: number;
  totalChunks: number;
  totalVectors: number;
  categoriesCount: number;
  averageProcessingTime: number;
  lastProcessedAt?: string;
  storageUsed: number; // bytes
  indexSize: number; // bytes
}

// 지식 검색 필터
export interface KnowledgeSearchFilters {
  categories?: string[];
  tags?: string[];
  fileTypes?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  status?: ('uploaded' | 'processed' | 'processing_failed')[];
  uploadedBy?: string[];
}

// 지식 문서 업데이트 요청
export interface UpdateKnowledgeDocumentRequest {
  documentId: string;
  title?: string;
  categoryId?: string;
  tags?: string[];
  metadata?: any;
  updatedBy: string;
}

// 배치 처리 요청
export interface BatchProcessingRequest {
  workspaceId: string;
  documentIds: string[];
  operation: 'reprocess' | 'reindex' | 'delete' | 'move_category';
  parameters?: any;
  requestedBy: string;
}

// 지식 베이스 백업/복원
export interface KnowledgeBackupRequest {
  workspaceId: string;
  includeFiles: boolean;
  includeVectors: boolean;
  backupName?: string;
  requestedBy: string;
}

export interface KnowledgeRestoreRequest {
  workspaceId: string;
  backupId: string;
  overwriteExisting: boolean;
  requestedBy: string;
}

// 지식 문서 버전 관리
export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string;
  file_path: string;
  file_size: number;
  change_description?: string;
  created_by: string;
  created_at: string;
  is_current: boolean;
}

// 지식 문서 공유
export interface DocumentShareRequest {
  documentId: string;
  shareType: 'public' | 'workspace' | 'user';
  sharedWith?: string[]; // user IDs for user share type
  permissions: ('read' | 'download' | 'comment')[];
  expiresAt?: string;
  sharedBy: string;
}

// 지식 문서 댓글/피드백
export interface DocumentFeedback {
  id: string;
  document_id: string;
  user_id: string;
  feedback_type: 'rating' | 'comment' | 'correction' | 'suggestion';
  content: string;
  rating?: number; // 1-5
  is_helpful?: boolean;
  created_at: string;
  updated_at: string;
}

// 지식 문서 사용 통계
export interface DocumentUsageStats {
  document_id: string;
  view_count: number;
  search_count: number;
  download_count: number;
  share_count: number;
  last_accessed_at?: string;
  popular_queries: string[];
  user_ratings: {
    average: number;
    count: number;
    distribution: { [rating: number]: number };
  };
}

// 지식 문서 자동 분류
export interface AutoClassificationRequest {
  documentId: string;
  useAI: boolean;
  confidenceThreshold: number;
  suggestCategories: boolean;
  suggestTags: boolean;
}

export interface AutoClassificationResult {
  documentId: string;
  suggestedCategory?: {
    categoryId: string;
    confidence: number;
  };
  suggestedTags: Array<{
    tag: string;
    confidence: number;
  }>;
  contentSummary?: string;
  keyTopics: string[];
  language: string;
  processingTime: number;
}
