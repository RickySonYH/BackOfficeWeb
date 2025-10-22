// frontend/src/services/companyService.ts

import api from './api';
import { 
  Company, 
  CompanyListResponse, 
  CompanyResponse, 
  CreateCompanyRequest, 
  UpdateCompanyRequest 
} from '../types/company';
import { ApiResponse } from '../types/common';

const COMPANIES_API_BASE_URL = '/api/companies';

export const companyService = {
  // 회사 목록 조회 (페이지네이션)
  async getCompanies(page: number = 1, limit: number = 10): Promise<ApiResponse<CompanyListResponse['data']>> {
    try {
      const response = await api.get(`${COMPANIES_API_BASE_URL}?page=${page}&limit=${limit}`);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch companies'
      };
    }
  },

  // 회사 상세 조회
  async getCompany(id: string): Promise<ApiResponse<Company>> {
    try {
      const response = await api.get(`${COMPANIES_API_BASE_URL}/${id}`);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch company'
      };
    }
  },

  // 회사 등록
  async createCompany(companyData: CreateCompanyRequest): Promise<ApiResponse<Company>> {
    try {
      const response = await api.post(COMPANIES_API_BASE_URL, companyData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create company'
      };
    }
  },

  // 회사 수정
  async updateCompany(id: string, companyData: UpdateCompanyRequest): Promise<ApiResponse<Company>> {
    try {
      const response = await api.put(`${COMPANIES_API_BASE_URL}/${id}`, companyData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update company'
      };
    }
  },

  // 회사 삭제
  async deleteCompany(id: string): Promise<ApiResponse<Company>> {
    try {
      const response = await api.delete(`${COMPANIES_API_BASE_URL}/${id}`);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete company'
      };
    }
  },

  // 사업자번호 유효성 검증
  validateBusinessNumber(businessNumber: string): boolean {
    // 사업자번호 형식: XXX-XX-XXXXX (10자리 숫자)
    const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
    return businessNumberRegex.test(businessNumber);
  },

  // 사업자번호 포맷팅
  formatBusinessNumber(value: string): string {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 10자리까지만 허용
    const limited = numbers.slice(0, 10);
    
    // 형식에 맞게 하이픈 추가
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
    }
  }
};
