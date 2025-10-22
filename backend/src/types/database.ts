// [advice from AI] 데이터베이스 관련 TypeScript 타입 정의

// [advice from AI] 공통 기본 엔터티 인터페이스
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// [advice from AI] 회사 엔터티 인터페이스
export interface Company extends BaseEntity {
  name: string;
  businessNumber: string;
  contractDate: Date;
  status: 'active' | 'inactive' | 'suspended';
}

// [advice from AI] 테넌트 엔터티 인터페이스
export interface Tenant extends BaseEntity {
  companyId: string;
  tenantKey: string;
  kubernetesNamespace: string;
  deploymentStatus: 'pending' | 'deploying' | 'active' | 'failed' | 'suspended';
  company?: Company; // 조인된 회사 정보
}

// [advice from AI] 사용자 엔터티 인터페이스
export interface User extends BaseEntity {
  tenantId: string;
  username: string;
  email: string;
  ecpUserId?: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  tenant?: Tenant; // 조인된 테넌트 정보
}

// [advice from AI] 워크스페이스 엔터티 인터페이스
export interface Workspace extends BaseEntity {
  tenantId: string;
  name: string;
  type: 'KMS' | 'ADVISOR';
  configData: Record<string, any>; // JSONB 데이터
  status: 'active' | 'inactive' | 'configuring';
  isDefault: boolean;
  priority: number;
  tenant?: Tenant; // 조인된 테넌트 정보
}

// [advice from AI] 테넌트 DB 연결 정보 인터페이스
export interface TenantDbConnection extends BaseEntity {
  tenantId: string;
  dbType: 'postgres' | 'mongodb';
  connectionHost: string;
  connectionPort: number;
  databaseName: string;
  username: string;
  passwordEncrypted: string; // 암호화된 비밀번호
  connectionStatus: 'connected' | 'failed' | 'unknown' | 'testing';
  lastTestedAt?: Date;
  tenant?: Tenant; // 조인된 테넌트 정보
}

// [advice from AI] 데이터 초기화 로그 인터페이스
export interface DataInitializationLog extends BaseEntity {
  tenantId: string;
  workspaceId?: string;
  actionType: 'SCHEMA_INIT' | 'DATA_SEED' | 'CONFIG_APPLY' | 'WORKSPACE_SETUP';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  details: Record<string, any>; // JSONB 데이터
  errorMessage?: string;
  executedAt?: Date;
  tenant?: Tenant; // 조인된 테넌트 정보
  workspace?: Workspace; // 조인된 워크스페이스 정보
}

// [advice from AI] 데이터베이스 쿼리 옵션 인터페이스
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

// [advice from AI] 페이지네이션 결과 인터페이스
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// [advice from AI] 데이터베이스 연결 테스트 결과 인터페이스
export interface DbConnectionTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

// [advice from AI] 대시보드 통계 인터페이스
export interface DashboardStats {
  activeCompanies: number;
  activeTenants: number;
  totalUsers: number;
  activeWorkspaces: number;
  successfulInitsToday: number;
  failedInitsToday: number;
  inProgressInits: number;
}

// [advice from AI] 최근 활동 인터페이스
export interface RecentActivity {
  activityType: 'company' | 'tenant' | 'initialization';
  title: string;
  activityTime: Date;
  description: string;
}

// [advice from AI] 데이터베이스 트랜잭션 콜백 타입
export type TransactionCallback<T> = (client: any) => Promise<T>;
