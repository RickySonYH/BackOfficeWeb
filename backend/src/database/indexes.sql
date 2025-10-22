-- [advice from AI] 데이터베이스 인덱스 최적화 스크립트
-- 프로덕션 환경에서 성능 향상을 위한 인덱스 설정

-- Companies 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_business_number 
ON companies(business_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_created_at 
ON companies(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_active 
ON companies(is_active) WHERE is_active = true;

-- Tenants 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_company_id 
ON tenants(company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_tenant_key 
ON tenants(tenant_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_status 
ON tenants(deployment_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_namespace 
ON tenants(kubernetes_namespace);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_created_at 
ON tenants(created_at DESC);

-- 복합 인덱스: 회사별 활성 테넌트 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_company_status 
ON tenants(company_id, deployment_status) 
WHERE deployment_status = 'active';

-- Users 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id 
ON users(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
ON users(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- 복합 인덱스: 테넌트별 활성 사용자 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_active 
ON users(tenant_id, is_active) 
WHERE is_active = true;

-- Workspaces 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_id 
ON workspaces(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_type 
ON workspaces(type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_active 
ON workspaces(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_created_at 
ON workspaces(created_at DESC);

-- 복합 인덱스: 테넌트별 워크스페이스 타입 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_type 
ON workspaces(tenant_id, type, is_active) 
WHERE is_active = true;

-- Tenant DB Connections 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_db_connections_tenant_id 
ON tenant_db_connections(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_db_connections_type 
ON tenant_db_connections(connection_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_db_connections_status 
ON tenant_db_connections(connection_status);

-- Data Initialization Logs 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_tenant_id 
ON data_initialization_logs(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_workspace_id 
ON data_initialization_logs(workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_status 
ON data_initialization_logs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_timestamp 
ON data_initialization_logs(timestamp DESC);

-- 복합 인덱스: 테넌트별 최근 로그 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_tenant_timestamp 
ON data_initialization_logs(tenant_id, timestamp DESC);

-- 복합 인덱스: 상태별 최근 로그 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_init_logs_status_timestamp 
ON data_initialization_logs(status, timestamp DESC);

-- Workspace Mappings 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_mappings_tenant_id 
ON workspace_mappings(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_mappings_workspace_id 
ON workspace_mappings(workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_mappings_priority 
ON workspace_mappings(priority);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_mappings_default 
ON workspace_mappings(is_default) WHERE is_default = true;

-- 복합 인덱스: 테넌트별 워크스페이스 매핑 조회용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_mappings_tenant_priority 
ON workspace_mappings(tenant_id, priority ASC);

-- JSONB 컬럼 인덱스 (워크스페이스 설정)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_config_gin 
ON workspaces USING GIN(configuration);

-- 특정 설정 값 검색용 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_config_type 
ON workspaces USING GIN((configuration->'type'));

-- 텍스트 검색을 위한 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_name_gin 
ON companies USING GIN(to_tsvector('korean', company_name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_name_gin 
ON workspaces USING GIN(to_tsvector('korean', name));

-- 통계 쿼리 최적화를 위한 부분 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_active_count 
ON tenants(deployment_status) 
WHERE deployment_status IN ('active', 'deploying');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_count 
ON users(tenant_id) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_active_count 
ON workspaces(tenant_id, type) 
WHERE is_active = true;

-- 인덱스 사용률 모니터링을 위한 뷰
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 인덱스 크기 모니터링을 위한 뷰
CREATE OR REPLACE VIEW index_size_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_relation_size(indexrelid) as index_size_bytes
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
