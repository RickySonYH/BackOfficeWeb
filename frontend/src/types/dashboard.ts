// [advice from AI] 대시보드 관련 타입 정의

export interface DashboardStats {
  companies: number;
  tenants: number;
  users: number;
  workspaces: number;
}

export interface TenantInitStats {
  completed: number;
  in_progress: number;
  failed: number;
}

export interface RecentCompany {
  id: string;
  company_name: string;
  business_number: string;
  created_at: string;
}

export interface RecentTenant {
  id: string;
  tenant_key: string;
  company_name: string;
  deployment_status: string;
  created_at: string;
}

export interface RecentInitLog {
  id: string;
  tenant_id: string;
  tenant_key: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

export interface SystemStatus {
  management_db: {
    status: 'connected' | 'disconnected' | 'error';
    port: number;
    message?: string;
  };
  backend_service: {
    status: 'connected' | 'disconnected' | 'error';
    port: number;
    message?: string;
  };
  kubernetes: {
    status: 'connected' | 'disconnected' | 'error';
    message?: string;
  };
  ecp_auth: {
    status: 'connected' | 'disconnected' | 'error';
    port: number;
    message?: string;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  tenant_init_stats: TenantInitStats;
  recent_companies: RecentCompany[];
  recent_tenants: RecentTenant[];
  recent_init_logs: RecentInitLog[];
  system_status: SystemStatus;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
  error?: string;
}
