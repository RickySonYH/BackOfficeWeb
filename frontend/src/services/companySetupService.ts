// [advice from AI] 회사 완전 설정 API 서비스

import api from './api';
import { CreateCompanyWithSetupRequest, CompleteCompanySetupResponse } from '../types/company-setup';

export const companySetupService = {
  /**
   * 완전한 회사 설정 생성
   */
  async createCompleteCompanySetup(data: CreateCompanyWithSetupRequest): Promise<CompleteCompanySetupResponse> {
    try {
      const response = await api.post('/api/companies/complete-setup', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create complete company setup:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to create complete company setup'
      );
    }
  },

  /**
   * 사업자번호 중복 확인
   */
  async checkBusinessNumberDuplicate(businessNumber: string): Promise<{ isDuplicate: boolean }> {
    try {
      const response = await api.get(`/api/companies/check-business-number/${businessNumber}`);
      return { isDuplicate: response.data.exists };
    } catch (error: any) {
      console.warn('Business number check failed, assuming not duplicate:', error);
      return { isDuplicate: false };
    }
  },

  /**
   * 이메일 중복 확인
   */
  async checkEmailDuplicate(email: string): Promise<{ isDuplicate: boolean }> {
    try {
      const response = await api.get(`/api/users/check-email/${email}`);
      return { isDuplicate: response.data.exists };
    } catch (error: any) {
      console.warn('Email check failed, assuming not duplicate:', error);
      return { isDuplicate: false };
    }
  },

  /**
   * 사용자명 중복 확인
   */
  async checkUsernameDuplicate(username: string): Promise<{ isDuplicate: boolean }> {
    try {
      const response = await api.get(`/api/users/check-username/${username}`);
      return { isDuplicate: response.data.exists };
    } catch (error: any) {
      console.warn('Username check failed, assuming not duplicate:', error);
      return { isDuplicate: false };
    }
  },

  /**
   * 사용 가능한 솔루션 목록 조회
   */
  async getAvailableSolutions(): Promise<Array<{
    id: string;
    name: string;
    version: string;
    status: string;
    maxTenants: number;
    currentTenants: number;
    availableSlots: number;
  }>> {
    try {
      const response = await api.get('/api/solutions/available');
      return response.data.data || [];
    } catch (error: any) {
      console.warn('Failed to fetch available solutions, using mock data:', error);
      // Mock 데이터 반환
      return [
        {
          id: '1',
          name: 'AICC Solution v2.1',
          version: '2.1.0',
          status: 'active',
          maxTenants: 10,
          currentTenants: 3,
          availableSlots: 7
        },
        {
          id: '2',
          name: 'AICC Solution v2.0',
          version: '2.0.5',
          status: 'active',
          maxTenants: 8,
          currentTenants: 5,
          availableSlots: 3
        }
      ];
    }
  },

  /**
   * 폼 데이터 검증
   */
  validateCompanyInfo(data: {
    name: string;
    businessNumber: string;
    contractDate: string;
    status: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length === 0) {
      errors.name = '회사명을 입력해주세요.';
    } else if (data.name.trim().length < 2) {
      errors.name = '회사명은 2자 이상이어야 합니다.';
    } else if (data.name.trim().length > 100) {
      errors.name = '회사명은 100자 이하여야 합니다.';
    }

    if (!data.businessNumber || data.businessNumber.trim().length === 0) {
      errors.businessNumber = '사업자번호를 입력해주세요.';
    } else if (!/^\d{3}-\d{2}-\d{5}$/.test(data.businessNumber.trim())) {
      errors.businessNumber = '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
    }

    if (!data.contractDate || data.contractDate.trim().length === 0) {
      errors.contractDate = '계약일을 선택해주세요.';
    } else {
      const contractDate = new Date(data.contractDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (contractDate > today) {
        errors.contractDate = '계약일은 오늘 이전이어야 합니다.';
      }
    }

    if (!data.status || !['active', 'inactive', 'suspended'].includes(data.status)) {
      errors.status = '올바른 상태를 선택해주세요.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateAdminAccount(data: {
    email: string;
    username: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.email || data.email.trim().length === 0) {
      errors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!data.username || data.username.trim().length === 0) {
      errors.username = '사용자명을 입력해주세요.';
    } else if (data.username.trim().length < 3) {
      errors.username = '사용자명은 3자 이상이어야 합니다.';
    } else if (data.username.trim().length > 50) {
      errors.username = '사용자명은 50자 이하여야 합니다.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username.trim())) {
      errors.username = '사용자명은 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능합니다.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateWorkspaceConfig(data: {
    createKMS: boolean;
    createAdvisor: boolean;
    kmsSettings?: any;
    advisorSettings?: any;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.createKMS && !data.createAdvisor) {
      errors.workspaces = '최소 하나의 워크스페이스는 생성해야 합니다.';
    }

    if (data.createKMS && data.kmsSettings) {
      if (data.kmsSettings.maxResults && (data.kmsSettings.maxResults < 1 || data.kmsSettings.maxResults > 50)) {
        errors.kmsMaxResults = '최대 결과 수는 1-50 사이여야 합니다.';
      }
      if (data.kmsSettings.similarityThreshold && (data.kmsSettings.similarityThreshold < 0 || data.kmsSettings.similarityThreshold > 1)) {
        errors.kmsSimilarityThreshold = '유사도 임계값은 0-1 사이여야 합니다.';
      }
    }

    if (data.createAdvisor && data.advisorSettings) {
      if (data.advisorSettings.confidenceThreshold && (data.advisorSettings.confidenceThreshold < 0 || data.advisorSettings.confidenceThreshold > 1)) {
        errors.advisorConfidenceThreshold = '신뢰도 임계값은 0-1 사이여야 합니다.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateSolutionAssignment(data: {
    autoAssign: boolean;
    resourceRequirements?: {
      cpu_cores: number;
      memory_gb: number;
      storage_gb: number;
    };
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (data.autoAssign && data.resourceRequirements) {
      if (data.resourceRequirements.cpu_cores <= 0) {
        errors.cpuCores = 'CPU 코어 수는 0보다 커야 합니다.';
      }
      if (data.resourceRequirements.memory_gb <= 0) {
        errors.memoryGb = '메모리 크기는 0보다 커야 합니다.';
      }
      if (data.resourceRequirements.storage_gb <= 0) {
        errors.storageGb = '스토리지 크기는 0보다 커야 합니다.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};
