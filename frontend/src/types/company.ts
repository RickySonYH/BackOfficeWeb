// frontend/src/types/company.ts

export interface Company {
  id: string;
  name: string;
  businessNumber: string;
  contractDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  businessNumber: string;
  contractDate: string;
  status: 'active' | 'inactive';
}

export interface UpdateCompanyRequest {
  name: string;
  businessNumber: string;
  contractDate: string;
  status: 'active' | 'inactive';
}

export interface CompanyListResponse {
  success: boolean;
  data: {
    data: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompanyResponse {
  success: boolean;
  data: Company;
  message?: string;
}

export interface CompanyFormData {
  name: string;
  businessNumber: string;
  contractDate: string;
  status: 'active' | 'inactive';
}

export interface CompanyFormErrors {
  name?: string;
  businessNumber?: string;
  contractDate?: string;
  status?: string;
}
