-- [advice from AI] AICC Operations Management Platform 초기 데이터
-- 샘플 데이터 및 기본 설정

-- [advice from AI] 1. 샘플 회사 데이터
INSERT INTO companies (id, name, business_number, contract_date, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ABC 콜센터', '123-45-67890', '2024-01-15', 'active'),
('550e8400-e29b-41d4-a716-446655440002', '글로벌 고객센터', '234-56-78901', '2024-02-01', 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'XYZ 텔레마케팅', '345-67-89012', '2024-01-20', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 2. 샘플 테넌트 데이터
INSERT INTO tenants (id, company_id, tenant_key, kubernetes_namespace, deployment_status) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'abc-callcenter-20240115', 'aicc-abc-callcenter', 'active'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'global-cs-20240201', 'aicc-global-cs', 'active'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'xyz-telemarketing-20240120', 'aicc-xyz-telemarketing', 'pending')
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 3. 샘플 사용자 데이터
INSERT INTO users (id, tenant_id, username, email, ecp_user_id, role, is_active) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'admin_abc', 'admin@abc-callcenter.com', 'ecp_user_001', 'admin', true),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'manager_abc', 'manager@abc-callcenter.com', 'ecp_user_002', 'manager', true),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'admin_global', 'admin@global-cs.com', 'ecp_user_003', 'admin', true),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'user_global', 'user@global-cs.com', 'ecp_user_004', 'user', true)
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 4. 샘플 워크스페이스 데이터
INSERT INTO workspaces (id, tenant_id, name, type, config_data, status, is_default, priority) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '기본 KMS', 'KMS', '{"similarity_threshold": 0.8, "top_k": 5, "embedding_model": "text-embedding-ada-002"}', 'active', true, 1),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '상담 어드바이저', 'ADVISOR', '{"response_templates": ["greeting", "closing"], "trigger_conditions": ["customer_angry", "technical_issue"]}', 'active', true, 1),
('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '글로벌 KMS', 'KMS', '{"similarity_threshold": 0.75, "top_k": 10, "embedding_model": "text-embedding-ada-002", "language": "multilingual"}', 'active', true, 1)
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 5. 샘플 DB 연결 정보 (암호화된 비밀번호)
INSERT INTO tenant_db_connections (id, tenant_id, db_type, connection_host, connection_port, database_name, username, password_encrypted, connection_status, last_tested_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'postgres', 'abc-postgres.aicc-abc-callcenter.svc.cluster.local', 5432, 'abc_callcenter_db', 'abc_user', crypt('abc_password_123', gen_salt('bf')), 'connected', CURRENT_TIMESTAMP),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'mongodb', 'abc-mongodb.aicc-abc-callcenter.svc.cluster.local', 27017, 'abc_callcenter_mongo', 'abc_mongo_user', crypt('abc_mongo_pass_456', gen_salt('bf')), 'connected', CURRENT_TIMESTAMP),
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'postgres', 'global-postgres.aicc-global-cs.svc.cluster.local', 5432, 'global_cs_db', 'global_user', crypt('global_password_789', gen_salt('bf')), 'connected', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 6. 샘플 초기화 로그 데이터
INSERT INTO data_initialization_logs (id, tenant_id, workspace_id, action_type, status, details, executed_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', NULL, 'SCHEMA_INIT', 'SUCCESS', '{"tables_created": 5, "indexes_created": 8, "duration_ms": 1250}', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'DATA_SEED', 'SUCCESS', '{"files_processed": 3, "records_inserted": 150, "file_types": ["csv", "json"]}', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 'CONFIG_APPLY', 'SUCCESS', '{"config_sections": ["embedding", "search_params"], "restart_required": false}', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('aa0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', 'SCHEMA_INIT', 'IN_PROGRESS', '{"progress": "Creating indexes", "step": 3, "total_steps": 5}', CURRENT_TIMESTAMP - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- [advice from AI] 통계 뷰 생성 (대시보드용)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM companies WHERE status = 'active') as active_companies,
    (SELECT COUNT(*) FROM tenants WHERE deployment_status = 'active') as active_tenants,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
    (SELECT COUNT(*) FROM workspaces WHERE status = 'active') as active_workspaces,
    (SELECT COUNT(*) FROM data_initialization_logs WHERE status = 'SUCCESS' AND created_at > CURRENT_DATE) as successful_inits_today,
    (SELECT COUNT(*) FROM data_initialization_logs WHERE status = 'FAILED' AND created_at > CURRENT_DATE) as failed_inits_today,
    (SELECT COUNT(*) FROM data_initialization_logs WHERE status = 'IN_PROGRESS') as in_progress_inits;

-- [advice from AI] 최근 활동 뷰 생성
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    'company' as activity_type,
    c.name as title,
    c.created_at as activity_time,
    'Company registered' as description
FROM companies c
WHERE c.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'

UNION ALL

SELECT 
    'tenant' as activity_type,
    t.tenant_key as title,
    t.created_at as activity_time,
    'Tenant created' as description
FROM tenants t
WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'

UNION ALL

SELECT 
    'initialization' as activity_type,
    CONCAT(dil.action_type, ' - ', t.tenant_key) as title,
    dil.created_at as activity_time,
    CONCAT('Status: ', dil.status) as description
FROM data_initialization_logs dil
JOIN tenants t ON dil.tenant_id = t.id
WHERE dil.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'

ORDER BY activity_time DESC
LIMIT 10;
