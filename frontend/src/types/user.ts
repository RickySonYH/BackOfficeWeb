// 사용자 권한 타입
export type UserRole = 'admin' | 'manager' | 'user';

// 기본 사용자 정보 (ECP 메인 DB에서 가져오는 정보)
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  ecp_user_id?: string; // ECP 시스템의 사용자 ID
  tenant_id?: string;
  tenant_name?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// 사용자 등록 폼 데이터
export interface UserFormData {
  username: string;
  email: string;
  full_name?: string;
  ecp_user_id?: string;
  tenant_id: string;
  role: UserRole;
}

// 사용자 등록 폼 에러
export interface UserFormErrors {
  username?: string;
  email?: string;
  full_name?: string;
  ecp_user_id?: string;
  tenant_id?: string;
  role?: string;
}

// 권한 업데이트 데이터
export interface UserRoleUpdateData {
  role: UserRole;
}

// 사용자 목록 응답
export interface UsersResponse {
  success: boolean;
  data?: {
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

// 단일 사용자 응답
export interface UserResponse {
  success: boolean;
  data?: User;
  error?: string;
}

// 권한 설명
export interface RoleDescription {
  role: UserRole;
  name: string;
  description: string;
  color: string;
}

// ECP 동기화 응답
export interface EcpSyncResponse {
  success: boolean;
  data?: {
    synchronized_count: number;
    updated_count: number;
    new_count: number;
    sync_timestamp: string;
  };
  error?: string;
}
