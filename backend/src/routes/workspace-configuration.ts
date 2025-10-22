// [advice from AI] 워크스페이스 설정 관리 라우트

import { Router } from 'express';
import {
  getWorkspaceConfiguration,
  getConfigurationByCategory,
  updateConfiguration,
  bulkUpdateConfiguration,
  rollbackConfiguration,
  getConfigurationHistory,
  validateConfiguration,
  getConfigurationTemplates,
  deployConfiguration,
  exportConfiguration,
  importConfiguration
} from '../controllers/workspace-configuration.controller';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth';

const router = Router();

// [advice from AI] 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// [advice from AI] GET /api/workspace-configuration/templates/:workspaceType - 설정 템플릿 조회
// 모든 인증된 사용자가 접근 가능
router.get('/templates/:workspaceType', getConfigurationTemplates);

// [advice from AI] GET /api/workspace-configuration/:workspaceId - 워크스페이스 전체 설정 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId', getWorkspaceConfiguration);

// [advice from AI] GET /api/workspace-configuration/:workspaceId/category/:category - 카테고리별 설정 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId/category/:category', getConfigurationByCategory);

// [advice from AI] GET /api/workspace-configuration/:workspaceId/history - 설정 변경 히스토리 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId/history', getConfigurationHistory);

// [advice from AI] POST /api/workspace-configuration/:workspaceId/validate - 설정 유효성 검증
// 매니저 이상 권한 필요
router.post('/:workspaceId/validate', requireManagerOrAdmin, validateConfiguration);

// [advice from AI] PUT /api/workspace-configuration/:workspaceId - 설정 업데이트
// 매니저 이상 권한 필요
router.put('/:workspaceId', requireManagerOrAdmin, updateConfiguration);

// [advice from AI] PUT /api/workspace-configuration/:workspaceId/bulk - 대량 설정 업데이트
// 매니저 이상 권한 필요
router.put('/:workspaceId/bulk', requireManagerOrAdmin, bulkUpdateConfiguration);

// [advice from AI] POST /api/workspace-configuration/:workspaceId/rollback - 설정 롤백
// 매니저 이상 권한 필요
router.post('/:workspaceId/rollback', requireManagerOrAdmin, rollbackConfiguration);

// [advice from AI] POST /api/workspace-configuration/:workspaceId/deploy - 설정 배포
// 매니저 이상 권한 필요
router.post('/:workspaceId/deploy', requireManagerOrAdmin, deployConfiguration);

// [advice from AI] GET /api/workspace-configuration/:workspaceId/export - 설정 내보내기
// 매니저 이상 권한 필요
router.get('/:workspaceId/export', requireManagerOrAdmin, exportConfiguration);

// [advice from AI] POST /api/workspace-configuration/:workspaceId/import - 설정 가져오기
// 매니저 이상 권한 필요
router.post('/:workspaceId/import', requireManagerOrAdmin, importConfiguration);

export default router;
