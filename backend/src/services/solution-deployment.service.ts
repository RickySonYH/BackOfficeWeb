// [advice from AI] 배포 솔루션 관리 서비스
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { KubernetesService } from './kubernetes.service';
import {
  DeployedSolution,
  TenantSolutionMapping,
  SolutionResourceSummary,
  TenantResourceAllocation,
  ResourceUsageMetric,
  SolutionDeploymentRequest,
  TenantAssignmentRequest,
  ResourceRequirements,
  SolutionHealthStatus
} from '../types/solution-deployment';

export class SolutionDeploymentService {
  private kubernetesService: KubernetesService;

  constructor() {
    this.kubernetesService = new KubernetesService();
  }

  /**
   * 새로운 솔루션 배포 등록
   */
  async registerDeployedSolution(data: SolutionDeploymentRequest): Promise<DeployedSolution> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Registering new deployed solution', {
        solutionName: data.solution_name,
        deploymentType: data.deployment_type
      });

      // 솔루션 등록
      const result = await client.query(`
        INSERT INTO deployed_solutions (
          solution_name, solution_version, deployment_url, deployment_type,
          hardware_spec, max_tenants, max_cpu_cores, max_memory_gb,
          kubernetes_cluster, kubernetes_namespace, internal_ip, external_ip,
          port_mappings, health_check_url, deployment_config, monitoring_config,
          deployed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        data.solution_name,
        data.solution_version,
        data.deployment_url,
        data.deployment_type,
        JSON.stringify(data.hardware_spec),
        data.max_tenants,
        data.max_cpu_cores,
        data.max_memory_gb,
        data.kubernetes_cluster,
        data.kubernetes_namespace,
        data.internal_ip,
        data.external_ip,
        JSON.stringify(data.port_mappings || {}),
        data.health_check_url,
        JSON.stringify(data.deployment_config || {}),
        JSON.stringify(data.monitoring_config || {}),
        data.deployed_by
      ]);

      const solution = result.rows[0];

      // 초기 헬스 체크 수행
      if (data.health_check_url) {
        await this.performHealthCheck(solution.id);
      }

      await client.query('COMMIT');
      
      logger.info('Deployed solution registered successfully', {
        solutionId: solution.id,
        solutionName: solution.solution_name
      });

      return solution;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to register deployed solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionName: data.solution_name
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 테넌트를 특정 솔루션에 할당
   */
  async assignTenantToSolution(data: TenantAssignmentRequest): Promise<TenantSolutionMapping> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Assigning tenant to solution', {
        tenantId: data.tenant_id,
        solutionId: data.solution_id
      });

      // 솔루션 리소스 가용성 체크
      const solutionCheck = await client.query(`
        SELECT id, max_tenants, current_tenants, max_cpu_cores, max_memory_gb, 
               current_cpu_usage, current_memory_usage, status
        FROM deployed_solutions 
        WHERE id = $1 AND status = 'active'
      `, [data.solution_id]);

      if (solutionCheck.rows.length === 0) {
        throw new Error('Solution not found or not active');
      }

      const solution = solutionCheck.rows[0];

      // 리소스 가용성 검증
      if (solution.current_tenants >= solution.max_tenants) {
        throw new Error('Solution has reached maximum tenant capacity');
      }

      const requiredCpu = data.allocated_cpu_cores || 0.5;
      const requiredMemory = data.allocated_memory_gb || 1.0;

      if (solution.current_cpu_usage + requiredCpu > solution.max_cpu_cores) {
        throw new Error('Insufficient CPU resources available');
      }

      if (solution.current_memory_usage + requiredMemory > solution.max_memory_gb) {
        throw new Error('Insufficient memory resources available');
      }

      // 기존 할당 체크
      const existingMapping = await client.query(`
        SELECT id FROM tenant_solution_mappings 
        WHERE tenant_id = $1 AND solution_id = $2
      `, [data.tenant_id, data.solution_id]);

      if (existingMapping.rows.length > 0) {
        throw new Error('Tenant is already assigned to this solution');
      }

      // 테넌트-솔루션 매핑 생성
      const mappingResult = await client.query(`
        INSERT INTO tenant_solution_mappings (
          tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb, 
          allocated_storage_gb, assigned_subdomain, assigned_ports, 
          priority, assigned_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        data.tenant_id,
        data.solution_id,
        requiredCpu,
        requiredMemory,
        data.allocated_storage_gb || 10.0,
        data.assigned_subdomain,
        JSON.stringify(data.assigned_ports || []),
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
      `, [requiredCpu, requiredMemory, data.solution_id]);

      // Kubernetes 리소스 쿼터 업데이트 (선택사항)
      if (solution.kubernetes_cluster && solution.kubernetes_namespace) {
        try {
          await this.kubernetesService.updateResourceQuota(
            solution.kubernetes_namespace,
            'tenant-quota',
            {
              cpu: `${requiredCpu}`,
              memory: `${requiredMemory}Gi`,
              storage: `${data.allocated_storage_gb || 10}Gi`
            }
          );
        } catch (k8sError) {
          logger.warn('Failed to update Kubernetes resource quota', {
            error: k8sError instanceof Error ? k8sError.message : 'Unknown error',
            namespace: solution.kubernetes_namespace
          });
        }
      }

      await client.query('COMMIT');
      
      const mapping = mappingResult.rows[0];
      
      logger.info('Tenant assigned to solution successfully', {
        mappingId: mapping.id,
        tenantId: data.tenant_id,
        solutionId: data.solution_id,
        allocatedCpu: requiredCpu,
        allocatedMemory: requiredMemory
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
   * 테넌트 요구사항에 맞는 최적 솔루션 찾기
   */
  async getOptimalSolutionForTenant(requirements: ResourceRequirements): Promise<string | null> {
    try {
      logger.info('Finding optimal solution for tenant', { requirements });

      const result = await pool.query(`
        SELECT id, solution_name, max_tenants, current_tenants, 
               max_cpu_cores, max_memory_gb, current_cpu_usage, current_memory_usage,
               (current_tenants::DECIMAL / max_tenants) as tenant_load,
               (current_cpu_usage / max_cpu_cores) as cpu_load,
               (current_memory_usage / max_memory_gb) as memory_load
        FROM deployed_solutions 
        WHERE status = 'active' 
          AND current_tenants < max_tenants
          AND (current_cpu_usage + $1) <= max_cpu_cores
          AND (current_memory_usage + $2) <= max_memory_gb
        ORDER BY 
          tenant_load ASC,
          cpu_load ASC,
          memory_load ASC,
          max_tenants DESC
        LIMIT 1
      `, [
        requirements.cpu_cores || 0.5,
        requirements.memory_gb || 1.0
      ]);

      if (result.rows.length === 0) {
        logger.warn('No optimal solution found for tenant requirements', { requirements });
        return null;
      }

      const optimalSolution = result.rows[0];
      
      logger.info('Optimal solution found', {
        solutionId: optimalSolution.id,
        solutionName: optimalSolution.solution_name,
        tenantLoad: optimalSolution.tenant_load,
        cpuLoad: optimalSolution.cpu_load,
        memoryLoad: optimalSolution.memory_load
      });

      return optimalSolution.id;

    } catch (error) {
      logger.error('Failed to find optimal solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requirements
      });
      throw error;
    }
  }

  /**
   * 솔루션 리소스 사용률 요약 조회
   */
  async getSolutionResourceSummary(): Promise<SolutionResourceSummary[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM solution_resource_summary
        ORDER BY cpu_usage_percent DESC, memory_usage_percent DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get solution resource summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 테넌트 리소스 할당 현황 조회
   */
  async getTenantResourceAllocations(): Promise<TenantResourceAllocation[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM tenant_resource_allocation
        ORDER BY assigned_at DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get tenant resource allocations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 특정 솔루션의 상세 정보 조회
   */
  async getSolutionDetails(solutionId: string): Promise<DeployedSolution | null> {
    try {
      const result = await pool.query(`
        SELECT ds.*, u.username as deployed_by_username
        FROM deployed_solutions ds
        LEFT JOIN users u ON ds.deployed_by = u.id
        WHERE ds.id = $1
      `, [solutionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get solution details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    }
  }

  /**
   * 솔루션 헬스 체크 수행
   */
  async performHealthCheck(solutionId: string): Promise<SolutionHealthStatus> {
    try {
      const solution = await this.getSolutionDetails(solutionId);
      if (!solution || !solution.health_check_url) {
        throw new Error('Solution not found or health check URL not configured');
      }

      logger.info('Performing health check', {
        solutionId,
        healthCheckUrl: solution.health_check_url
      });

      const axios = require('axios');
      const startTime = Date.now();
      
      try {
        const response = await axios.get(solution.health_check_url, {
          timeout: 10000, // 10초 타임아웃
          validateStatus: (status: number) => status < 500 // 5xx 에러만 실패로 간주
        });

        const responseTime = Date.now() - startTime;
        const healthStatus: SolutionHealthStatus = {
          status: response.status < 400 ? 'healthy' : 'unhealthy',
          response_code: response.status,
          response_time_ms: responseTime,
          checked_at: new Date().toISOString(),
          error_message: response.status >= 400 ? `HTTP ${response.status}` : ''
        };

        // DB에 헬스 체크 결과 업데이트
        await pool.query(`
          UPDATE deployed_solutions 
          SET health_status = $1,
              last_health_check = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [healthStatus.status, solutionId]);

        logger.info('Health check completed', {
          solutionId,
          status: healthStatus.status,
          responseTime: healthStatus.response_time_ms
        });

        return healthStatus;

      } catch (httpError: any) {
        const responseTime = Date.now() - startTime;
        const healthStatus: SolutionHealthStatus = {
          status: 'unhealthy',
          response_code: httpError.response?.status || 0,
          response_time_ms: responseTime,
          checked_at: new Date().toISOString(),
          error_message: httpError.message || 'Health check failed'
        };

        // DB에 헬스 체크 실패 결과 업데이트
        await pool.query(`
          UPDATE deployed_solutions 
          SET health_status = 'unhealthy',
              last_health_check = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [solutionId]);

        logger.warn('Health check failed', {
          solutionId,
          error: httpError.message,
          responseTime: healthStatus.response_time_ms
        });

        return healthStatus;
      }

    } catch (error) {
      logger.error('Failed to perform health check', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    }
  }

  /**
   * 모든 활성 솔루션에 대한 헬스 체크 수행
   */
  async performAllHealthChecks(): Promise<{ [solutionId: string]: SolutionHealthStatus }> {
    try {
      const activeSolutions = await pool.query(`
        SELECT id, health_check_url 
        FROM deployed_solutions 
        WHERE status = 'active' AND health_check_url IS NOT NULL
      `);

      const healthChecks: { [solutionId: string]: SolutionHealthStatus } = {};
      
      // 병렬로 헬스 체크 수행
      const promises = activeSolutions.rows.map(async (solution) => {
        try {
          const healthStatus = await this.performHealthCheck(solution.id);
          healthChecks[solution.id] = healthStatus;
        } catch (error) {
          logger.error('Health check failed for solution', {
            solutionId: solution.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          healthChecks[solution.id] = {
            status: 'unhealthy',
            response_code: 0,
            response_time_ms: 0,
            checked_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      await Promise.all(promises);

      logger.info('All health checks completed', {
        totalSolutions: activeSolutions.rows.length,
        healthyCount: Object.values(healthChecks).filter(h => h.status === 'healthy').length,
        unhealthyCount: Object.values(healthChecks).filter(h => h.status === 'unhealthy').length
      });

      return healthChecks;

    } catch (error) {
      logger.error('Failed to perform all health checks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 리소스 사용량 메트릭 기록
   */
  async recordResourceUsageMetric(metric: Omit<ResourceUsageMetric, 'id' | 'created_at'>): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO resource_usage_metrics (
          solution_id, tenant_id, metric_type, metric_name, 
          metric_value, metric_unit, collected_at, time_window, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        metric.solution_id,
        metric.tenant_id,
        metric.metric_type,
        metric.metric_name,
        metric.metric_value,
        metric.metric_unit,
        metric.collected_at,
        metric.time_window || 300,
        JSON.stringify(metric.tags || {})
      ]);

    } catch (error) {
      logger.error('Failed to record resource usage metric', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metric
      });
      throw error;
    }
  }

  /**
   * 솔루션 삭제 (모든 관련 리소스 정리)
   */
  async deleteSolution(solutionId: string, force: boolean = false): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 할당된 테넌트 확인
      const assignedTenants = await client.query(`
        SELECT COUNT(*) as count FROM tenant_solution_mappings 
        WHERE solution_id = $1 AND status = 'active'
      `, [solutionId]);

      if (assignedTenants.rows[0].count > 0 && !force) {
        throw new Error('Cannot delete solution with active tenant assignments. Use force=true to override.');
      }

      // 솔루션 정보 조회
      const solution = await client.query(`
        SELECT kubernetes_namespace FROM deployed_solutions WHERE id = $1
      `, [solutionId]);

      if (solution.rows.length === 0) {
        throw new Error('Solution not found');
      }

      // Kubernetes 리소스 정리
      if (solution.rows[0].kubernetes_namespace) {
        try {
          await this.kubernetesService.deleteNamespace(solution.rows[0].kubernetes_namespace);
        } catch (k8sError) {
          logger.warn('Failed to delete Kubernetes namespace', {
            namespace: solution.rows[0].kubernetes_namespace,
            error: k8sError instanceof Error ? k8sError.message : 'Unknown error'
          });
        }
      }

      // DB에서 솔루션 삭제 (CASCADE로 관련 테이블도 정리됨)
      await client.query('DELETE FROM deployed_solutions WHERE id = $1', [solutionId]);

      await client.query('COMMIT');
      
      logger.info('Solution deleted successfully', { solutionId, force });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete solution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        solutionId
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
