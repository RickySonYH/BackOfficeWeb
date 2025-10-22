-- [advice from AI] AICC Operations Management Platform 데이터베이스 스키마
-- 관리 솔루션 메타 DB 전용 (포트 6432)

-- 데이터베이스 생성 (이미 존재할 수 있음)
-- CREATE DATABASE aicc_ops;

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- [advice from AI] 1. 회사 관리 테이블
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20) UNIQUE NOT NULL,
    contract_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- [advice from AI] 2. 멀티테넌트 테이블
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tenant_key VARCHAR(100) UNIQUE NOT NULL,
    kubernetes_namespace VARCHAR(100) UNIQUE NOT NULL,
    deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'active', 'failed', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- [advice from AI] 3. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- 내부 인증용 해시된 비밀번호
    ecp_user_id VARCHAR(100) UNIQUE, -- ECP 연동용
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, username)
);

-- [advice from AI] 4. 워크스페이스 테이블
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('KMS', 'ADVISOR')),
    config_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'configuring')),
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- [advice from AI] 5. 테넌트 DB 연결 정보 테이블
CREATE TABLE IF NOT EXISTS tenant_db_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    db_type VARCHAR(20) NOT NULL CHECK (db_type IN ('postgres', 'mongodb')),
    connection_host VARCHAR(255) NOT NULL,
    connection_port INTEGER NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL, -- 암호화된 비밀번호
    connection_status VARCHAR(20) DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'failed', 'unknown', 'testing')),
    last_tested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, db_type)
);

-- [advice from AI] 6. 데이터 초기화 로그 테이블
CREATE TABLE IF NOT EXISTS data_initialization_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('SCHEMA_INIT', 'DATA_SEED', 'CONFIG_APPLY', 'WORKSPACE_SETUP')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED')),
    details JSONB DEFAULT '{}',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_contract_date ON companies(contract_date);

CREATE INDEX IF NOT EXISTS idx_tenants_company_id ON tenants(company_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(deployment_status);
CREATE INDEX IF NOT EXISTS idx_tenants_namespace ON tenants(kubernetes_namespace);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_ecp_id ON users(ecp_user_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);
CREATE INDEX IF NOT EXISTS idx_workspaces_default ON workspaces(tenant_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_tenant_db_connections_tenant_id ON tenant_db_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_db_connections_status ON tenant_db_connections(connection_status);

CREATE INDEX IF NOT EXISTS idx_data_logs_tenant_id ON data_initialization_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_logs_workspace_id ON data_initialization_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_logs_status ON data_initialization_logs(status);
CREATE INDEX IF NOT EXISTS idx_data_logs_created_at ON data_initialization_logs(created_at);

-- [advice from AI] 트리거 함수 - updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- [advice from AI] 7. 기본 워크스페이스 템플릿 테이블
CREATE TABLE IF NOT EXISTS workspace_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('KMS', 'ADVISOR')),
    default_config JSONB NOT NULL DEFAULT '{}',
    is_system_default BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- [advice from AI] 8. 배포된 솔루션 인스턴스 관리 테이블
CREATE TABLE IF NOT EXISTS deployed_solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_name VARCHAR(255) NOT NULL,
    solution_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    deployment_url VARCHAR(500) NOT NULL,
    deployment_type VARCHAR(50) DEFAULT 'kubernetes' CHECK (deployment_type IN ('kubernetes', 'docker', 'vm', 'cloud')),
    
    -- 하드웨어 스펙 정보
    hardware_spec JSONB NOT NULL DEFAULT '{
        "cpu_cores": 4,
        "memory_gb": 8,
        "storage_gb": 100,
        "gpu_count": 0
    }',
    
    -- 리소스 제한 및 현황
    max_tenants INTEGER DEFAULT 10,
    current_tenants INTEGER DEFAULT 0,
    max_cpu_cores DECIMAL(5,2) DEFAULT 3.0,
    max_memory_gb DECIMAL(6,2) DEFAULT 6.0,
    current_cpu_usage DECIMAL(5,2) DEFAULT 0.0,
    current_memory_usage DECIMAL(6,2) DEFAULT 0.0,
    
    -- Kubernetes 관련 정보
    kubernetes_cluster VARCHAR(255),
    kubernetes_namespace VARCHAR(255),
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'deploying', 'active', 'maintenance', 'failed', 'retired')),
    health_check_url VARCHAR(500),
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),
    
    -- 메타데이터
    deployment_config JSONB DEFAULT '{}',
    
    -- 생성 정보
    deployed_by UUID REFERENCES users(id),
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- [advice from AI] 9. 테넌트-솔루션 매핑 테이블
CREATE TABLE IF NOT EXISTS tenant_solution_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    solution_id UUID NOT NULL REFERENCES deployed_solutions(id) ON DELETE CASCADE,
    
    -- 리소스 할당량
    allocated_cpu_cores DECIMAL(5,2) DEFAULT 0.5,
    allocated_memory_gb DECIMAL(6,2) DEFAULT 1.0,
    allocated_storage_gb DECIMAL(8,2) DEFAULT 10.0,
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'deploying', 'active', 'suspended', 'migrating')),
    priority INTEGER DEFAULT 0,
    
    -- 할당 정보
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    
    -- 제약 조건
    UNIQUE(tenant_id, solution_id)
);

-- [advice from AI] 10. 워크스페이스 설정 관리 테이블
CREATE TABLE IF NOT EXISTS workspace_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- 설정 분류
    config_category VARCHAR(50) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    
    -- 환경별 설정
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    
    -- 버전 관리
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- 배포 정보
    deployed_to_solution BOOLEAN DEFAULT false,
    deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'failed')),
    deployed_at TIMESTAMP WITH TIME ZONE,
    
    -- 변경 추적
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약 조건
    UNIQUE(workspace_id, config_category, config_key, environment, version)
);

-- [advice from AI] 11. 설정 변경 히스토리 테이블
CREATE TABLE IF NOT EXISTS configuration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    configuration_id UUID REFERENCES workspace_configurations(id),
    
    -- 변경 내용
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'rollback')),
    config_category VARCHAR(50) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    
    -- 변경 사유
    change_reason TEXT,
    change_description TEXT,
    
    -- 변경 주체
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP WITH TIME ZONE
);

-- [advice from AI] 12. 워크스페이스별 권한 관리 테이블
CREATE TABLE IF NOT EXISTS workspace_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- 권한 타입
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
        'read', 'write', 'admin', 'deploy', 'configure', 
        'manage_data', 'manage_users', 'view_metrics'
    )),
    
    -- 권한 부여 정보
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_reason TEXT,
    
    -- 권한 만료
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- 제약 조건
    UNIQUE(user_id, workspace_id, permission_type)
);

-- [advice from AI] 새 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_workspace_templates_type ON workspace_templates(type);
CREATE INDEX IF NOT EXISTS idx_workspace_templates_system_default ON workspace_templates(is_system_default) WHERE is_system_default = true;

CREATE INDEX IF NOT EXISTS idx_deployed_solutions_status ON deployed_solutions(status);
CREATE INDEX IF NOT EXISTS idx_deployed_solutions_cluster ON deployed_solutions(kubernetes_cluster);
CREATE INDEX IF NOT EXISTS idx_deployed_solutions_health ON deployed_solutions(health_status, last_health_check);

CREATE INDEX IF NOT EXISTS idx_tenant_solution_mappings_tenant ON tenant_solution_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_solution_mappings_solution ON tenant_solution_mappings(solution_id);
CREATE INDEX IF NOT EXISTS idx_tenant_solution_mappings_status ON tenant_solution_mappings(status);

CREATE INDEX IF NOT EXISTS idx_workspace_configurations_workspace ON workspace_configurations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_configurations_category ON workspace_configurations(config_category);
CREATE INDEX IF NOT EXISTS idx_workspace_configurations_active ON workspace_configurations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_configuration_history_workspace ON configuration_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_configuration_history_changed_at ON configuration_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_configuration_history_changed_by ON configuration_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_workspace_permissions_user ON workspace_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_permissions_workspace ON workspace_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_permissions_active ON workspace_permissions(is_active) WHERE is_active = true;

-- [advice from AI] 트리거 생성
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_db_connections_updated_at BEFORE UPDATE ON tenant_db_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- [advice from AI] 13. 리소스 사용량 모니터링 테이블
CREATE TABLE IF NOT EXISTS resource_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID REFERENCES deployed_solutions(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 메트릭 타입
    metric_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'storage', 'network', 'requests'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- 'cores', 'bytes', 'percent', 'requests/sec'
    
    -- 시간 정보
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window INTEGER DEFAULT 300, -- 5분 간격
    
    -- 추가 메타데이터
    tags JSONB DEFAULT '{}',
    
    -- 인덱스를 위한 파티셔닝 준비
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 리소스 모니터링 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_resource_usage_metrics_solution ON resource_usage_metrics(solution_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_metrics_tenant ON resource_usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_metrics_collected_at ON resource_usage_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_usage_metrics_type ON resource_usage_metrics(metric_type, metric_name);

-- 뷰 생성 (자주 사용하는 조회를 위한 뷰)
CREATE OR REPLACE VIEW solution_resource_summary AS
SELECT 
    ds.id as solution_id,
    ds.solution_name,
    ds.status,
    ds.max_tenants,
    ds.current_tenants,
    ds.max_cpu_cores,
    ds.max_memory_gb,
    ds.current_cpu_usage,
    ds.current_memory_usage,
    ROUND((ds.current_cpu_usage / ds.max_cpu_cores) * 100, 2) as cpu_usage_percent,
    ROUND((ds.current_memory_usage / ds.max_memory_gb) * 100, 2) as memory_usage_percent,
    ROUND((ds.current_tenants::DECIMAL / ds.max_tenants) * 100, 2) as tenant_usage_percent
FROM deployed_solutions ds
WHERE ds.status = 'active';

CREATE OR REPLACE VIEW tenant_resource_allocation AS
SELECT 
    t.id as tenant_id,
    t.tenant_key,
    c.name as company_name,
    ds.solution_name,
    tsm.allocated_cpu_cores,
    tsm.allocated_memory_gb,
    tsm.actual_cpu_usage,
    tsm.actual_memory_usage,
    tsm.status as mapping_status,
    tsm.assigned_at
FROM tenants t
JOIN companies c ON t.company_id = c.id
LEFT JOIN tenant_solution_mappings tsm ON t.id = tsm.tenant_id
LEFT JOIN deployed_solutions ds ON tsm.solution_id = ds.id;

-- 새 테이블 트리거
CREATE TRIGGER update_workspace_templates_updated_at BEFORE UPDATE ON workspace_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deployed_solutions_updated_at BEFORE UPDATE ON deployed_solutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspace_configurations_updated_at BEFORE UPDATE ON workspace_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
