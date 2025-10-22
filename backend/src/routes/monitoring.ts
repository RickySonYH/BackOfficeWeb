// [advice from AI] 모니터링 API 라우터

import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const monitoringController = new MonitoringController();

// 모든 모니터링 라우트에 인증 미들웨어 적용
router.use(authenticate);

/**
 * 실시간 메트릭 관련 라우트
 */

// GET /api/monitoring/realtime - 실시간 메트릭 조회
router.get('/realtime', monitoringController.getRealTimeMetrics);

// GET /api/monitoring/metrics/history - 히스토리 메트릭 조회
router.get('/metrics/history', monitoringController.getHistoricalMetrics);

// GET /api/monitoring/status - 시스템 상태 요약
router.get('/status', monitoringController.getSystemStatus);

/**
 * 리소스별 메트릭 라우트
 */

// GET /api/monitoring/tenants/:tenantId/metrics - 테넌트별 메트릭
router.get('/tenants/:tenantId/metrics', monitoringController.getTenantMetrics);

// GET /api/monitoring/workspaces/:workspaceId/metrics - 워크스페이스별 메트릭
router.get('/workspaces/:workspaceId/metrics', monitoringController.getWorkspaceMetrics);

// GET /api/monitoring/solutions/:solutionId/metrics - 솔루션별 메트릭
router.get('/solutions/:solutionId/metrics', monitoringController.getSolutionMetrics);

/**
 * 분석 및 예측 라우트
 */

// GET /api/monitoring/capacity/forecast - 용량 예측
router.get('/capacity/forecast', monitoringController.getCapacityForecast);

// GET /api/monitoring/optimization/suggestions - 최적화 제안
router.get('/optimization/suggestions', monitoringController.getOptimizationSuggestions);

/**
 * 알림 관련 라우트
 */

// GET /api/monitoring/alerts - 활성 알림 조회
router.get('/alerts', monitoringController.getActiveAlerts);

/**
 * 리포트 관련 라우트
 */

// POST /api/monitoring/reports/performance - 성능 리포트 생성
router.post('/reports/performance', monitoringController.generatePerformanceReport);

/**
 * 대시보드 관련 라우트
 */

// GET /api/monitoring/dashboard/config - 대시보드 설정 조회
router.get('/dashboard/config', monitoringController.getDashboardConfig);

export default router;
