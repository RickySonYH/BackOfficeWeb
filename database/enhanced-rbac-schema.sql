-- [advice from AI] 강화된 RBAC 시스템 데이터베이스 스키마

-- 권한 테이블
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- 'workspace', 'tenant', 'company', 'system', 'solution'
    action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'execute', 'manage', '*'
    scope VARCHAR(50) NOT NULL DEFAULT 'resource', -- 'global', 'tenant', 'workspace', 'resource'
    conditions JSONB DEFAULT '[]', -- 조건부 권한을 위한 조건들
    is_system_permission BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 역할 테이블 (기존 테이블 확장)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'custom'; -- 'system', 'tenant', 'workspace', 'custom'
ALTER TABLE roles ADD COLUMN IF NOT EXISTS inherits_from UUID[]; -- 상속받는 역할들
ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_assignable_level VARCHAR(50) DEFAULT 'workspace'; -- 'system', 'tenant', 'workspace'
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'; -- 역할 조건
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 역할-권한 연결 테이블
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conditions JSONB DEFAULT '{}', -- 특정 조건하에서만 유효한 권한
    UNIQUE(role_id, permission_id)
);

-- 사용자 역할 할당 테이블 (기존 테이블 확장)
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'; -- 할당 조건
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'; -- 추가 메타데이터
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id);

-- 역할 계층 구조 테이블
CREATE TABLE IF NOT EXISTS role_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    child_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    inheritance_type VARCHAR(50) DEFAULT 'full', -- 'full', 'partial', 'conditional'
    conditions JSONB DEFAULT '{}', -- 상속 조건
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_role_id, child_role_id),
    CHECK (parent_role_id != child_role_id) -- 자기 자신을 참조하지 않도록
);

-- ECP 역할 매핑 테이블
CREATE TABLE IF NOT EXISTS ecp_role_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ecp_role_id VARCHAR(255) NOT NULL,
    ecp_role_name VARCHAR(255) NOT NULL,
    internal_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id), -- null이면 글로벌 매핑
    workspace_id UUID REFERENCES workspaces(id), -- null이면 테넌트/글로벌 매핑
    mapping_type VARCHAR(50) NOT NULL DEFAULT 'exact', -- 'exact', 'contains', 'regex', 'hierarchy'
    mapping_config JSONB DEFAULT '{}', -- 매핑 설정 (정규식 패턴 등)
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- 높은 숫자가 높은 우선순위
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 권한 감사 로그 테이블
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL, -- 'permission_check', 'role_assignment', 'role_revocation', etc.
    resource_type VARCHAR(50),
    resource_id UUID,
    requested_action VARCHAR(100),
    result VARCHAR(20) NOT NULL, -- 'granted', 'denied'
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    performed_by UUID REFERENCES users(id), -- 관리자가 수행한 작업의 경우
    metadata JSONB DEFAULT '{}', -- 추가 정보 (처리 시간, 매칭된 권한 등)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 권한 정책 테이블
CREATE TABLE IF NOT EXISTS permission_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(20) NOT NULL, -- 'allow', 'deny', 'conditional'
    conditions JSONB NOT NULL DEFAULT '[]', -- 정책 조건들
    actions JSONB NOT NULL DEFAULT '[]', -- 적용되는 액션들
    resources JSONB NOT NULL DEFAULT '[]', -- 적용되는 리소스들
    priority INTEGER DEFAULT 0, -- 높은 숫자가 높은 우선순위
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 권한 위임 테이블
CREATE TABLE IF NOT EXISTS permission_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id UUID NOT NULL REFERENCES users(id),
    delegate_id UUID NOT NULL REFERENCES users(id),
    permissions JSONB NOT NULL, -- 위임할 권한 ID들
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    delegation_type VARCHAR(50) NOT NULL, -- 'temporary', 'permanent', 'conditional'
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 권한 요청 테이블 (승인 워크플로우)
CREATE TABLE IF NOT EXISTS permission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id),
    requested_permissions JSONB NOT NULL, -- 요청할 권한 ID들
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    justification TEXT NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'temporary', 'permanent'
    requested_duration INTERVAL, -- ISO 8601 duration
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ECP 동기화 관련 테이블들

-- ECP 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS ecp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'role_assigned', 'role_revoked', 'role_updated', 'permission_changed'
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    tenant_id UUID REFERENCES tenants(id),
    workspace_id UUID REFERENCES workspaces(id),
    timestamp TIMESTAMP NOT NULL,
    changed_by VARCHAR(255), -- ECP에서 변경한 사용자/시스템
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ECP 동기화 결과 테이블
CREATE TABLE IF NOT EXISTS ecp_sync_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    success BOOLEAN NOT NULL,
    synchronized_users INTEGER DEFAULT 0,
    created_assignments INTEGER DEFAULT 0,
    updated_assignments INTEGER DEFAULT 0,
    removed_assignments INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    duration_ms INTEGER,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource_type, action);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON role_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_resource ON user_role_assignments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_expires ON user_role_assignments(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_hierarchy_parent ON role_hierarchy(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_child ON role_hierarchy(child_role_id);

CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_ecp_role ON ecp_role_mappings(ecp_role_id, ecp_role_name);
CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_internal_role ON ecp_role_mappings(internal_role_id);
CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_tenant ON ecp_role_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_workspace ON ecp_role_mappings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_active ON ecp_role_mappings(is_active);
CREATE INDEX IF NOT EXISTS idx_ecp_role_mappings_priority ON ecp_role_mappings(priority DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_action_type ON permission_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_resource ON permission_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_result ON permission_audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON permission_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_permission_policies_active ON permission_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_permission_policies_priority ON permission_policies(priority DESC);

CREATE INDEX IF NOT EXISTS idx_permission_delegations_delegator ON permission_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_delegate ON permission_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_active ON permission_delegations(is_active);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_expires ON permission_delegations(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permission_requests_requester ON permission_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_permission_requests_created_at ON permission_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_ecp_sync_logs_user_id ON ecp_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ecp_sync_logs_event_type ON ecp_sync_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ecp_sync_logs_timestamp ON ecp_sync_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_ecp_sync_results_sync_type ON ecp_sync_results(sync_type);
CREATE INDEX IF NOT EXISTS idx_ecp_sync_results_success ON ecp_sync_results(success);
CREATE INDEX IF NOT EXISTS idx_ecp_sync_results_completed_at ON ecp_sync_results(completed_at);

-- 트리거 함수 및 트리거 생성

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 적용
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecp_role_mappings_updated_at BEFORE UPDATE ON ecp_role_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_policies_updated_at BEFORE UPDATE ON permission_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_delegations_updated_at BEFORE UPDATE ON permission_delegations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_requests_updated_at BEFORE UPDATE ON permission_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 권한 체크를 위한 함수들

-- 사용자의 효과적인 권한 조회 함수
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID, p_resource_type VARCHAR DEFAULT NULL, p_resource_id UUID DEFAULT NULL)
RETURNS TABLE(
    permission_id UUID,
    permission_name VARCHAR,
    resource_type VARCHAR,
    action VARCHAR,
    scope VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE role_tree AS (
        -- 사용자의 직접 할당된 역할들
        SELECT DISTINCT ura.role_id
        FROM user_role_assignments ura
        WHERE ura.user_id = p_user_id 
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
          AND (p_resource_type IS NULL OR ura.resource_type = 'system' OR ura.resource_type = p_resource_type)
          AND (p_resource_id IS NULL OR ura.resource_id IS NULL OR ura.resource_id = p_resource_id)
        
        UNION
        
        -- 상속된 역할들
        SELECT rh.parent_role_id
        FROM role_tree rt
        JOIN role_hierarchy rh ON rt.role_id = rh.child_role_id
    )
    SELECT DISTINCT 
        p.id,
        p.name,
        p.resource_type,
        p.action,
        p.scope
    FROM role_tree rt
    JOIN role_permissions rp ON rt.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 권한 확인 함수
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT COUNT(*) > 0 INTO has_permission
    FROM get_user_effective_permissions(p_user_id, p_resource_type, p_resource_id) ep
    WHERE (ep.resource_type = p_resource_type OR ep.resource_type = '*')
      AND (ep.action = p_action OR ep.action = '*' OR ep.action LIKE p_action || ':%')
      AND (
          ep.scope = 'global' 
          OR (ep.scope = 'tenant' AND p_resource_type IN ('tenant', 'workspace'))
          OR (ep.scope = 'workspace' AND p_resource_type = 'workspace')
          OR ep.scope = 'resource'
      );
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- 기본 시스템 권한 데이터 삽입
INSERT INTO permissions (name, description, resource_type, action, scope, is_system_permission) VALUES
-- 시스템 권한
('system.admin', 'Full system administration', 'system', '*', 'global', true),
('system.manage_users', 'Manage system users', 'system', 'manage', 'global', true),
('system.manage_tenants', 'Manage tenants', 'system', 'manage', 'global', true),
('system.view_audit_logs', 'View system audit logs', 'system', 'read', 'global', true),

-- 회사 권한
('company.create', 'Create companies', 'company', 'create', 'global', true),
('company.read', 'View company information', 'company', 'read', 'resource', true),
('company.update', 'Update company information', 'company', 'update', 'resource', true),
('company.delete', 'Delete companies', 'company', 'delete', 'resource', true),

-- 테넌트 권한
('tenant.create', 'Create tenants', 'tenant', 'create', 'tenant', true),
('tenant.read', 'View tenant information', 'tenant', 'read', 'tenant', true),
('tenant.update', 'Update tenant settings', 'tenant', 'update', 'tenant', true),
('tenant.delete', 'Delete tenants', 'tenant', 'delete', 'tenant', true),
('tenant.manage_users', 'Manage tenant users', 'tenant', 'manage', 'tenant', true),

-- 워크스페이스 권한
('workspace.create', 'Create workspaces', 'workspace', 'create', 'tenant', true),
('workspace.read', 'View workspace information', 'workspace', 'read', 'workspace', true),
('workspace.update', 'Update workspace settings', 'workspace', 'update', 'workspace', true),
('workspace.delete', 'Delete workspaces', 'workspace', 'delete', 'workspace', true),
('workspace.manage_data', 'Manage workspace data', 'workspace', 'manage', 'workspace', true),
('workspace.configure', 'Configure workspace settings', 'workspace', 'execute', 'workspace', true),

-- 솔루션 권한
('solution.create', 'Create solution instances', 'solution', 'create', 'global', true),
('solution.read', 'View solution information', 'solution', 'read', 'resource', true),
('solution.update', 'Update solution settings', 'solution', 'update', 'resource', true),
('solution.delete', 'Delete solution instances', 'solution', 'delete', 'resource', true),
('solution.deploy', 'Deploy solutions', 'solution', 'execute', 'resource', true),
('solution.manage', 'Full solution management', 'solution', 'manage', 'resource', true)
ON CONFLICT (name) DO NOTHING;

-- 기본 시스템 역할 생성
INSERT INTO roles (name, description, role_type, is_system_role, max_assignable_level) VALUES
('system_admin', 'System Administrator', 'system', true, 'system'),
('tenant_admin', 'Tenant Administrator', 'tenant', true, 'tenant'),
('workspace_admin', 'Workspace Administrator', 'workspace', true, 'workspace'),
('workspace_manager', 'Workspace Manager', 'workspace', true, 'workspace'),
('workspace_user', 'Workspace User', 'workspace', true, 'workspace'),
('workspace_viewer', 'Workspace Viewer', 'workspace', true, 'workspace')
ON CONFLICT (name) DO NOTHING;

-- 시스템 관리자 역할에 모든 권한 할당
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    (SELECT id FROM roles WHERE name = 'system_admin'),
    p.id,
    NULL
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'system_admin') 
    AND rp.permission_id = p.id
);

-- 기본 정책 생성
INSERT INTO permission_policies (name, description, policy_type, conditions, actions, resources, priority) VALUES
('deny_expired_users', 'Deny access for expired users', 'deny', 
 '[{"field": "user.status", "operator": "equals", "value": "expired"}]',
 '["*"]', 
 '[{"resource_type": "*"}]', 
 100),
('allow_system_admin', 'Allow all actions for system admins', 'allow',
 '[{"field": "user.role", "operator": "contains", "value": "system_admin"}]',
 '["*"]',
 '[{"resource_type": "*"}]',
 90)
ON CONFLICT (name) DO NOTHING;
