// [advice from AI] 지식 데이터 관리 라우트

import { Router } from 'express';
import {
  uploadMiddleware,
  uploadKnowledgeDocument,
  searchKnowledgeDocuments,
  getKnowledgeDocuments,
  getKnowledgeDocumentById,
  deleteKnowledgeDocument,
  getProcessingStatus,
  getKnowledgeBaseStats,
  reprocessKnowledgeDocument
} from '../controllers/knowledge-data.controller';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth';

const router = Router();

// [advice from AI] 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

// [advice from AI] GET /api/knowledge-data/:workspaceId - 지식 문서 목록 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId', getKnowledgeDocuments);

// [advice from AI] GET /api/knowledge-data/:workspaceId/stats - 지식 베이스 통계 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId/stats', getKnowledgeBaseStats);

// [advice from AI] GET /api/knowledge-data/:workspaceId/document/:documentId - 지식 문서 상세 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:workspaceId/document/:documentId', getKnowledgeDocumentById);

// [advice from AI] GET /api/knowledge-data/document/:documentId/processing-status - 문서 처리 상태 조회
// 모든 인증된 사용자가 접근 가능
router.get('/document/:documentId/processing-status', getProcessingStatus);

// [advice from AI] POST /api/knowledge-data/:workspaceId/search - 지식 문서 검색
// 모든 인증된 사용자가 접근 가능
router.post('/:workspaceId/search', searchKnowledgeDocuments);

// [advice from AI] POST /api/knowledge-data/:workspaceId/upload - 지식 문서 업로드
// 매니저 이상 권한 필요
router.post('/:workspaceId/upload', requireManagerOrAdmin, uploadMiddleware, uploadKnowledgeDocument);

// [advice from AI] POST /api/knowledge-data/document/:documentId/reprocess - 지식 문서 재처리
// 매니저 이상 권한 필요
router.post('/document/:documentId/reprocess', requireManagerOrAdmin, reprocessKnowledgeDocument);

// [advice from AI] DELETE /api/knowledge-data/document/:documentId - 지식 문서 삭제
// 매니저 이상 권한 필요
router.delete('/document/:documentId', requireManagerOrAdmin, deleteKnowledgeDocument);

export default router;
