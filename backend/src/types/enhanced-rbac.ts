// [advice from AI] 강화된 RBAC 시스템 타입 정의

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: 'workspace' | 'tenant' | 'company' | 'system' | 'solution' | 'all';
  action: string; // 'create', 'read', 'update', 'delete', 'execute', 'manage'
  scope: 'global' | 'tenant' | 'workspace' | 'resource';
  conditions?: PermissionCondition[];
  created_at: string;
  updated_at: string;
}

export interface PermissionCondition {
  field: string; // 'workspace_type', 'tenant_status', 'resource_owner', etc.
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'regex';
  value: any;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  role_type: 'system' | 'tenant' | 'workspace' | 'custom';
  is_system_role: boolean;
  permissions: Permission[];
  inherits_from?: string[]; // 상속받는 역할 ID들
  max_assignable_level: 'system' | 'tenant' | 'workspace';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  resource_type: 'system' | 'tenant' | 'workspace' | 'solution';
  resource_id?: string; // null for system-wide roles
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  conditions?: AssignmentCondition[];
  metadata?: any;
}

export interface AssignmentCondition {
  type: 'time_based' | 'ip_based' | 'location_based' | 'device_based';
  configuration: any;
}

export interface EcpRoleMapping {
  id: string;
  ecp_role_id: string;
  ecp_role_name: string;
  internal_role_id: string;
  tenant_id?: string; // null for global mappings
  workspace_id?: string; // null for tenant/global mappings
  mapping_type: 'exact' | 'contains' | 'regex' | 'hierarchy';
  mapping_config: any;
  is_active: boolean;
  priority: number; // higher number = higher priority
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PermissionCheck {
  user_id: string;
  resource_type: 'workspace' | 'tenant' | 'company' | 'system' | 'solution' | 'all';
  resource_id?: string;
  action: string;
  context?: {
    ip_address?: string;
    user_agent?: string;
    workspace_type?: string;
    tenant_status?: string;
    additional_data?: any;
  };
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matched_permissions: Permission[];
  denied_reasons?: string[];
  required_conditions?: string[];
}

export interface RoleHierarchy {
  parent_role_id: string;
  child_role_id: string;
  inheritance_type: 'full' | 'partial' | 'conditional';
  conditions?: any;
  created_at: string;
}

export interface PermissionAuditLog {
  id: string;
  user_id: string;
  action_type: 'permission_check' | 'role_assignment' | 'role_revocation' | 'permission_grant' | 'permission_deny';
  resource_type: string;
  resource_id?: string;
  requested_action: string;
  result: 'granted' | 'denied';
  reason: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  performed_by?: string; // for administrative actions
  metadata?: any;
  created_at: string;
}

// API 요청/응답 타입들
export interface CreateRoleRequest {
  name: string;
  description: string;
  role_type: 'system' | 'tenant' | 'workspace' | 'custom';
  permissions: string[]; // permission IDs
  inherits_from?: string[];
  max_assignable_level: 'system' | 'tenant' | 'workspace';
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  inherits_from?: string[];
  is_active?: boolean;
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  resource_type: 'system' | 'tenant' | 'workspace' | 'solution';
  resource_id?: string;
  expires_at?: string;
  conditions?: AssignmentCondition[];
}

export interface CreateEcpMappingRequest {
  ecp_role_id: string;
  ecp_role_name: string;
  internal_role_id: string;
  tenant_id?: string;
  workspace_id?: string;
  mapping_type: 'exact' | 'contains' | 'regex' | 'hierarchy';
  mapping_config: any;
  priority: number;
}

export interface BulkPermissionCheckRequest {
  user_id: string;
  checks: Array<{
    resource_type: string;
    resource_id?: string;
    action: string;
  }>;
  context?: any;
}

export interface BulkPermissionCheckResponse {
  user_id: string;
  results: Array<{
    resource_type: string;
    resource_id?: string;
    action: string;
    allowed: boolean;
    reason: string;
  }>;
  overall_summary: {
    total_checks: number;
    allowed_count: number;
    denied_count: number;
  };
}

// 프론트엔드용 UI 타입들
export interface RoleWithPermissions {
  role: Role;
  effective_permissions: Permission[];
  inherited_permissions: Permission[];
  direct_permissions: Permission[];
}

export interface UserPermissionSummary {
  user_id: string;
  username: string;
  email: string;
  roles: Array<{
    role: Role;
    assignment: UserRoleAssignment;
    resource_name?: string;
  }>;
  effective_permissions: Permission[];
  workspace_access: Array<{
    workspace_id: string;
    workspace_name: string;
    permissions: string[];
  }>;
  tenant_access: Array<{
    tenant_id: string;
    tenant_name: string;
    permissions: string[];
  }>;
}

export interface PermissionMatrix {
  resources: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  actions: string[];
  users: Array<{
    user_id: string;
    username: string;
    permissions: { [resourceId: string]: { [action: string]: boolean } };
  }>;
}

// 동적 권한 평가를 위한 컨텍스트
export interface PermissionContext {
  user: {
    id: string;
    username: string;
    email: string;
    ecp_roles?: string[];
    tenant_id?: string;
    last_login?: string;
  };
  request: {
    ip_address?: string;
    user_agent?: string;
    timestamp: string;
    session_id?: string;
  };
  resource: {
    type: string;
    id?: string;
    owner_id?: string;
    tenant_id?: string;
    workspace_id?: string;
    metadata?: any;
  };
  environment: {
    time_zone?: string;
    business_hours?: boolean;
    maintenance_mode?: boolean;
  };
}

// 권한 정책 엔진
export interface PermissionPolicy {
  id: string;
  name: string;
  description: string;
  policy_type: 'allow' | 'deny' | 'conditional';
  conditions: PolicyCondition[];
  actions: string[];
  resources: PolicyResource[];
  priority: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'exists';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface PolicyResource {
  resource_type: string;
  resource_id?: string;
  resource_pattern?: string;
}

// 권한 위임
export interface PermissionDelegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  permissions: string[];
  resource_type: string;
  resource_id?: string;
  delegation_type: 'temporary' | 'permanent' | 'conditional';
  starts_at: string;
  expires_at?: string;
  conditions?: any;
  is_active: boolean;
  created_at: string;
}

// 권한 승인 워크플로우
export interface PermissionRequest {
  id: string;
  requester_id: string;
  requested_permissions: string[];
  resource_type: string;
  resource_id?: string;
  justification: string;
  request_type: 'temporary' | 'permanent';
  requested_duration?: string; // ISO 8601 duration
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}
