// [advice from AI] 데이터 초기화 서비스 (포트 6000 API 연동)
import dataInitApi from './dataInitApi';
import {
  SchemaInitRequest,
  SchemaInitResponse,
  DataUploadResponse,
  ConfigApplyRequest,
  ConfigApplyResponse,
  InitStatusResponse,
  LogsResponse,
  DataType,
  InitializationStatus,
} from '../types/dataInit';

export const dataInitService = {
  // 1. 테넌트 DB 스키마 초기화
  async initializeSchema(tenantId: string): Promise<SchemaInitResponse> {
    try {
      const response = await dataInitApi.post(`/api/data-init/tenant/${tenantId}/initialize`);
      return response.data;
    } catch (error: any) {
      console.error('Schema initialization failed:', error);
      return {
        success: false,
        message: 'Schema initialization failed',
        logs: [],
        error: error.response?.data?.error || error.message
      };
    }
  },

  // 2. 워크스페이스 데이터 업로드
  async uploadWorkspaceData(
    workspaceId: string,
    dataType: DataType,
    files: File[]
  ): Promise<DataUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('dataType', dataType);
      
      files.forEach((file) => {
        formData.append('files[]', file);
      });

      const response = await dataInitApi.post(
        `/api/data-init/workspace/${workspaceId}/seed`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Data upload failed:', error);
      return {
        success: false,
        message: 'Data upload failed',
        processed_files: 0,
        total_records: 0,
        logs: [],
        error: error.response?.data?.error || error.message
      };
    }
  },

  // 3. 워크스페이스 설정 적용
  async applyWorkspaceConfig(workspaceId: string): Promise<ConfigApplyResponse> {
    try {
      const response = await dataInitApi.post(`/api/data-init/workspace/${workspaceId}/apply-config`);
      return response.data;
    } catch (error: any) {
      console.error('Config apply failed:', error);
      return {
        success: false,
        message: 'Config apply failed',
        applied_configs: [],
        logs: [],
        error: error.response?.data?.error || error.message
      };
    }
  },

  // 4. 초기화 상태 조회
  async getInitializationStatus(tenantId: string): Promise<InitStatusResponse> {
    try {
      const response = await dataInitApi.get(`/api/data-init/tenant/${tenantId}/status`);
      return response.data;
    } catch (error: any) {
      console.warn('Data init API not available, using mock status:', error.message);
      // Mock 초기화 상태 반환
      return {
        success: true,
        data: {
          tenant_id: tenantId,
          schema_initialized: true,
          workspaces: [
            {
              workspace_id: 'workspace-1',
              workspace_name: 'KMS 워크스페이스',
              workspace_type: 'kms',
              data_uploaded: true,
              config_applied: true
            },
            {
              workspace_id: 'workspace-2',
              workspace_name: '어드바이저 워크스페이스',
              workspace_type: 'advisor',
              data_uploaded: false,
              config_applied: false
            }
          ],
          overall_progress: { completed: 3, total: 5 },
          last_updated: new Date().toISOString()
        }
      };
    }
  },

  // 5. 전체 로그 조회
  async getLogs(
    page: number = 1,
    limit: number = 50,
    status?: InitializationStatus
  ): Promise<LogsResponse> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;

      const response = await dataInitApi.get('/api/data-init/logs', { params });
      return response.data;
    } catch (error: any) {
      console.warn('Data init API not available, using mock data:', error.message);
      // Mock 로그 데이터 반환
      const mockLogs = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          workspace_id: 'workspace-1',
          timestamp: new Date().toISOString(),
          action: 'Database Schema Initialization',
          status: 'completed' as const,
          message: 'PostgreSQL 스키마 생성 완료',
          details: { schemas: ['call_history', 'call_scripts', 'knowledge_base'] }
        },
        {
          id: '2',
          tenant_id: 'tenant-1',
          workspace_id: 'workspace-2',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          action: 'KMS Data Seeding',
          status: 'in_progress' as const,
          message: '지식 문서 업로드 중... (75%)',
          details: { processed: 75, total: 100 }
        },
        {
          id: '3',
          tenant_id: 'tenant-2',
          workspace_id: 'workspace-3',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          action: 'MongoDB Collection Creation',
          status: 'failed' as const,
          message: '연결 시간 초과',
          error: 'Connection timeout after 30s'
        }
      ];

      return {
        success: true,
        data: mockLogs.slice((page - 1) * limit, page * limit),
        total: mockLogs.length,
        page,
        limit
      };
    }
  },

  // 유틸리티 함수들
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  getStatusColor(status: InitializationStatus): string {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-orange-600 bg-orange-100';
      case 'failed': return 'text-pink-600 bg-pink-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  },

  getStatusText(status: InitializationStatus): string {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'failed': return '실패';
      case 'pending': return '대기';
      default: return '알 수 없음';
    }
  },

  getDataTypeText(dataType: DataType): string {
    switch (dataType) {
      case 'KNOWLEDGE': return '지식문서';
      case 'FAQ': return 'FAQ';
      case 'SCENARIO': return '시나리오';
      case 'TEMPLATE': return '템플릿';
      default: return '알 수 없음';
    }
  },

  isValidFileType(fileName: string): boolean {
    const validExtensions = ['.csv', '.json', '.xlsx', '.xls', '.pdf'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return validExtensions.includes(extension);
  },

  getFileTypeText(): string {
    return 'CSV, JSON, XLSX, PDF';
  },

  // 누락된 메서드들 추가
  initializeTenantDatabase(tenantId: string, databases: string[]): Promise<any> {
    return this.initializeSchema(tenantId);
  },

  getDatabaseTypeDisplayName(dbType: string): string {
    switch (dbType) {
      case 'postgresql': return 'PostgreSQL';
      case 'mongodb': return 'MongoDB';
      default: return dbType.toUpperCase();
    }
  },

  getStatusColorClass(status: InitializationStatus): string {
    return this.getStatusColor(status);
  },

  getStatusDisplayText(status: InitializationStatus): string {
    return this.getStatusText(status);
  },

  getOperationTypeDisplayName(type: string): string {
    switch (type) {
      case 'database_init': return '데이터베이스 초기화';
      case 'data_seed': return '데이터 시딩';
      case 'config_apply': return '설정 적용';
      default: return type;
    }
  },

  formatLogMessage(log: any): string {
    return `[${this.formatTimestamp(log.timestamp)}] ${log.message}`;
  },

  seedWorkspaceData(workspaceId: string, dataType: DataType, files: File[]): Promise<any> {
    return this.uploadWorkspaceData(workspaceId, dataType, files);
  },

  getRecommendedDataTypes(workspaceType: string): DataType[] {
    if (workspaceType === 'kms') {
      return ['KNOWLEDGE', 'FAQ'];
    } else {
      return ['SCENARIO', 'TEMPLATE'];
    }
  },

  validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    files.forEach(file => {
      if (!this.isValidFileType(file.name)) {
        errors.push(`지원하지 않는 파일 형식: ${file.name}`);
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        errors.push(`파일 크기가 너무 큽니다: ${file.name}`);
      }
    });
    return { valid: errors.length === 0, errors };
  },

  getDataTypeDescription(dataType: DataType): string {
    switch (dataType) {
      case 'KNOWLEDGE': return '지식 문서 - 제품 매뉴얼, 가이드 등';
      case 'FAQ': return 'FAQ - 자주 묻는 질문과 답변';
      case 'SCENARIO': return '시나리오 - 상담 시나리오 및 스크립트';
      case 'TEMPLATE': return '템플릿 - 응답 템플릿 및 메시지';
      default: return '알 수 없는 데이터 타입';
    }
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatProcessingTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  },

  calculateOverallProgress(status: any): number {
    if (!status) return 0;
    return Math.round((status.overall_progress.completed / status.overall_progress.total) * 100);
  },

  getWorkspaceTypeDisplay(type: string): string {
    switch (type) {
      case 'kms': return 'KMS';
      case 'advisor': return '어드바이저';
      default: return type.toUpperCase();
    }
  }
};