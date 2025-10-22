// backend/src/types/tenant.ts

export interface Tenant {
  id: string;
  company_id: string;
  tenant_key: string;
  kubernetes_namespace: string;
  deployment_status: 'pending' | 'deploying' | 'active' | 'failed' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface TenantWithCompany extends Tenant {
  company_name: string;
  company_business_number: string;
}

export interface CreateTenantRequest {
  company_id: string;
  tenant_key?: string; // 자동 생성되므로 선택적
  kubernetes_namespace?: string; // 자동 생성되므로 선택적
}

export interface TenantDbConnection {
  id: string;
  tenant_id: string;
  connection_type: 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string;
  connection_status: 'pending' | 'connected' | 'failed';
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantDbConnectionRequest {
  connection_type: 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string; // 평문으로 받아서 암호화 저장
}

export interface TenantListResponse {
  tenants: TenantWithCompany[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantDetailResponse {
  tenant: TenantWithCompany;
  db_connections: TenantDbConnection[];
}

export interface DbConnectionTestResult {
  success: boolean;
  message: string;
  connection_time?: number;
}
