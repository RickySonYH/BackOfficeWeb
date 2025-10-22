import api from './api';
import { 
  Workspace, 
  WorkspaceFormData, 
  WorkspaceConfigUpdateData,
  WorkspacesResponse, 
  WorkspaceResponse,
  WorkspaceType,
  WorkspaceStatus,
  WorkspaceTypeDescription,
  WorkspaceStatusDisplay,
  TenantWorkspaceMapping,
  KmsConfig,
  AdvisorConfig
} from '../types/workspace';

export class WorkspaceService {
  // 워크스페이스 목록 조회 (페이지네이션 및 테넌트 필터 지원)
  async getWorkspaces(
    page: number = 1, 
    limit: number = 10, 
    tenantId?: string
  ): Promise<WorkspacesResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (tenantId) {
        params.append('tenant_id', tenantId);
      }

      const response = await api.get(`/api/workspaces?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces' 
      };
    }
  }

  // 단일 워크스페이스 조회
  async getWorkspaceById(workspaceId: string): Promise<WorkspaceResponse> {
    try {
      const response = await api.get(`/api/workspaces/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch workspace' 
      };
    }
  }

  // 워크스페이스 생성
  async createWorkspace(workspaceData: WorkspaceFormData): Promise<WorkspaceResponse> {
    try {
      const response = await api.post('/api/workspaces', workspaceData);
      return response.data;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create workspace' 
      };
    }
  }

  // 워크스페이스 설정 업데이트
  async updateWorkspaceConfig(workspaceId: string, configData: WorkspaceConfigUpdateData): Promise<WorkspaceResponse> {
    try {
      const response = await api.put(`/api/workspaces/${workspaceId}/config`, configData);
      return response.data;
    } catch (error) {
      console.error('Failed to update workspace config:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update workspace config' 
      };
    }
  }

  // 테넌트별 워크스페이스 맵핑 조회
  async getTenantWorkspaceMapping(tenantId: string): Promise<{
    success: boolean;
    data?: TenantWorkspaceMapping;
    error?: string;
  }> {
    try {
      const response = await api.get(`/api/tenants/${tenantId}/workspace-mapping`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tenant workspace mapping:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tenant workspace mapping' 
      };
    }
  }

  // 테넌트별 워크스페이스 맵핑 업데이트
  async updateTenantWorkspaceMapping(tenantId: string, mappingData: any): Promise<{
    success: boolean;
    data?: TenantWorkspaceMapping;
    error?: string;
  }> {
    try {
      const response = await api.put(`/api/tenants/${tenantId}/workspace-mapping`, mappingData);
      return response.data;
    } catch (error) {
      console.error('Failed to update tenant workspace mapping:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update tenant workspace mapping' 
      };
    }
  }

  // 워크스페이스 타입 설명 정보
  getWorkspaceTypeDescriptions(): WorkspaceTypeDescription[] {
    return [
      {
        type: 'kms',
        name: 'KMS (지식 관리)',
        description: '문서 기반 지식 검색 및 RAG 시스템',
        icon: '📚',
        color: 'bg-blue-100 text-blue-800'
      },
      {
        type: 'advisor',
        name: '상담 어드바이저',
        description: '상담 시나리오 및 응답 템플릿 관리',
        icon: '💬',
        color: 'bg-green-100 text-green-800'
      }
    ];
  }

  // 워크스페이스 타입별 표시 정보
  getWorkspaceTypeDisplay(type: WorkspaceType): { text: string; color: string; icon: string } {
    const typeMap = {
      kms: { text: 'KMS', color: 'bg-blue-100 text-blue-800', icon: '📚' },
      advisor: { text: '어드바이저', color: 'bg-green-100 text-green-800', icon: '💬' }
    };
    
    return typeMap[type] || { text: '알 수 없음', color: 'bg-gray-100 text-gray-800', icon: '❓' };
  }

  // 워크스페이스 상태 표시
  getWorkspaceStatusDisplay(status: WorkspaceStatus): WorkspaceStatusDisplay {
    const statusMap: Record<WorkspaceStatus, WorkspaceStatusDisplay> = {
      active: { status, text: '활성', color: 'bg-success-100 text-success-800' },
      inactive: { status, text: '비활성', color: 'bg-red-100 text-red-800' },
      configuring: { status, text: '설정 중', color: 'bg-yellow-100 text-yellow-800' }
    };
    
    return statusMap[status] || { status, text: '알 수 없음', color: 'bg-gray-100 text-gray-800' };
  }

  // 날짜 포맷팅
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  // KMS 기본 설정 생성
  createDefaultKmsConfig(): KmsConfig {
    return {
      categories: [
        {
          id: 'cat_001',
          name: '일반 문의',
          description: '일반적인 고객 문의사항',
          order: 1
        },
        {
          id: 'cat_002',
          name: '기술 지원',
          description: '기술적인 문제 해결',
          order: 2
        }
      ],
      searchParams: {
        similarityThreshold: 0.75,
        topK: 5,
        maxResults: 10
      },
      ragConfig: {
        vectorDb: {
          provider: 'pinecone',
          indexName: 'default-index'
        },
        embeddingModel: {
          provider: 'openai',
          model: 'text-embedding-ada-002',
          dimension: 1536
        },
        chunkSize: 1000,
        chunkOverlap: 200
      }
    };
  }

  // 어드바이저 기본 설정 생성
  createDefaultAdvisorConfig(): AdvisorConfig {
    return {
      scenarios: [
        {
          id: 'scenario_001',
          name: '상품 문의',
          description: '상품에 대한 일반적인 문의',
          category: '일반',
          triggers: ['상품', '제품', '구매'],
          order: 1
        },
        {
          id: 'scenario_002',
          name: '기술 지원',
          description: '기술적인 문제 해결',
          category: '기술',
          triggers: ['오류', '문제', '작동'],
          order: 2
        }
      ],
      responseTemplates: [
        {
          category: '인사',
          templates: [
            {
              id: 'greeting_001',
              name: '기본 인사',
              content: '안녕하세요! {{customer_name}}님, 무엇을 도와드릴까요?',
              variables: ['customer_name']
            }
          ]
        },
        {
          category: '마무리',
          templates: [
            {
              id: 'closing_001',
              name: '기본 마무리',
              content: '추가로 궁금한 사항이 있으시면 언제든 문의해주세요.',
              variables: []
            }
          ]
        }
      ],
      triggerConditions: {
        keywords: ['문의', '질문', '도움'],
        sentiment: 'any',
        contextRules: []
      }
    };
  }

  // 설정 유효성 검증
  validateKmsConfig(config: KmsConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.categories || config.categories.length === 0) {
      errors.push('최소 하나의 카테고리가 필요합니다.');
    }

    if (config.searchParams.similarityThreshold < 0 || config.searchParams.similarityThreshold > 1) {
      errors.push('유사도 임계값은 0과 1 사이의 값이어야 합니다.');
    }

    if (config.searchParams.topK < 1 || config.searchParams.topK > 100) {
      errors.push('Top-K 값은 1과 100 사이의 값이어야 합니다.');
    }

    if (!config.ragConfig.vectorDb.provider) {
      errors.push('벡터 DB 제공자를 선택해주세요.');
    }

    if (!config.ragConfig.embeddingModel.provider) {
      errors.push('임베딩 모델 제공자를 선택해주세요.');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateAdvisorConfig(config: AdvisorConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.scenarios || config.scenarios.length === 0) {
      errors.push('최소 하나의 시나리오가 필요합니다.');
    }

    if (!config.responseTemplates || config.responseTemplates.length === 0) {
      errors.push('최소 하나의 응답 템플릿 카테고리가 필요합니다.');
    }

    config.responseTemplates.forEach((category, categoryIndex) => {
      if (!category.templates || category.templates.length === 0) {
        errors.push(`카테고리 "${category.category}"에 최소 하나의 템플릿이 필요합니다.`);
      }
    });

    if (!config.triggerConditions.keywords || config.triggerConditions.keywords.length === 0) {
      errors.push('최소 하나의 트리거 키워드가 필요합니다.');
    }

    return { isValid: errors.length === 0, errors };
  }
}

// 싱글톤 워크스페이스 서비스 인스턴스
export const workspaceService = new WorkspaceService();
