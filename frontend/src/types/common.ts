// frontend/src/types/common.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Company {
  id: string;
  name: string;
  business_number: string;
  contract_date: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  business_number: string;
  contract_date: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateCompanyRequest {
  name?: string;
  business_number?: string;
  contract_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  requiredRoles?: string[];
}

export default {
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  MenuItem
};
