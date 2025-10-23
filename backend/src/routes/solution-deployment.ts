// [advice from AI] 솔루션 배포 관리 라우터
import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { UserRole } from '../types/auth';
import {
  registerSolution,
  getSolutions,
  getSolutionDetails,
  assignTenantToSolution,
  findOptimalSolution,
  getResourceSummary,
  getTenantAllocations,
  performHealthCheck,
  performAllHealthChecks,
  deleteSolution
} from '../controllers/solution-deployment.controller';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

/**
 * @route   POST /api/solution-deployment/solutions
 * @desc    새로운 솔루션 배포 등록
 * @access  Admin, Manager
 */
router.post('/solutions', 
  authorize([UserRole.ADMIN, UserRole.MANAGER]), 
  registerSolution
);

/**
 * @route   GET /api/solution-deployment/solutions
 * @desc    배포된 솔루션 목록 조회 (필터링, 정렬, 페이징 지원)
 * @access  Admin, Manager, User
 * @query   page, limit, status, deployment_type, kubernetes_cluster, health_status, 
 *          min_available_cpu, min_available_memory, min_available_tenants,
 *          sort_field, sort_direction
 */
router.get('/solutions', 
  authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]), 
  getSolutions
);

/**
 * @route   GET /api/solution-deployment/solutions/:solutionId
 * @desc    특정 솔루션 상세 정보 조회
 * @access  Admin, Manager, User
 */
router.get('/solutions/:solutionId', 
  authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]), 
  getSolutionDetails
);

/**
 * @route   DELETE /api/solution-deployment/solutions/:solutionId
 * @desc    솔루션 삭제 (모든 관련 리소스 정리)
 * @access  Admin
 * @query   force - true일 경우 활성 테넌트가 있어도 강제 삭제
 */
router.delete('/solutions/:solutionId', 
  authorize([UserRole.ADMIN]), 
  deleteSolution
);

/**
 * @route   POST /api/solution-deployment/assignments
 * @desc    테넌트를 솔루션에 할당
 * @access  Admin, Manager
 * @body    { tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb, allocated_storage_gb, ... }
 */
router.post('/assignments', 
  authorize([UserRole.ADMIN, UserRole.MANAGER]), 
  assignTenantToSolution
);

/**
 * @route   POST /api/solution-deployment/optimal-solution
 * @desc    요구사항에 맞는 최적 솔루션 찾기
 * @access  Admin, Manager
 * @body    { cpu_cores, memory_gb, storage_gb, gpu_count, network_bandwidth }
 */
router.post('/optimal-solution', 
  authorize([UserRole.ADMIN, UserRole.MANAGER]), 
  findOptimalSolution
);

/**
 * @route   GET /api/solution-deployment/resource-summary
 * @desc    솔루션별 리소스 사용률 요약 조회
 * @access  Admin, Manager, User
 */
router.get('/resource-summary', 
  authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]), 
  getResourceSummary
);

/**
 * @route   GET /api/solution-deployment/tenant-allocations
 * @desc    테넌트별 리소스 할당 현황 조회
 * @access  Admin, Manager
 */
router.get('/tenant-allocations', 
  authorize([UserRole.ADMIN, UserRole.MANAGER]), 
  getTenantAllocations
);

/**
 * @route   POST /api/solution-deployment/solutions/:solutionId/health-check
 * @desc    특정 솔루션 헬스 체크 수행
 * @access  Admin, Manager, User
 */
router.post('/solutions/:solutionId/health-check', 
  authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]), 
  performHealthCheck
);

/**
 * @route   POST /api/solution-deployment/health-checks/all
 * @desc    모든 활성 솔루션 헬스 체크 수행
 * @access  Admin, Manager
 */
router.post('/health-checks/all', 
  authorize([UserRole.ADMIN, UserRole.MANAGER]), 
  performAllHealthChecks
);

export default router;
