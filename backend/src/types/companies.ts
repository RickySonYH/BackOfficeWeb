// [advice from AI] 회사 관리 API 관련 TypeScript 타입 정의

import { BaseEntity, PaginatedResult } from './database';

// [advice from AI] 회사 상태 enum
export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// [advice from AI] 회사 엔터티 인터페이스 (확장)
export interface Company extends BaseEntity {
  name: string;
  businessNumber: string;
  contractDate: Date;
  status: CompanyStatus;
}

// [advice from AI] 회사 생성 요청 인터페이스
export interface CreateCompanyRequest {
  name: string;
  businessNumber: string;
  contractDate: string; // ISO 8601 날짜 문자열
  status?: CompanyStatus;
}

// [advice from AI] 회사 수정 요청 인터페이스
export interface UpdateCompanyRequest {
  name?: string;
  businessNumber?: string;
  contractDate?: string; // ISO 8601 날짜 문자열
  status?: CompanyStatus;
}

// [advice from AI] 회사 조회 쿼리 파라미터 인터페이스
export interface GetCompaniesQuery {
  page?: number;
  limit?: number;
  status?: CompanyStatus;
  search?: string; // 회사명 또는 사업자번호로 검색
  sortBy?: 'name' | 'contractDate' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

// [advice from AI] 회사 응답 인터페이스
export interface CompanyResponse {
  id: string;
  name: string;
  businessNumber: string;
  contractDate: string; // ISO 8601 날짜 문자열
  status: CompanyStatus;
  createdAt: string; // ISO 8601 날짜 문자열
  updatedAt: string; // ISO 8601 날짜 문자열
  // 추가 정보 (조인된 데이터)
  tenantsCount?: number; // 해당 회사의 테넌트 수
  activeTenantsCount?: number; // 활성 테넌트 수
}

// [advice from AI] 회사 목록 응답 인터페이스
export interface GetCompaniesResponse extends PaginatedResult<CompanyResponse> {
  // PaginatedResult의 모든 필드 상속
  // data: CompanyResponse[];
  // total: number;
  // page: number;
  // limit: number;
  // totalPages: number;
  // hasNext: boolean;
  // hasPrev: boolean;
}

// [advice from AI] 회사 상세 응답 인터페이스
export interface GetCompanyDetailResponse extends CompanyResponse {
  // 상세 정보 추가
  tenants?: Array<{
    id: string;
    tenantKey: string;
    kubernetesNamespace: string;
    deploymentStatus: string;
    createdAt: string;
  }>;
  recentActivity?: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
}

// [advice from AI] API 응답 래퍼 인터페이스
export interface CompanyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// [advice from AI] 회사 생성 응답
export interface CreateCompanyResponse extends CompanyApiResponse<CompanyResponse> {}

// [advice from AI] 회사 수정 응답
export interface UpdateCompanyResponse extends CompanyApiResponse<CompanyResponse> {}

// [advice from AI] 회사 삭제 응답
export interface DeleteCompanyResponse extends CompanyApiResponse<{
  deletedId: string;
  deletedAt: string;
}> {}

// [advice from AI] 유효성 검증 오류 인터페이스
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// [advice from AI] 유효성 검증 오류 응답
export interface ValidationErrorResponse extends CompanyApiResponse {
  success: false;
  error: 'Validation Error';
  validationErrors: ValidationError[];
}
