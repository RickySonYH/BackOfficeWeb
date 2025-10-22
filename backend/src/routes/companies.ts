// [advice from AI] 회사 관리 라우트
import { Router } from 'express';
import { 
  getCompanies, 
  getCompanyById, 
  createCompany, 
  createCompleteCompanySetup,
  updateCompany, 
  deleteCompany 
} from '../controllers/companies.controller';
import { authenticateToken, requireManagerOrAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

// [advice from AI] 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// [advice from AI] GET /api/companies - 회사 목록 조회 (페이지네이션)
// 모든 인증된 사용자가 접근 가능
router.get('/', getCompanies);

// [advice from AI] GET /api/companies/:id - 회사 상세 조회
// 모든 인증된 사용자가 접근 가능
router.get('/:id', getCompanyById);

// [advice from AI] POST /api/companies - 회사 등록 (기본)
// 매니저 이상 권한 필요
router.post('/', requireManagerOrAdmin, createCompany);

// [advice from AI] POST /api/companies/complete-setup - 완전한 회사 설정 생성
// 관리자 권한 필요 (테넌트, 워크스페이스, 관리자 계정까지 모두 생성)
router.post('/complete-setup', requireAdmin, createCompleteCompanySetup);

// [advice from AI] PUT /api/companies/:id - 회사 수정
// 매니저 이상 권한 필요
router.put('/:id', requireManagerOrAdmin, updateCompany);

// [advice from AI] DELETE /api/companies/:id - 회사 삭제
// 관리자 권한 필요 (중요한 작업이므로)
router.delete('/:id', requireAdmin, deleteCompany);

export default router;
