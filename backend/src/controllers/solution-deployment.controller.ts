// [advice from AI] 솔루션 배포 관리 컨트롤러
import { Request, Response } from 'express';
import { SolutionDeploymentService } from '../services/solution-deployment.service';
import { logger } from '../utils/logger';
import {
  SolutionDeploymentRequest,
  TenantAssignmentRequest,
  ResourceRequirements,
  SolutionFilter,
  SolutionSortOptions,
  TenantMappingFilter
} from '../types/solution-deployment';
import Joi from 'joi';

const solutionDeploymentService = new SolutionDeploymentService();

// 유효성 검증 스키마
const solutionDeploymentSchema = Joi.object({
  solution_name: Joi.string().required().min(1).max(255),
  solution_version: Joi.string().required().min(1).max(50),
  deployment_url: Joi.string().required().uri(),
  deployment_type: Joi.string().valid('kubernetes', 'docker', 'vm', 'cloud').required(),
  
  hardware_spec: Joi.object({
    cpu_cores: Joi.number().positive().required(),
    memory_gb: Joi.number().positive().required(),
    storage_gb: Joi.number().positive().required(),
    gpu_count: Joi.number().integer().min(0).default(0)
  }).required(),
  
  max_tenants: Joi.number().integer().positive().required(),
  max_cpu_cores: Joi.number().positive().required(),
  max_memory_gb: Joi.number().positive().required(),
  
  kubernetes_cluster: Joi.string().optional(),
  kubernetes_namespace: Joi.string().optional(),
  internal_ip: Joi.string().ip().optional(),
  external_ip: Joi.string().ip().optional(),
  port_mappings: Joi.object().optional(),
  
  health_check_url: Joi.string().uri().optional(),
  deployment_config: Joi.object().optional(),
  monitoring_config: Joi.object().optional(),
  backup_config: Joi.object().optional()
});

const tenantAssignmentSchema = Joi.object({
  tenant_id: Joi.string().uuid().required(),
  solution_id: Joi.string().uuid().required(),
  allocated_cpu_cores: Joi.number().positive().default(0.5),
  allocated_memory_gb: Joi.number().positive().default(1.0),
  allocated_storage_gb: Joi.number().positive().default(10.0),
  assigned_subdomain: Joi.string().optional(),
  assigned_ports: Joi.array().items(Joi.number().integer().min(1).max(65535)).optional(),
  priority: Joi.number().integer().min(0).default(0)
});

/**
 * 새로운 솔루션 배포 등록
 */
export const registerSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = solutionDeploymentSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(d => d.message),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const requestData: SolutionDeploymentRequest = {
      ...value,
      deployed_by: req.user?.id
    };

    const solution = await solutionDeploymentService.registerDeployedSolution(requestData);

    logger.info('Solution registered successfully', {
      solutionId: solution.id,
      userId: req.user?.id,
      solutionName: solution.solution_name
    });

    res.status(201).json({
      success: true,
      data: solution,
      message: 'Solution registered successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to register solution', {
      error: error.message,
      userId: req.user?.id,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register solution',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 배포된 솔루션 목록 조회
 */
export const getSolutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 필터 파라미터 파싱
    const filter: SolutionFilter = {
      status: req.query.status ? (req.query.status as string).split(',') : undefined,
      deployment_type: req.query.deployment_type ? (req.query.deployment_type as string).split(',') : undefined,
      kubernetes_cluster: req.query.kubernetes_cluster as string,
      health_status: req.query.health_status ? (req.query.health_status as string).split(',') : undefined,
      min_available_cpu: req.query.min_available_cpu ? parseFloat(req.query.min_available_cpu as string) : undefined,
      min_available_memory: req.query.min_available_memory ? parseFloat(req.query.min_available_memory as string) : undefined,
      min_available_tenants: req.query.min_available_tenants ? parseInt(req.query.min_available_tenants as string) : undefined
    };

    // 정렬 파라미터 파싱
    const sort: SolutionSortOptions = {
      field: (req.query.sort_field as any) || 'created_at',
      direction: (req.query.sort_direction as 'asc' | 'desc') || 'desc'
    };

    // WHERE 절 구성
    const whereConditions: string[] = ['1=1'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filter.status && filter.status.length > 0) {
      whereConditions.push(`status = ANY($${paramIndex})`);
      queryParams.push(filter.status);
      paramIndex++;
    }

    if (filter.deployment_type && filter.deployment_type.length > 0) {
      whereConditions.push(`deployment_type = ANY($${paramIndex})`);
      queryParams.push(filter.deployment_type);
      paramIndex++;
    }

    if (filter.kubernetes_cluster) {
      whereConditions.push(`kubernetes_cluster = $${paramIndex}`);
      queryParams.push(filter.kubernetes_cluster);
      paramIndex++;
    }

    if (filter.health_status && filter.health_status.length > 0) {
      whereConditions.push(`health_status = ANY($${paramIndex})`);
      queryParams.push(filter.health_status);
      paramIndex++;
    }

    if (filter.min_available_cpu) {
      whereConditions.push(`(max_cpu_cores - current_cpu_usage) >= $${paramIndex}`);
      queryParams.push(filter.min_available_cpu);
      paramIndex++;
    }

    if (filter.min_available_memory) {
      whereConditions.push(`(max_memory_gb - current_memory_usage) >= $${paramIndex}`);
      queryParams.push(filter.min_available_memory);
      paramIndex++;
    }

    if (filter.min_available_tenants) {
      whereConditions.push(`(max_tenants - current_tenants) >= $${paramIndex}`);
      queryParams.push(filter.min_available_tenants);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 정렬 필드 검증
    const validSortFields = ['solution_name', 'created_at', 'updated_at', 'status', 'current_tenants'];
    const sortField = validSortFields.includes(sort.field) ? sort.field : 'created_at';
    const sortDirection = sort.direction === 'asc' ? 'ASC' : 'DESC';

    // 총 개수 조회
    const { Pool } = require('pg');
    const pool = new Pool(); // 기존 pool 사용
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM deployed_solutions 
      WHERE ${whereClause}
    `, queryParams);
    
    const total = parseInt(countResult.rows[0].total);

    // 데이터 조회
    queryParams.push(limit, offset);
    const dataResult = await pool.query(`
      SELECT ds.*, u.username as deployed_by_username
      FROM deployed_solutions ds
      LEFT JOIN users u ON ds.deployed_by = u.id
      WHERE ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    res.json({
      success: true,
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get solutions', {
      error: error.message,
      userId: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get solutions',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 특정 솔루션 상세 정보 조회
 */
export const getSolutionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { solutionId } = req.params;

    if (!solutionId) {
      res.status(400).json({
        success: false,
        error: 'Solution ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const solution = await solutionDeploymentService.getSolutionDetails(solutionId);

    if (!solution) {
      res.status(404).json({
        success: false,
        error: 'Solution not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: solution,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get solution details', {
      error: error.message,
      userId: req.user?.id,
      solutionId: req.params.solutionId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get solution details',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 테넌트를 솔루션에 할당
 */
export const assignTenantToSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = tenantAssignmentSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details.map(d => d.message),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const requestData: TenantAssignmentRequest = {
      ...value,
      assigned_by: req.user?.id
    };

    const mapping = await solutionDeploymentService.assignTenantToSolution(requestData);

    logger.info('Tenant assigned to solution successfully', {
      mappingId: mapping.id,
      tenantId: requestData.tenant_id,
      solutionId: requestData.solution_id,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: mapping,
      message: 'Tenant assigned to solution successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to assign tenant to solution', {
      error: error.message,
      userId: req.user?.id,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign tenant to solution',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 최적 솔루션 찾기
 */
export const findOptimalSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const requirements: ResourceRequirements = {
      cpu_cores: req.body.cpu_cores || 0.5,
      memory_gb: req.body.memory_gb || 1.0,
      storage_gb: req.body.storage_gb || 10.0,
      gpu_count: req.body.gpu_count || 0,
      network_bandwidth: req.body.network_bandwidth
    };

    const optimalSolutionId = await solutionDeploymentService.getOptimalSolutionForTenant(requirements);

    if (!optimalSolutionId) {
      res.status(404).json({
        success: false,
        error: 'No optimal solution found for the given requirements',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const solution = await solutionDeploymentService.getSolutionDetails(optimalSolutionId);

    res.json({
      success: true,
      data: {
        optimal_solution_id: optimalSolutionId,
        solution_details: solution,
        requirements
      },
      message: 'Optimal solution found',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to find optimal solution', {
      error: error.message,
      userId: req.user?.id,
      requirements: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find optimal solution',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 솔루션 리소스 사용률 요약 조회
 */
export const getResourceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await solutionDeploymentService.getSolutionResourceSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get resource summary', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get resource summary',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 테넌트 리소스 할당 현황 조회
 */
export const getTenantAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const allocations = await solutionDeploymentService.getTenantResourceAllocations();

    res.json({
      success: true,
      data: allocations,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get tenant allocations', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tenant allocations',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 솔루션 헬스 체크 수행
 */
export const performHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { solutionId } = req.params;

    if (!solutionId) {
      res.status(400).json({
        success: false,
        error: 'Solution ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const healthStatus = await solutionDeploymentService.performHealthCheck(solutionId);

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to perform health check', {
      error: error.message,
      userId: req.user?.id,
      solutionId: req.params.solutionId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform health check',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 모든 솔루션 헬스 체크 수행
 */
export const performAllHealthChecks = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthChecks = await solutionDeploymentService.performAllHealthChecks();

    res.json({
      success: true,
      data: healthChecks,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to perform all health checks', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform all health checks',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 솔루션 삭제
 */
export const deleteSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { solutionId } = req.params;
    const force = req.query.force === 'true';

    if (!solutionId) {
      res.status(400).json({
        success: false,
        error: 'Solution ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    await solutionDeploymentService.deleteSolution(solutionId, force);

    logger.info('Solution deleted successfully', {
      solutionId,
      force,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Solution deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to delete solution', {
      error: error.message,
      userId: req.user?.id,
      solutionId: req.params.solutionId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete solution',
      timestamp: new Date().toISOString()
    });
  }
};
