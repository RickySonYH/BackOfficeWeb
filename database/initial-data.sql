-- [advice from AI] 프로덕션 초기 데이터 삽입 스크립트

-- 1. 기본 권한 생성
INSERT INTO permissions (name, description, resource, action) VALUES
('companies.read', '회사 정보 조회', 'companies', 'read'),
('companies.write', '회사 정보 생성/수정', 'companies', 'write'),
('companies.delete', '회사 삭제', 'companies', 'delete'),
('tenants.read', '테넌트 정보 조회', 'tenants', 'read'),
('tenants.write', '테넌트 정보 생성/수정', 'tenants', 'write'),
('tenants.delete', '테넌트 삭제', 'tenants', 'delete'),
('users.read', '사용자 정보 조회', 'users', 'read'),
('users.write', '사용자 정보 생성/수정', 'users', 'write'),
('users.delete', '사용자 삭제', 'users', 'delete'),
('workspaces.read', '워크스페이스 조회', 'workspaces', 'read'),
('workspaces.write', '워크스페이스 생성/수정', 'workspaces', 'write'),
('workspaces.delete', '워크스페이스 삭제', 'workspaces', 'delete'),
('solutions.read', '솔루션 배포 조회', 'solutions', 'read'),
('solutions.write', '솔루션 배포 관리', 'solutions', 'write'),
('solutions.delete', '솔루션 배포 삭제', 'solutions', 'delete'),
('data-init.execute', '데이터 초기화 실행', 'data-init', 'execute'),
('monitoring.read', '모니터링 데이터 조회', 'monitoring', 'read'),
('rbac.manage', 'RBAC 권한 관리', 'rbac', 'manage'),
('system.admin', '시스템 관리자 권한', 'system', 'admin');

-- 2. 기본 역할 생성
INSERT INTO roles (name, description, is_system_role) VALUES
('super_admin', '슈퍼 관리자 - 모든 권한', true),
('admin', '시스템 관리자', true),
('manager', '매니저 - 회사/테넌트 관리', true),
('operator', '운영자 - 모니터링 및 배포 관리', true),
('user', '일반 사용자', true);

-- 3. 역할별 권한 할당
-- Super Admin: 모든 권한
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- Admin: 시스템 관리 권한 (사용자 삭제 제외)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
AND p.name IN (
    'companies.read', 'companies.write',
    'tenants.read', 'tenants.write',
    'users.read', 'users.write',
    'workspaces.read', 'workspaces.write',
    'solutions.read', 'solutions.write',
    'data-init.execute',
    'monitoring.read',
    'rbac.manage'
);

-- Manager: 회사/테넌트/워크스페이스 관리
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.name IN (
    'companies.read', 'companies.write',
    'tenants.read', 'tenants.write',
    'workspaces.read', 'workspaces.write',
    'users.read', 'users.write',
    'monitoring.read'
);

-- Operator: 모니터링 및 배포 관리
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'operator'
AND p.name IN (
    'solutions.read', 'solutions.write',
    'monitoring.read',
    'data-init.execute',
    'tenants.read',
    'workspaces.read'
);

-- User: 기본 조회 권한
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
AND p.name IN (
    'companies.read',
    'tenants.read',
    'workspaces.read',
    'monitoring.read'
);

-- 4. 기본 관리자 사용자 생성 (패스워드: admin123!)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status)
VALUES (
    'admin',
    'admin@aicc-ops.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG/QWuuHiW', -- admin123!
    'System',
    'Administrator',
    'super_admin',
    'active'
);

-- 5. 기본 관리자에게 super_admin 역할 할당
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'super_admin';

-- 6. 샘플 회사 생성 (데모용)
INSERT INTO companies (name, description, industry, size, contact_email, status)
VALUES (
    'AICC Demo Company',
    '데모 및 테스트용 회사',
    'Technology',
    'Medium',
    'demo@aicc-demo.com',
    'active'
);

-- 7. 샘플 테넌트 생성
INSERT INTO tenants (company_id, name, description, db_host, db_port, db_name, db_user, status)
SELECT 
    c.id,
    'Demo Tenant',
    '데모용 테넌트',
    'localhost',
    5432,
    'demo_tenant_db',
    'demo_user',
    'active'
FROM companies c
WHERE c.name = 'AICC Demo Company';

-- 8. 샘플 워크스페이스 생성
INSERT INTO workspaces (tenant_id, name, description, type, configuration, status)
SELECT 
    t.id,
    'Demo KMS Workspace',
    '데모용 KMS 워크스페이스',
    'KMS',
    '{"vectordb_enabled": true, "search_engine": "elasticsearch", "languages": ["ko", "en"]}',
    'active'
FROM tenants t
JOIN companies c ON t.company_id = c.id
WHERE c.name = 'AICC Demo Company' AND t.name = 'Demo Tenant';

INSERT INTO workspaces (tenant_id, name, description, type, configuration, status)
SELECT 
    t.id,
    'Demo Advisor Workspace',
    '데모용 Advisor 워크스페이스',
    'Advisor',
    '{"ai_model": "gpt-4", "response_templates": true, "escalation_rules": true}',
    'active'
FROM tenants t
JOIN companies c ON t.company_id = c.id
WHERE c.name = 'AICC Demo Company' AND t.name = 'Demo Tenant';

-- 9. 기본 ECP 역할 매핑 설정
INSERT INTO ecp_role_mappings (ecp_role_name, internal_role_id, mapping_rules, is_active)
SELECT 
    'AICC_ADMIN',
    r.id,
    '{"auto_assign": true, "workspace_access": "all"}',
    true
FROM roles r
WHERE r.name = 'admin';

INSERT INTO ecp_role_mappings (ecp_role_name, internal_role_id, mapping_rules, is_active)
SELECT 
    'AICC_MANAGER',
    r.id,
    '{"auto_assign": true, "workspace_access": "assigned"}',
    true
FROM roles r
WHERE r.name = 'manager';

INSERT INTO ecp_role_mappings (ecp_role_name, internal_role_id, mapping_rules, is_active)
SELECT 
    'AICC_USER',
    r.id,
    '{"auto_assign": true, "workspace_access": "read_only"}',
    true
FROM roles r
WHERE r.name = 'user';

-- 10. 기본 솔루션 배포 설정
INSERT INTO solution_deployments (name, description, kubernetes_namespace, resource_capacity, status, deployment_config)
VALUES (
    'Default AICC Solution',
    '기본 AICC 솔루션 배포',
    'aicc-default',
    '{"cpu": "4", "memory": "8Gi", "storage": "50Gi", "max_tenants": 10}',
    'active',
    '{"replicas": 2, "auto_scaling": true, "monitoring": true}'
);

-- 11. 데모 테넌트를 기본 솔루션에 할당
INSERT INTO tenant_solution_mappings (tenant_id, solution_id, assigned_by)
SELECT 
    t.id,
    s.id,
    u.id
FROM tenants t
JOIN companies c ON t.company_id = c.id
JOIN solution_deployments s ON s.name = 'Default AICC Solution'
JOIN users u ON u.username = 'admin'
WHERE c.name = 'AICC Demo Company' AND t.name = 'Demo Tenant';
