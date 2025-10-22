// [advice from AI] 워크스페이스 설정 관리 서비스 - 구조화된 설정, 버전 관리, 히스토리 추적

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import {
  WorkspaceConfiguration,
  ConfigurationHistory,
  WorkspaceConfigRequest,
  ConfigurationUpdateRequest,
  ConfigurationRollbackRequest,
  ConfigurationValidationResult,
  ConfigurationDeploymentRequest,
  ConfigurationTemplate,
  ConfigurationCategory,
  ConfigurationVersion
} from '../types/workspace-configuration';

export class WorkspaceConfigurationService {

  /**
   * 워크스페이스 설정 조회 (최신 활성 설정)
   */
  async getWorkspaceConfiguration(
    workspaceId: string, 
    environment: 'development' | 'staging' | 'production' = 'production'
  ): Promise<{ success: boolean; data?: WorkspaceConfiguration[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT 
          id, workspace_id, config_category, config_key, config_value,
          environment, version, is_active, deployed_to_solution,
          deployment_status, deployed_at, created_by, created_at, updated_at
        FROM workspace_configurations 
        WHERE workspace_id = $1 AND environment = $2 AND is_active = true
        ORDER BY config_category, config_key
      `, [workspaceId, environment]);

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Failed to get workspace configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 설정 카테고리별 조회
   */
  async getConfigurationByCategory(
    workspaceId: string,
    category: string,
    environment: 'development' | 'staging' | 'production' = 'production'
  ): Promise<{ success: boolean; data?: WorkspaceConfiguration[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT 
          id, workspace_id, config_category, config_key, config_value,
          environment, version, is_active, deployed_to_solution,
          deployment_status, deployed_at, created_by, created_at, updated_at
        FROM workspace_configurations 
        WHERE workspace_id = $1 AND config_category = $2 AND environment = $3 AND is_active = true
        ORDER BY config_key
      `, [workspaceId, category, environment]);

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Failed to get configuration by category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 설정 업데이트 (새 버전 생성)
   */
  async updateConfiguration(request: ConfigurationUpdateRequest): Promise<{
    success: boolean;
    data?: { configurationId: string; version: number };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 현재 활성 설정 조회
      const currentConfig = await client.query(`
        SELECT id, config_value, version
        FROM workspace_configurations
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
              AND environment = $4 AND is_active = true
      `, [request.workspaceId, request.configCategory, request.configKey, request.environment]);

      const oldValue = currentConfig.rows.length > 0 ? currentConfig.rows[0].config_value : null;
      const currentVersion = currentConfig.rows.length > 0 ? currentConfig.rows[0].version : 0;
      const newVersion = currentVersion + 1;

      // 기존 설정 비활성화
      if (currentConfig.rows.length > 0) {
        await client.query(`
          UPDATE workspace_configurations 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [currentConfig.rows[0].id]);
      }

      // 새 설정 생성
      const newConfigResult = await client.query(`
        INSERT INTO workspace_configurations 
        (workspace_id, config_category, config_key, config_value, environment, 
         version, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING id
      `, [
        request.workspaceId,
        request.configCategory,
        request.configKey,
        JSON.stringify(request.configValue),
        request.environment,
        newVersion,
        request.updatedBy
      ]);

      const newConfigId = newConfigResult.rows[0].id;

      // 변경 히스토리 기록
      await client.query(`
        INSERT INTO configuration_history
        (workspace_id, configuration_id, change_type, config_category, config_key,
         old_value, new_value, change_reason, change_description, changed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        request.workspaceId,
        newConfigId,
        currentConfig.rows.length > 0 ? 'update' : 'create',
        request.configCategory,
        request.configKey,
        oldValue,
        JSON.stringify(request.configValue),
        request.changeReason || 'Configuration update',
        request.changeDescription,
        request.updatedBy
      ]);

      await client.query('COMMIT');

      logger.info('Configuration updated successfully', {
        workspaceId: request.workspaceId,
        category: request.configCategory,
        key: request.configKey,
        version: newVersion
      });

      return {
        success: true,
        data: {
          configurationId: newConfigId,
          version: newVersion
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 대량 설정 업데이트 (트랜잭션)
   */
  async bulkUpdateConfiguration(
    workspaceId: string,
    configurations: Array<{
      configCategory: string;
      configKey: string;
      configValue: any;
    }>,
    environment: 'development' | 'staging' | 'production' = 'production',
    updatedBy: string,
    changeReason?: string
  ): Promise<{ success: boolean; data?: { updatedCount: number }; error?: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let updatedCount = 0;

      for (const config of configurations) {
        const updateResult = await this.updateConfigurationInTransaction(
          client,
          {
            workspaceId,
            configCategory: config.configCategory,
            configKey: config.configKey,
            configValue: config.configValue,
            environment,
            updatedBy,
            changeReason
          }
        );

        if (updateResult.success) {
          updatedCount++;
        }
      }

      await client.query('COMMIT');

      logger.info('Bulk configuration update completed', {
        workspaceId,
        updatedCount,
        totalCount: configurations.length
      });

      return {
        success: true,
        data: { updatedCount }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to bulk update configurations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 트랜잭션 내에서 설정 업데이트 (내부 메서드)
   */
  private async updateConfigurationInTransaction(
    client: any,
    request: ConfigurationUpdateRequest
  ): Promise<{ success: boolean; configurationId?: string }> {
    try {
      // 현재 활성 설정 조회
      const currentConfig = await client.query(`
        SELECT id, config_value, version
        FROM workspace_configurations
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
              AND environment = $4 AND is_active = true
      `, [request.workspaceId, request.configCategory, request.configKey, request.environment]);

      const oldValue = currentConfig.rows.length > 0 ? currentConfig.rows[0].config_value : null;
      const currentVersion = currentConfig.rows.length > 0 ? currentConfig.rows[0].version : 0;
      const newVersion = currentVersion + 1;

      // 기존 설정 비활성화
      if (currentConfig.rows.length > 0) {
        await client.query(`
          UPDATE workspace_configurations 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [currentConfig.rows[0].id]);
      }

      // 새 설정 생성
      const newConfigResult = await client.query(`
        INSERT INTO workspace_configurations 
        (workspace_id, config_category, config_key, config_value, environment, 
         version, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING id
      `, [
        request.workspaceId,
        request.configCategory,
        request.configKey,
        JSON.stringify(request.configValue),
        request.environment,
        newVersion,
        request.updatedBy
      ]);

      const newConfigId = newConfigResult.rows[0].id;

      // 변경 히스토리 기록
      await client.query(`
        INSERT INTO configuration_history
        (workspace_id, configuration_id, change_type, config_category, config_key,
         old_value, new_value, change_reason, change_description, changed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        request.workspaceId,
        newConfigId,
        currentConfig.rows.length > 0 ? 'update' : 'create',
        request.configCategory,
        request.configKey,
        oldValue,
        JSON.stringify(request.configValue),
        request.changeReason || 'Configuration update',
        request.changeDescription,
        request.updatedBy
      ]);

      return {
        success: true,
        configurationId: newConfigId
      };

    } catch (error) {
      logger.error('Failed to update configuration in transaction:', error);
      return { success: false };
    }
  }

  /**
   * 설정 롤백 (이전 버전으로 복원)
   */
  async rollbackConfiguration(request: ConfigurationRollbackRequest): Promise<{
    success: boolean;
    data?: { newConfigurationId: string; rolledBackToVersion: number };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 롤백할 버전의 설정 조회
      const targetVersionConfig = await client.query(`
        SELECT config_value, version
        FROM workspace_configurations
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
              AND environment = $4 AND version = $5
      `, [
        request.workspaceId,
        request.configCategory,
        request.configKey,
        request.environment,
        request.targetVersion
      ]);

      if (targetVersionConfig.rows.length === 0) {
        throw new Error(`Configuration version ${request.targetVersion} not found`);
      }

      const targetConfig = targetVersionConfig.rows[0];

      // 현재 활성 설정 조회
      const currentConfig = await client.query(`
        SELECT id, version
        FROM workspace_configurations
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
              AND environment = $4 AND is_active = true
      `, [request.workspaceId, request.configCategory, request.configKey, request.environment]);

      const currentVersion = currentConfig.rows.length > 0 ? currentConfig.rows[0].version : 0;
      const newVersion = currentVersion + 1;

      // 기존 설정 비활성화
      if (currentConfig.rows.length > 0) {
        await client.query(`
          UPDATE workspace_configurations 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [currentConfig.rows[0].id]);
      }

      // 롤백된 설정으로 새 버전 생성
      const newConfigResult = await client.query(`
        INSERT INTO workspace_configurations 
        (workspace_id, config_category, config_key, config_value, environment, 
         version, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING id
      `, [
        request.workspaceId,
        request.configCategory,
        request.configKey,
        targetConfig.config_value,
        request.environment,
        newVersion,
        request.rolledBackBy
      ]);

      const newConfigId = newConfigResult.rows[0].id;

      // 롤백 히스토리 기록
      await client.query(`
        INSERT INTO configuration_history
        (workspace_id, configuration_id, change_type, config_category, config_key,
         old_value, new_value, change_reason, change_description, changed_by)
        VALUES ($1, $2, 'rollback', $3, $4, $5, $6, $7, $8, $9)
      `, [
        request.workspaceId,
        newConfigId,
        request.configCategory,
        request.configKey,
        null, // old_value는 null (롤백이므로)
        targetConfig.config_value,
        request.rollbackReason || 'Configuration rollback',
        `Rolled back to version ${request.targetVersion}`,
        request.rolledBackBy
      ]);

      await client.query('COMMIT');

      logger.info('Configuration rolled back successfully', {
        workspaceId: request.workspaceId,
        category: request.configCategory,
        key: request.configKey,
        targetVersion: request.targetVersion,
        newVersion
      });

      return {
        success: true,
        data: {
          newConfigurationId: newConfigId,
          rolledBackToVersion: request.targetVersion
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to rollback configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 설정 변경 히스토리 조회
   */
  async getConfigurationHistory(
    workspaceId: string,
    configCategory?: string,
    configKey?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; data?: ConfigurationHistory[]; total?: number; error?: string }> {
    try {
      let whereClause = 'WHERE ch.workspace_id = $1';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (configCategory) {
        whereClause += ` AND ch.config_category = $${paramIndex++}`;
        params.push(configCategory);
      }

      if (configKey) {
        whereClause += ` AND ch.config_key = $${paramIndex++}`;
        params.push(configKey);
      }

      // 총 개수 조회
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM configuration_history ch
        ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].total);

      // 히스토리 데이터 조회
      const historyResult = await pool.query(`
        SELECT 
          ch.id, ch.workspace_id, ch.configuration_id, ch.change_type,
          ch.config_category, ch.config_key, ch.old_value, ch.new_value,
          ch.change_reason, ch.change_description, ch.changed_by, ch.changed_at, ch.applied_at,
          u.username as changed_by_username, u.email as changed_by_email
        FROM configuration_history ch
        LEFT JOIN users u ON ch.changed_by = u.id
        ${whereClause}
        ORDER BY ch.changed_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return {
        success: true,
        data: historyResult.rows,
        total
      };

    } catch (error) {
      logger.error('Failed to get configuration history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 설정 유효성 검증
   */
  async validateConfiguration(
    workspaceId: string,
    configCategory: string,
    configKey: string,
    configValue: any
  ): Promise<ConfigurationValidationResult> {
    try {
      // 워크스페이스 타입 조회
      const workspaceResult = await pool.query(
        'SELECT type FROM workspaces WHERE id = $1',
        [workspaceId]
      );

      if (workspaceResult.rows.length === 0) {
        return {
          isValid: false,
          errors: ['Workspace not found']
        };
      }

      const workspaceType = workspaceResult.rows[0].type;
      const errors: string[] = [];

      // 워크스페이스 타입별 설정 검증
      if (workspaceType === 'KMS') {
        errors.push(...this.validateKMSConfiguration(configCategory, configKey, configValue));
      } else if (workspaceType === 'ADVISOR') {
        errors.push(...this.validateAdvisorConfiguration(configCategory, configKey, configValue));
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: this.getConfigurationWarnings(configCategory, configKey, configValue)
      };

    } catch (error) {
      logger.error('Failed to validate configuration:', error);
      return {
        isValid: false,
        errors: ['Configuration validation failed']
      };
    }
  }

  /**
   * KMS 설정 검증 (내부 메서드)
   */
  private validateKMSConfiguration(category: string, key: string, value: any): string[] {
    const errors: string[] = [];

    switch (category) {
      case 'vector_db_config':
        if (key === 'dimension' && (typeof value !== 'number' || value <= 0)) {
          errors.push('Vector dimension must be a positive number');
        }
        if (key === 'similarity_metric' && !['cosine', 'euclidean', 'dot_product'].includes(value)) {
          errors.push('Invalid similarity metric');
        }
        break;

      case 'search_config':
        if (key === 'max_results' && (typeof value !== 'number' || value <= 0 || value > 100)) {
          errors.push('Max results must be between 1 and 100');
        }
        if (key === 'similarity_threshold' && (typeof value !== 'number' || value < 0 || value > 1)) {
          errors.push('Similarity threshold must be between 0 and 1');
        }
        break;

      case 'data_processing':
        if (key === 'chunk_size' && (typeof value !== 'number' || value <= 0)) {
          errors.push('Chunk size must be a positive number');
        }
        if (key === 'chunk_overlap' && (typeof value !== 'number' || value < 0)) {
          errors.push('Chunk overlap must be non-negative');
        }
        break;
    }

    return errors;
  }

  /**
   * Advisor 설정 검증 (내부 메서드)
   */
  private validateAdvisorConfiguration(category: string, key: string, value: any): string[] {
    const errors: string[] = [];

    switch (category) {
      case 'sentiment_analysis':
        if (key === 'threshold_positive' && (typeof value !== 'number' || value < -1 || value > 1)) {
          errors.push('Positive threshold must be between -1 and 1');
        }
        if (key === 'threshold_negative' && (typeof value !== 'number' || value < -1 || value > 1)) {
          errors.push('Negative threshold must be between -1 and 1');
        }
        break;

      case 'conversation_config':
        if (key === 'max_context_length' && (typeof value !== 'number' || value <= 0)) {
          errors.push('Max context length must be positive');
        }
        if (key === 'session_timeout' && (typeof value !== 'number' || value <= 0)) {
          errors.push('Session timeout must be positive');
        }
        break;

      case 'auto_response_settings':
        if (key === 'confidence_threshold' && (typeof value !== 'number' || value < 0 || value > 1)) {
          errors.push('Confidence threshold must be between 0 and 1');
        }
        if (key === 'max_auto_responses' && (typeof value !== 'number' || value < 0)) {
          errors.push('Max auto responses must be non-negative');
        }
        break;
    }

    return errors;
  }

  /**
   * 설정 경고 사항 확인 (내부 메서드)
   */
  private getConfigurationWarnings(category: string, key: string, value: any): string[] {
    const warnings: string[] = [];

    // 성능에 영향을 줄 수 있는 설정에 대한 경고
    if (category === 'search_config' && key === 'max_results' && value > 50) {
      warnings.push('High max results may impact search performance');
    }

    if (category === 'data_processing' && key === 'chunk_size' && value > 2000) {
      warnings.push('Large chunk size may impact processing performance');
    }

    if (category === 'conversation_config' && key === 'max_context_length' && value > 20) {
      warnings.push('Large context length may impact response time');
    }

    return warnings;
  }

  /**
   * 설정 템플릿 조회
   */
  async getConfigurationTemplates(workspaceType: 'KMS' | 'ADVISOR'): Promise<{
    success: boolean;
    data?: ConfigurationTemplate[];
    error?: string;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, workspace_type, template_config, description, is_default,
          created_at, updated_at
        FROM configuration_templates
        WHERE workspace_type = $1 OR workspace_type = 'COMMON'
        ORDER BY is_default DESC, name
      `, [workspaceType]);

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      logger.error('Failed to get configuration templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 설정을 솔루션에 배포
   */
  async deployConfiguration(request: ConfigurationDeploymentRequest): Promise<{
    success: boolean;
    data?: { deploymentId: string };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 배포할 설정들 조회
      const configurationsToDeploy = await client.query(`
        SELECT id, config_category, config_key, config_value
        FROM workspace_configurations
        WHERE workspace_id = $1 AND environment = $2 AND is_active = true
        ${request.configCategories ? 'AND config_category = ANY($3)' : ''}
      `, request.configCategories 
        ? [request.workspaceId, request.environment, request.configCategories]
        : [request.workspaceId, request.environment]);

      if (configurationsToDeploy.rows.length === 0) {
        throw new Error('No configurations found to deploy');
      }

      // 배포 상태 업데이트
      const configIds = configurationsToDeploy.rows.map(row => row.id);
      await client.query(`
        UPDATE workspace_configurations 
        SET deployment_status = 'deploying', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1)
      `, [configIds]);

      // 실제 솔루션 배포 로직 (시뮬레이션)
      // TODO: 실제 환경에서는 Kubernetes API나 솔루션 API를 호출
      await this.simulateDeploymentToSolution(configurationsToDeploy.rows, request.targetSolutionId);

      // 배포 완료 상태 업데이트
      await client.query(`
        UPDATE workspace_configurations 
        SET deployment_status = 'deployed', deployed_to_solution = true, deployed_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1)
      `, [configIds]);

      // 배포 히스토리 기록
      for (const config of configurationsToDeploy.rows) {
        await client.query(`
          INSERT INTO configuration_history
          (workspace_id, configuration_id, change_type, config_category, config_key,
           new_value, change_reason, change_description, changed_by, applied_at)
          VALUES ($1, $2, 'deploy', $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        `, [
          request.workspaceId,
          config.id,
          config.config_category,
          config.config_key,
          config.config_value,
          request.deploymentReason || 'Configuration deployment',
          `Deployed to solution ${request.targetSolutionId}`,
          request.deployedBy
        ]);
      }

      await client.query('COMMIT');

      const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      logger.info('Configuration deployed successfully', {
        workspaceId: request.workspaceId,
        solutionId: request.targetSolutionId,
        configCount: configurationsToDeploy.rows.length,
        deploymentId
      });

      return {
        success: true,
        data: { deploymentId }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      // 배포 실패 상태 업데이트
      try {
        await pool.query(`
          UPDATE workspace_configurations 
          SET deployment_status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE workspace_id = $1 AND deployment_status = 'deploying'
        `, [request.workspaceId]);
      } catch (updateError) {
        logger.error('Failed to update deployment status after failure:', updateError);
      }

      logger.error('Failed to deploy configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 솔루션 배포 시뮬레이션 (내부 메서드)
   */
  private async simulateDeploymentToSolution(configurations: any[], solutionId: string): Promise<void> {
    // 실제 환경에서는 여기서 Kubernetes API나 솔루션 API를 호출하여 설정을 배포
    logger.info('Simulating deployment to solution', {
      solutionId,
      configCount: configurations.length
    });

    // 배포 시뮬레이션 (2초 대기)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 실패 시뮬레이션 (10% 확률)
    if (Math.random() < 0.1) {
      throw new Error('Deployment simulation failed');
    }
  }
}
