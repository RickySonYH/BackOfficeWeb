// [advice from AI] 강화된 RBAC 시스템 라우터

import { Router } from 'express';
import { EnhancedRbacController } from '../controllers/enhanced-rbac.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const rbacController = new EnhancedRbacController();

// 모든 RBAC 라우트에 인증 미들웨어 적용
router.use(authenticate);

/**
 * 권한 확인 관련 라우트
 */

// POST /api/rbac/permissions/check - 단일 권한 확인
router.post('/permissions/check', rbacController.checkPermission);

// POST /api/rbac/permissions/bulk-check - 대량 권한 확인
router.post('/permissions/bulk-check', rbacController.bulkCheckPermissions);

// GET /api/rbac/permissions/statistics - 권한 통계 조회
router.get('/permissions/statistics', rbacController.getPermissionStatistics);

// GET /api/rbac/permissions/audit-logs - 권한 감사 로그 조회
router.get('/permissions/audit-logs', rbacController.getPermissionAuditLogs);

// GET /api/rbac/permissions/matrix - 권한 매트릭스 조회
router.get('/permissions/matrix', rbacController.getPermissionMatrix);

/**
 * 역할 관리 관련 라우트
 */

// POST /api/rbac/roles - 역할 생성
router.post('/roles', rbacController.createRole);

// POST /api/rbac/roles/assign - 역할 할당
router.post('/roles/assign', rbacController.assignRole);

// GET /api/rbac/roles/hierarchy - 역할 계층 구조 조회
router.get('/roles/hierarchy', rbacController.getRoleHierarchy);

/**
 * 사용자 권한 관련 라우트
 */

// GET /api/rbac/users/:userId/permissions - 사용자 권한 요약 조회
router.get('/users/:userId/permissions', rbacController.getUserPermissionSummary);

/**
 * ECP 연동 관련 라우트
 */

// POST /api/rbac/ecp/mappings - ECP 역할 매핑 생성
router.post('/ecp/mappings', rbacController.createEcpRoleMapping);

// POST /api/rbac/ecp/sync/full - 전체 ECP 동기화 실행
router.post('/ecp/sync/full', rbacController.performFullEcpSync);

// POST /api/rbac/ecp/sync/incremental - 증분 ECP 동기화 실행
router.post('/ecp/sync/incremental', rbacController.performIncrementalEcpSync);

// POST /api/rbac/ecp/sync/users/:userId - 특정 사용자 ECP 동기화
router.post('/ecp/sync/users/:userId', rbacController.syncSpecificUser);

// GET /api/rbac/ecp/connection - ECP 연결 상태 확인
router.get('/ecp/connection', rbacController.checkEcpConnection);

// GET /api/rbac/ecp/sync/history - ECP 동기화 히스토리 조회
router.get('/ecp/sync/history', rbacController.getEcpSyncHistory);

export default router;
