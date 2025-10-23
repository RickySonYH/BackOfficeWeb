// backend/src/routes/tenants.ts

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { tenantService } from '../services/tenant.service';
import { kubernetesService } from '../services/kubernetes.service';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/auth';
import Joi from 'joi';

const router = Router();

// [advice from AI] 요청 데이터 검증 스키마
const createTenantSchema = Joi.object({
  company_id: Joi.string().uuid().required(),
  tenant_key: Joi.string().min(3).max(50).optional(),
  kubernetes_namespace: Joi.string().min(3).max(63).optional()
});

const createDbConnectionSchema = Joi.object({
  connection_type: Joi.string().valid('postgresql', 'mongodb').required(),
  host: Joi.string().min(1).max(255).required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  database_name: Joi.string().min(1).max(100).required(),
  username: Joi.string().min(1).max(100).required(),
  password: Joi.string().min(1).max(255).required()
});

// [advice from AI] GET /api/tenants - 테넌트 목록 조회 (회사별 필터링 지원)
router.get('/', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const companyId = req.query.company_id as string;

    // 페이지네이션 유효성 검증
    if (page < 1 || limit < 1 || limit > 100) {
      return next(new ApiError(400, 'Invalid pagination parameters'));
    }

    const result = await tenantService.getTenants(page, limit, companyId);
    const totalPages = Math.ceil(result.total / limit);

    res.json({
      success: true,
      data: {
        tenants: result.tenants,
        total: result.total,
        page,
        limit,
        totalPages
      },
      message: 'Tenants retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get tenants:', error);
    next(new ApiError(500, 'Failed to retrieve tenants'));
  }
});

// [advice from AI] POST /api/tenants - 테넌트 생성
router.post('/', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 요청 데이터 검증
    const { error, value } = createTenantSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0]?.message || 'Validation error'));
    }

    const tenant = await tenantService.createTenant(value);

    logger.info('Tenant created successfully', {
      tenantId: tenant.id,
      tenantKey: tenant.tenant_key,
      companyId: tenant.company_id,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });

  } catch (error) {
    logger.error('Failed to create tenant:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Company not found') {
        return next(new ApiError(404, 'Company not found'));
      }
      if (error.message === 'Tenant key already exists') {
        return next(new ApiError(409, 'Tenant key already exists'));
      }
    }
    
    next(new ApiError(500, 'Failed to create tenant'));
  }
});

// [advice from AI] GET /api/tenants/:id - 테넌트 상세 정보 조회
router.get('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    res.json({
      success: true,
      data: tenant,
      message: 'Tenant retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get tenant:', error);
    next(new ApiError(500, 'Failed to retrieve tenant'));
  }
});

// [advice from AI] GET /api/tenants/:id/db-connections - 테넌트 DB 연결 정보 조회
router.get('/:id/db-connections', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    const connections = await tenantService.getTenantDbConnections(tenantId);

    res.json({
      success: true,
      data: connections,
      message: 'Database connections retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get tenant database connections:', error);
    next(new ApiError(500, 'Failed to retrieve database connections'));
  }
});

// [advice from AI] POST /api/tenants/:id/db-connections - DB 연결 정보 등록
router.post('/:id/db-connections', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 요청 데이터 검증
    const { error, value } = createDbConnectionSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0]?.message || 'Validation error'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    const connection = await tenantService.createTenantDbConnection(tenantId, value);

    logger.info('Database connection created successfully', {
      connectionId: connection.id,
      tenantId,
      connectionType: connection.connection_type,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: connection,
      message: 'Database connection created successfully'
    });

  } catch (error) {
    logger.error('Failed to create database connection:', error);
    next(new ApiError(500, 'Failed to create database connection'));
  }
});

// [advice from AI] POST /api/tenants/:id/db-connections/:connectionId/test - DB 연결 테스트
router.post('/:id/db-connections/:connectionId/test', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;
    const connectionId = req.params.connectionId;

    // UUID 형식 검증
    if (!tenantId || !connectionId || 
        !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
        !connectionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    // 연결 정보 조회
    const connections = await tenantService.getTenantDbConnections(tenantId);
    const connection = connections.find(c => c.id === connectionId);
    
    if (!connection) {
      return next(new ApiError(404, 'Database connection not found'));
    }

    // 연결 테스트를 위한 데이터 준비 (비밀번호 복호화는 서비스에서 처리)
    const testData = {
      connection_type: connection.connection_type,
      host: connection.host,
      port: connection.port,
      database_name: connection.database_name,
      username: connection.username,
      password: '' // 실제 구현에서는 복호화된 비밀번호 사용
    };

    const testResult = await tenantService.testDatabaseConnection(connectionId, testData);

    logger.info('Database connection test completed', {
      connectionId,
      tenantId,
      success: testResult.success,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: testResult,
      message: 'Database connection test completed'
    });

  } catch (error) {
    logger.error('Failed to test database connection:', error);
    next(new ApiError(500, 'Failed to test database connection'));
  }
});

// [advice from AI] GET /api/tenants/:id/kubernetes - Kubernetes 네임스페이스 상태 조회
router.get('/:id/kubernetes', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    // Kubernetes 네임스페이스 상태 조회
    const namespaceStatus = await kubernetesService.getNamespaceStatus(tenant.kubernetes_namespace);

    res.json({
      success: true,
      data: {
        tenantId,
        tenantKey: tenant.tenant_key,
        namespace: tenant.kubernetes_namespace,
        status: namespaceStatus
      },
      message: 'Kubernetes namespace status retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get Kubernetes namespace status:', error);
    next(new ApiError(500, 'Failed to retrieve Kubernetes namespace status'));
  }
});

// [advice from AI] GET /api/tenants/:id/kubernetes/pods - 네임스페이스 Pod 목록 조회
router.get('/:id/kubernetes/pods', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    // Pod 목록 조회
    const podsResult = await kubernetesService.getNamespacePods(tenant.kubernetes_namespace);
    
    if (!podsResult.success) {
      return next(new ApiError(500, podsResult.error || 'Failed to retrieve pods'));
    }

    res.json({
      success: true,
      data: {
        tenantId,
        namespace: tenant.kubernetes_namespace,
        pods: podsResult.pods || []
      },
      message: 'Pods retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get namespace pods:', error);
    next(new ApiError(500, 'Failed to retrieve namespace pods'));
  }
});

// [advice from AI] POST /api/tenants/:id/kubernetes/create - Kubernetes 네임스페이스 생성
router.post('/:id/kubernetes/create', authenticate, authorize([UserRole.ADMIN]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    // Kubernetes 네임스페이스 생성
    const result = await kubernetesService.createNamespace(tenant.tenant_key);
    
    if (!result.success) {
      return next(new ApiError(500, result.error || 'Failed to create Kubernetes namespace'));
    }

    // 테넌트 배포 상태 업데이트
    await tenantService.updateTenantDeploymentStatus(tenantId, 'active');

    logger.info('Kubernetes namespace created successfully', {
      tenantId,
      tenantKey: tenant.tenant_key,
      namespaceName: result.namespaceName,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: {
        tenantId,
        tenantKey: tenant.tenant_key,
        namespaceName: result.namespaceName
      },
      message: 'Kubernetes namespace created successfully'
    });

  } catch (error) {
    logger.error('Failed to create Kubernetes namespace:', error);
    next(new ApiError(500, 'Failed to create Kubernetes namespace'));
  }
});

// [advice from AI] DELETE /api/tenants/:id/kubernetes - Kubernetes 네임스페이스 삭제
router.delete('/:id/kubernetes', authenticate, authorize([UserRole.ADMIN]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.params.id;

    // UUID 형식 검증
    if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next(new ApiError(400, 'Invalid tenant ID format'));
    }

    // 테넌트 존재 확인
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return next(new ApiError(404, 'Tenant not found'));
    }

    // Kubernetes 네임스페이스 삭제
    const result = await kubernetesService.deleteNamespace(tenant.kubernetes_namespace);
    
    if (!result.success) {
      return next(new ApiError(500, result.error || 'Failed to delete Kubernetes namespace'));
    }

    // 테넌트 배포 상태 업데이트
    await tenantService.updateTenantDeploymentStatus(tenantId, 'inactive');

    logger.info('Kubernetes namespace deleted successfully', {
      tenantId,
      tenantKey: tenant.tenant_key,
      namespaceName: tenant.kubernetes_namespace,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: {
        tenantId,
        namespaceName: tenant.kubernetes_namespace
      },
      message: 'Kubernetes namespace deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete Kubernetes namespace:', error);
    next(new ApiError(500, 'Failed to delete Kubernetes namespace'));
  }
});

// [advice from AI] GET /api/tenants/kubernetes/cluster-status - Kubernetes 클러스터 연결 상태 확인
router.get('/kubernetes/cluster-status', authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await kubernetesService.testClusterConnection();

    res.json({
      success: true,
      data: result,
      message: 'Cluster connection status retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to test cluster connection:', error);
    next(new ApiError(500, 'Failed to test cluster connection'));
  }
});

export default router;
