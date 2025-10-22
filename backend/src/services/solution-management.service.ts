// [advice from AI] 배포 솔루션 관리 서비스
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { DeployedSolution, TenantSolutionMapping } from '../types/company-lifecycle';

export interface RegisterSolutionRequest {
  solution_name: string;
  solution_version: string;
  deployment_url: string;
  deployment_type?: 'kubernetes' | 'docker' | 'vm' | 'cloud';
  hardware_spec: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    gpu_count?: number;
  };
  max_tenants: number;
  max_cpu_cores: number;
  max_memory_gb: number;
  kubernetes_cluster?: string;
  kubernetes_namespace?: string;
  health_check_url?: string;
  deployment_config?: Record<string, any>;
  deployed_by?: string;
}

export interface UpdateSolutionRequest {
  solution_name?: string;
  solution_version?: string;
  deployment_url?: string;
  hardware_spec?: {
    cpu_cores?: number;
    memory_gb?: number;
    storage_gb?: number;
    gpu_count?: number;
  };
  max_tenants?: number;
  max_cpu_cores?: number;
  max_memory_gb?: number;
  status?: 'pending' | 'deploying' | 'active' | 'maintenance' | 'failed' | 'retired';
  health_check_url?: string;
  deployment_config?: Record<string, any>;
}

export interface AssignTenantRequest {
  tenant_id: string;
  solution_id: string;
  allocated_cpu_cores: number;
  allocated_memory_gb: number;
  allocated_storage_gb: number;
  priority?: number;
  assigned_by?: string;
}

export class SolutionManagementService {

  /**
   * 배포된 솔루션 등록
   */
  async registerSolution(data: RegisterSolutionRequest): Promise<DeployedSolution> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO deployed_solutions (
          solution_name, solution_version, deployment_url, deployment_type,
          hardware_spec, max_tenants, max_cpu_cores, max_memory_gb,
          kubernetes_cluster, kubernetes_namespace, health_check_url,
          deployment_config, deployed_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, solution_name, solution_version, deployment_url, deployment_type,
                  hardware_spec, max_tenants, current_tenants, max_cpu_cores, max_memory_gb,
                  current_cpu_usage, current_memory_usage, kubernetes_cluster, kubernetes_namespace,
                  status, health_check_url, last_health_check, health_status, deployment_config,
                  deployed_by, deployed_at, created_at, updated_at
      `, [
        data.solution_name,
        data.solution_version,
        data.deployment_url,
        data.deployment_type || 'kubernetes',
        JSON.stringify(data.hardware_spec),
        data.max_tenants,
        data.max_cpu_cores,
        data.max_memory_gb,
        data.kubernetes_cluster,
        data.kubernetes_namespace,
        data.health_check_url,
        JSON.stringify(data.deployment_config || {}),
        data.deployed_by,
        'active'
      ]);

      await client.query('COMMIT');

      const solution = result.rows[0];
      
      logger.info('Solution registered successfully', {
        solutionId: solution.id,
        solutionName: solution.solution_name,
        version: solution.solution_version,
        deploymentUrl: solution.deployment_url
      });

      return this.mapSolutionFromDb(solution);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to register solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionName: data.solution_name
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 솔루션 목록 조회
   */
  async getSolutions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    cluster?: string
  ): Promise<{ solutions: DeployedSolution[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereClause += `WHERE status = $${paramIndex++}`;
        params.push(status);
      }

      if (cluster) {
        whereClause += `${whereClause ? ' AND' : 'WHERE'} kubernetes_cluster = $${paramIndex++}`;
        params.push(cluster);
      }

      // 전체 개수 조회
      const countQuery = `SELECT COUNT(*) FROM deployed_solutions ${whereClause}`;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // 솔루션 목록 조회
      const query = `
        SELECT id, solution_name, solution_version, deployment_url, deployment_type,
               hardware_spec, max_tenants, current_tenants, max_cpu_cores, max_memory_gb,
               current_cpu_usage, current_memory_usage, kubernetes_cluster, kubernetes_namespace,
               status, health_check_url, last_health_check, health_status, deployment_config,
               deployed_by, deployed_at, created_at, updated_at
        FROM deployed_solutions 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(limit, offset);
      const result = await pool.query(query, params);
      
      const solutions = result.rows.map(row => this.mapSolutionFromDb(row));

      logger.info('Solutions retrieved successfully', {
        total,
        page,
        limit,
        status,
        cluster
      });

      return { solutions, total };

    } catch (error) {
      logger.error('Failed to get solutions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        page,
        limit
      });
      throw error;
    }
  }

  /**
   * 특정 솔루션 조회
   */
  async getSolutionById(solutionId: string): Promise<DeployedSolution | null> {
    try {
      const result = await pool.query(`
        SELECT id, solution_name, solution_version, deployment_url, deployment_type,
               hardware_spec, max_tenants, current_tenants, max_cpu_cores, max_memory_gb,
               current_cpu_usage, current_memory_usage, kubernetes_cluster, kubernetes_namespace,
               status, health_check_url, last_health_check, health_status, deployment_config,
               deployed_by, deployed_at, created_at, updated_at
        FROM deployed_solutions 
        WHERE id = $1
      `, [solutionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSolutionFromDb(result.rows[0]);

    } catch (error) {
      logger.error('Failed to get solution by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    }
  }

  /**
   * 솔루션 정보 업데이트
   */
  async updateSolution(solutionId: string, data: UpdateSolutionRequest): Promise<DeployedSolution> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 기존 솔루션 조회
      const existingResult = await client.query(
        'SELECT * FROM deployed_solutions WHERE id = $1',
        [solutionId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Solution not found');
      }

      const existing = existingResult.rows[0];
      
      // 업데이트할 필드들 구성
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.solution_name) {
        updateFields.push(`solution_name = $${paramIndex++}`);
        params.push(data.solution_name);
      }

      if (data.solution_version) {
        updateFields.push(`solution_version = $${paramIndex++}`);
        params.push(data.solution_version);
      }

      if (data.deployment_url) {
        updateFields.push(`deployment_url = $${paramIndex++}`);
        params.push(data.deployment_url);
      }

      if (data.hardware_spec) {
        const mergedSpec = { ...existing.hardware_spec, ...data.hardware_spec };
        updateFields.push(`hardware_spec = $${paramIndex++}`);
        params.push(JSON.stringify(mergedSpec));
      }

      if (data.max_tenants !== undefined) {
        updateFields.push(`max_tenants = $${paramIndex++}`);
        params.push(data.max_tenants);
      }

      if (data.max_cpu_cores !== undefined) {
        updateFields.push(`max_cpu_cores = $${paramIndex++}`);
        params.push(data.max_cpu_cores);
      }

      if (data.max_memory_gb !== undefined) {
        updateFields.push(`max_memory_gb = $${paramIndex++}`);
        params.push(data.max_memory_gb);
      }

      if (data.status) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(data.status);
      }

      if (data.health_check_url) {
        updateFields.push(`health_check_url = $${paramIndex++}`);
        params.push(data.health_check_url);
      }

      if (data.deployment_config) {
        const mergedConfig = { ...existing.deployment_config, ...data.deployment_config };
        updateFields.push(`deployment_config = $${paramIndex++}`);
        params.push(JSON.stringify(mergedConfig));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(solutionId);

      const updateQuery = `
        UPDATE deployed_solutions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, solution_name, solution_version, deployment_url, deployment_type,
                  hardware_spec, max_tenants, current_tenants, max_cpu_cores, max_memory_gb,
                  current_cpu_usage, current_memory_usage, kubernetes_cluster, kubernetes_namespace,
                  status, health_check_url, last_health_check, health_status, deployment_config,
                  deployed_by, deployed_at, created_at, updated_at
      `;

      const result = await client.query(updateQuery, params);

      await client.query('COMMIT');

      const solution = this.mapSolutionFromDb(result.rows[0]);
      
      logger.info('Solution updated successfully', {
        solutionId,
        updatedFields: updateFields.length - 1 // updated_at 제외
      });

      return solution;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 테넌트를 솔루션에 할당
   */
  async assignTenantToSolution(data: AssignTenantRequest): Promise<TenantSolutionMapping> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 솔루션 리소스 체크
      const solutionResult = await client.query(`
        SELECT max_tenants, current_tenants, max_cpu_cores, max_memory_gb, 
               current_cpu_usage, current_memory_usage, status
        FROM deployed_solutions 
        WHERE id = $1
      `, [data.solution_id]);

      if (solutionResult.rows.length === 0) {
        throw new Error('Solution not found');
      }

      const solution = solutionResult.rows[0];

      if (solution.status !== 'active') {
        throw new Error('Solution is not active');
      }

      if (solution.current_tenants >= solution.max_tenants) {
        throw new Error('Solution has reached maximum tenant capacity');
      }

      const availableCpu = solution.max_cpu_cores - solution.current_cpu_usage;
      const availableMemory = solution.max_memory_gb - solution.current_memory_usage;

      if (data.allocated_cpu_cores > availableCpu) {
        throw new Error(`Insufficient CPU resources. Available: ${availableCpu}, Requested: ${data.allocated_cpu_cores}`);
      }

      if (data.allocated_memory_gb > availableMemory) {
        throw new Error(`Insufficient memory resources. Available: ${availableMemory}GB, Requested: ${data.allocated_memory_gb}GB`);
      }

      // 기존 매핑 체크
      const existingMapping = await client.query(
        'SELECT id FROM tenant_solution_mappings WHERE tenant_id = $1 AND solution_id = $2',
        [data.tenant_id, data.solution_id]
      );

      if (existingMapping.rows.length > 0) {
        throw new Error('Tenant is already assigned to this solution');
      }

      // 매핑 생성
      const mappingResult = await client.query(`
        INSERT INTO tenant_solution_mappings (
          tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb, 
          allocated_storage_gb, status, priority, assigned_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb,
                  allocated_storage_gb, status, priority, assigned_at, assigned_by, activated_at
      `, [
        data.tenant_id,
        data.solution_id,
        data.allocated_cpu_cores,
        data.allocated_memory_gb,
        data.allocated_storage_gb,
        'assigned',
        data.priority || 0,
        data.assigned_by
      ]);

      // 솔루션 리소스 사용량 업데이트
      await client.query(`
        UPDATE deployed_solutions 
        SET current_tenants = current_tenants + 1,
            current_cpu_usage = current_cpu_usage + $1,
            current_memory_usage = current_memory_usage + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [data.allocated_cpu_cores, data.allocated_memory_gb, data.solution_id]);

      await client.query('COMMIT');

      const mapping = mappingResult.rows[0];
      
      logger.info('Tenant assigned to solution successfully', {
        tenantId: data.tenant_id,
        solutionId: data.solution_id,
        mappingId: mapping.id,
        allocatedResources: {
          cpu: data.allocated_cpu_cores,
          memory: data.allocated_memory_gb,
          storage: data.allocated_storage_gb
        }
      });

      return mapping;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to assign tenant to solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: data.tenant_id,
        solutionId: data.solution_id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 테넌트 할당 해제
   */
  async unassignTenantFromSolution(tenantId: string, solutionId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 기존 매핑 조회
      const mappingResult = await client.query(
        'SELECT * FROM tenant_solution_mappings WHERE tenant_id = $1 AND solution_id = $2',
        [tenantId, solutionId]
      );

      if (mappingResult.rows.length === 0) {
        throw new Error('Tenant mapping not found');
      }

      const mapping = mappingResult.rows[0];

      // 매핑 삭제
      await client.query(
        'DELETE FROM tenant_solution_mappings WHERE tenant_id = $1 AND solution_id = $2',
        [tenantId, solutionId]
      );

      // 솔루션 리소스 사용량 업데이트
      await client.query(`
        UPDATE deployed_solutions 
        SET current_tenants = current_tenants - 1,
            current_cpu_usage = current_cpu_usage - $1,
            current_memory_usage = current_memory_usage - $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [mapping.allocated_cpu_cores, mapping.allocated_memory_gb, solutionId]);

      await client.query('COMMIT');
      
      logger.info('Tenant unassigned from solution successfully', {
        tenantId,
        solutionId,
        freedResources: {
          cpu: mapping.allocated_cpu_cores,
          memory: mapping.allocated_memory_gb,
          storage: mapping.allocated_storage_gb
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to unassign tenant from solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        solutionId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 솔루션 헬스체크 업데이트
   */
  async updateHealthStatus(solutionId: string, healthStatus: 'healthy' | 'unhealthy'): Promise<void> {
    try {
      await pool.query(`
        UPDATE deployed_solutions 
        SET health_status = $1, 
            last_health_check = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [healthStatus, solutionId]);

      logger.info('Solution health status updated', {
        solutionId,
        healthStatus
      });

    } catch (error) {
      logger.error('Failed to update health status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId,
        healthStatus
      });
      throw error;
    }
  }

  /**
   * 솔루션 삭제 (비활성화)
   */
  async deactivateSolution(solutionId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 할당된 테넌트가 있는지 확인
      const mappingResult = await client.query(
        'SELECT COUNT(*) FROM tenant_solution_mappings WHERE solution_id = $1',
        [solutionId]
      );

      const assignedTenants = parseInt(mappingResult.rows[0].count);

      if (assignedTenants > 0) {
        throw new Error(`Cannot deactivate solution with ${assignedTenants} assigned tenants`);
      }

      // 솔루션 비활성화
      await client.query(`
        UPDATE deployed_solutions 
        SET status = 'retired',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [solutionId]);

      await client.query('COMMIT');
      
      logger.info('Solution deactivated successfully', {
        solutionId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to deactivate solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * DB 로우를 DeployedSolution 객체로 변환
   */
  private mapSolutionFromDb(row: any): DeployedSolution {
    return {
      id: row.id,
      solution_name: row.solution_name,
      solution_version: row.solution_version,
      deployment_url: row.deployment_url,
      deployment_type: row.deployment_type,
      hardware_spec: row.hardware_spec,
      max_tenants: row.max_tenants,
      current_tenants: row.current_tenants,
      max_cpu_cores: parseFloat(row.max_cpu_cores),
      max_memory_gb: parseFloat(row.max_memory_gb),
      current_cpu_usage: parseFloat(row.current_cpu_usage),
      current_memory_usage: parseFloat(row.current_memory_usage),
      kubernetes_cluster: row.kubernetes_cluster,
      kubernetes_namespace: row.kubernetes_namespace,
      status: row.status,
      health_check_url: row.health_check_url,
      last_health_check: row.last_health_check?.toISOString(),
      health_status: row.health_status,
      deployment_config: row.deployment_config,
      deployed_by: row.deployed_by,
      deployed_at: row.deployed_at.toISOString(),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}
