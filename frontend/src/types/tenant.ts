// frontend/src/types/tenant.ts

export interface Tenant {
  id: string;
  company_id: string;
  tenant_key: string;
  kubernetes_namespace: string;
  deployment_status: 'pending' | 'deploying' | 'active' | 'failed' | 'inactive';
  created_at: string;
  updated_at: string;
  company_name: string;
  company_business_number: string;
}

export interface CreateTenantRequest {
  company_id: string;
  tenant_key?: string;
  kubernetes_namespace?: string;
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
  password: string;
}

export interface TenantListResponse {
  success: boolean;
  data: {
    tenants: Tenant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface TenantResponse {
  success: boolean;
  data: Tenant;
  message?: string;
}

export interface TenantDbConnectionsResponse {
  success: boolean;
  data: TenantDbConnection[];
  message?: string;
}

export interface TenantFormData {
  company_id: string;
  tenant_key?: string;
  kubernetes_namespace?: string;
}

export interface TenantFormErrors {
  company_id?: string;
  tenant_key?: string;
  kubernetes_namespace?: string;
}

export interface DbConnectionFormData {
  connection_type: 'postgresql' | 'mongodb';
  host: string;
  port: number | string;
  database_name: string;
  username: string;
  password: string;
}

export interface DbConnectionFormErrors {
  connection_type?: string;
  host?: string;
  port?: string;
  database_name?: string;
  username?: string;
  password?: string;
}
