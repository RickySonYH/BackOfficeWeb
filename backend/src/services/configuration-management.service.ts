// [advice from AI] 구조화된 설정 관리 서비스
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import {
  WorkspaceConfiguration,
  ConfigurationHistory,
  ConfigurationRequest,
  ConfigurationUpdateRequest,
  ConfigurationHistoryFilter,
  ConfigurationValidationResult,
  ConfigurationRollbackRequest
} from '../types/configuration-management';

export class ConfigurationManagementService {

  /**
   * 워크스페이스 설정 생성
   */
  async createConfiguration(data: ConfigurationRequest): Promise<WorkspaceConfiguration> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Creating workspace configuration', {
        workspaceId: data.workspace_id,
        category: data.config_category,
        key: data.config_key
      });

      // 기존 활성 설정 비활성화
      await client.query(`
        UPDATE workspace_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
          AND environment = $4 AND is_active = true
      `, [data.workspace_id, data.config_category, data.config_key, data.environment || 'production']);

      // 새 버전 번호 계산
      const versionResult = await client.query(`
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM workspace_configurations
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 AND environment = $4
      `, [data.workspace_id, data.config_category, data.config_key, data.environment || 'production']);
      
      const nextVersion = versionResult.rows[0].next_version;

      // 설정 검증
      const validationResult = await this.validateConfiguration(data);
      
      // 새 설정 생성
      const result = await client.query(`
        INSERT INTO workspace_configurations (
          workspace_id, config_category, config_key, config_value, 
          environment, version, is_active, validation_schema, 
          is_validated, validation_errors, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        data.workspace_id,
        data.config_category,
        data.config_key,
        JSON.stringify(data.config_value),
        data.environment || 'production',
        nextVersion,
        true,
        data.validation_schema ? JSON.stringify(data.validation_schema) : null,
        validationResult.is_valid,
        validationResult.errors ? JSON.stringify(validationResult.errors) : null,
        data.created_by
      ]);

      const configuration = result.rows[0];

      // 변경 히스토리 기록
      await this.recordConfigurationHistory(client, {
        workspace_id: data.workspace_id,
        configuration_id: configuration.id,
        change_type: 'create',
        config_category: data.config_category,
        config_key: data.config_key,
        old_value: null,
        new_value: data.config_value,
        change_reason: data.change_reason,
        change_description: data.change_description,
        changed_by: data.created_by
      });

      await client.query('COMMIT');
      
      logger.info('Workspace configuration created successfully', {
        configurationId: configuration.id,
        version: nextVersion
      });

      return configuration;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create workspace configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId: data.workspace_id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 워크스페이스 설정 업데이트
   */
  async updateConfiguration(data: ConfigurationUpdateRequest): Promise<WorkspaceConfiguration> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Updating workspace configuration', {
        configurationId: data.configuration_id
      });

      // 기존 설정 조회
      const existingResult = await client.query(`
        SELECT * FROM workspace_configurations WHERE id = $1 AND is_active = true
      `, [data.configuration_id]);

      if (existingResult.rows.length === 0) {
        throw new Error('Configuration not found or not active');
      }

      const existingConfig = existingResult.rows[0];

      // 새 버전 생성 (기존 설정 비활성화 후 새 설정 생성)
      await client.query(`
        UPDATE workspace_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [data.configuration_id]);

      const nextVersion = existingConfig.version + 1;

      // 설정 검증
      const validationResult = await this.validateConfiguration({
        workspace_id: existingConfig.workspace_id,
        config_category: existingConfig.config_category,
        config_key: existingConfig.config_key,
        config_value: data.config_value,
        environment: existingConfig.environment,
        validation_schema: data.validation_schema,
        created_by: data.updated_by
      });

      // 새 버전 설정 생성
      const result = await client.query(`
        INSERT INTO workspace_configurations (
          workspace_id, config_category, config_key, config_value, 
          environment, version, is_active, validation_schema, 
          is_validated, validation_errors, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        existingConfig.workspace_id,
        existingConfig.config_category,
        existingConfig.config_key,
        JSON.stringify(data.config_value),
        existingConfig.environment,
        nextVersion,
        true,
        data.validation_schema ? JSON.stringify(data.validation_schema) : existingConfig.validation_schema,
        validationResult.is_valid,
        validationResult.errors ? JSON.stringify(validationResult.errors) : null,
        data.updated_by
      ]);

      const newConfiguration = result.rows[0];

      // 변경 히스토리 기록
      await this.recordConfigurationHistory(client, {
        workspace_id: existingConfig.workspace_id,
        configuration_id: newConfiguration.id,
        change_type: 'update',
        config_category: existingConfig.config_category,
        config_key: existingConfig.config_key,
        old_value: JSON.parse(existingConfig.config_value),
        new_value: data.config_value,
        change_reason: data.change_reason,
        change_description: data.change_description,
        impact_assessment: data.impact_assessment,
        changed_by: data.updated_by,
        change_approved_by: data.approved_by
      });

      await client.query('COMMIT');
      
      logger.info('Workspace configuration updated successfully', {
        configurationId: newConfiguration.id,
        oldVersion: existingConfig.version,
        newVersion: nextVersion
      });

      return newConfiguration;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update workspace configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configurationId: data.configuration_id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 워크스페이스 설정 조회
   */
  async getConfiguration(
    workspaceId: string, 
    category?: string, 
    environment: string = 'production'
  ): Promise<WorkspaceConfiguration[]> {
    try {
      let query = `
        SELECT wc.*, u.username as created_by_username
        FROM workspace_configurations wc
        LEFT JOIN users u ON wc.created_by = u.id
        WHERE wc.workspace_id = $1 AND wc.environment = $2 AND wc.is_active = true
      `;
      const params: any[] = [workspaceId, environment];

      if (category) {
        query += ` AND wc.config_category = $3`;
        params.push(category);
      }

      query += ` ORDER BY wc.config_category, wc.config_key, wc.version DESC`;

      const result = await pool.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Failed to get workspace configurations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId,
        category
      });
      throw error;
    }
  }

  /**
   * 설정 변경 히스토리 조회
   */
  async getConfigurationHistory(
    workspaceId: string,
    filter?: ConfigurationHistoryFilter
  ): Promise<ConfigurationHistory[]> {
    try {
      let query = `
        SELECT ch.*, u1.username as changed_by_username, u2.username as approved_by_username
        FROM configuration_history ch
        LEFT JOIN users u1 ON ch.changed_by = u1.id
        LEFT JOIN users u2 ON ch.change_approved_by = u2.id
        WHERE ch.workspace_id = $1
      `;
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (filter?.category) {
        query += ` AND ch.config_category = $${paramIndex}`;
        params.push(filter.category);
        paramIndex++;
      }

      if (filter?.config_key) {
        query += ` AND ch.config_key = $${paramIndex}`;
        params.push(filter.config_key);
        paramIndex++;
      }

      if (filter?.change_type) {
        query += ` AND ch.change_type = $${paramIndex}`;
        params.push(filter.change_type);
        paramIndex++;
      }

      if (filter?.changed_by) {
        query += ` AND ch.changed_by = $${paramIndex}`;
        params.push(filter.changed_by);
        paramIndex++;
      }

      if (filter?.from_date) {
        query += ` AND ch.changed_at >= $${paramIndex}`;
        params.push(filter.from_date);
        paramIndex++;
      }

      if (filter?.to_date) {
        query += ` AND ch.changed_at <= $${paramIndex}`;
        params.push(filter.to_date);
        paramIndex++;
      }

      query += ` ORDER BY ch.changed_at DESC`;

      if (filter?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filter.limit);
      }

      const result = await pool.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Failed to get configuration history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId,
        filter
      });
      throw error;
    }
  }

  /**
   * 설정 롤백
   */
  async rollbackConfiguration(data: ConfigurationRollbackRequest): Promise<WorkspaceConfiguration> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Rolling back workspace configuration', {
        workspaceId: data.workspace_id,
        targetVersion: data.target_version
      });

      // 대상 버전 설정 조회
      const targetResult = await client.query(`
        SELECT * FROM workspace_configurations 
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
          AND environment = $4 AND version = $5
      `, [
        data.workspace_id, 
        data.config_category, 
        data.config_key, 
        data.environment || 'production',
        data.target_version
      ]);

      if (targetResult.rows.length === 0) {
        throw new Error('Target configuration version not found');
      }

      const targetConfig = targetResult.rows[0];

      // 현재 활성 설정 조회
      const currentResult = await client.query(`
        SELECT * FROM workspace_configurations 
        WHERE workspace_id = $1 AND config_category = $2 AND config_key = $3 
          AND environment = $4 AND is_active = true
      `, [
        data.workspace_id, 
        data.config_category, 
        data.config_key, 
        data.environment || 'production'
      ]);

      const currentConfig = currentResult.rows[0];

      // 현재 설정 비활성화
      await client.query(`
        UPDATE workspace_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [currentConfig.id]);

      // 새 버전 번호 계산
      const nextVersion = currentConfig.version + 1;

      // 롤백된 설정으로 새 버전 생성
      const result = await client.query(`
        INSERT INTO workspace_configurations (
          workspace_id, config_category, config_key, config_value, 
          environment, version, is_active, validation_schema, 
          is_validated, validation_errors, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        data.workspace_id,
        data.config_category,
        data.config_key,
        targetConfig.config_value,
        data.environment || 'production',
        nextVersion,
        true,
        targetConfig.validation_schema,
        targetConfig.is_validated,
        targetConfig.validation_errors,
        data.rolled_back_by
      ]);

      const rolledBackConfig = result.rows[0];

      // 롤백 히스토리 기록
      await this.recordConfigurationHistory(client, {
        workspace_id: data.workspace_id,
        configuration_id: rolledBackConfig.id,
        change_type: 'rollback',
        config_category: data.config_category,
        config_key: data.config_key,
        old_value: JSON.parse(currentConfig.config_value),
        new_value: JSON.parse(targetConfig.config_value),
        change_reason: data.rollback_reason,
        change_description: `Rolled back to version ${data.target_version}`,
        impact_assessment: data.impact_assessment,
        changed_by: data.rolled_back_by
      });

      await client.query('COMMIT');
      
      logger.info('Configuration rolled back successfully', {
        configurationId: rolledBackConfig.id,
        fromVersion: currentConfig.version,
        toVersion: data.target_version,
        newVersion: nextVersion
      });

      return rolledBackConfig;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to rollback configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId: data.workspace_id,
        targetVersion: data.target_version
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 설정 검증
   */
  private async validateConfiguration(data: ConfigurationRequest): Promise<ConfigurationValidationResult> {
    try {
      const errors: string[] = [];
      
      // 기본 검증
      if (!data.config_value) {
        errors.push('Configuration value is required');
      }

      // 스키마 기반 검증 (선택사항)
      if (data.validation_schema) {
        try {
          const Ajv = require('ajv');
          const ajv = new Ajv();
          const validate = ajv.compile(data.validation_schema);
          const valid = validate(data.config_value);
          
          if (!valid && validate.errors) {
            errors.push(...validate.errors.map((err: any) => 
              `${err.instancePath} ${err.message}`
            ));
          }
        } catch (schemaError) {
          errors.push(`Schema validation error: ${schemaError instanceof Error ? schemaError.message : 'Unknown error'}`);
        }
      }

      // 카테고리별 특수 검증
      switch (data.config_category) {
        case 'vector_db_config':
          await this.validateVectorDbConfig(data.config_value, errors);
          break;
        case 'model_params':
          await this.validateModelParams(data.config_value, errors);
          break;
        case 'ui_settings':
          await this.validateUiSettings(data.config_value, errors);
          break;
      }

      return {
        is_valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error('Configuration validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId: data.workspace_id,
        category: data.config_category
      });
      
      return {
        is_valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Vector DB 설정 검증
   */
  private async validateVectorDbConfig(config: any, errors: string[]): Promise<void> {
    if (config.dimension && (typeof config.dimension !== 'number' || config.dimension <= 0)) {
      errors.push('Vector dimension must be a positive number');
    }

    if (config.similarity_metric && !['cosine', 'euclidean', 'dot_product'].includes(config.similarity_metric)) {
      errors.push('Invalid similarity metric');
    }

    if (config.index_type && !['hnsw', 'ivf'].includes(config.index_type)) {
      errors.push('Invalid index type');
    }
  }

  /**
   * 모델 파라미터 검증
   */
  private async validateModelParams(config: any, errors: string[]): Promise<void> {
    if (config.temperature && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.max_tokens && (typeof config.max_tokens !== 'number' || config.max_tokens <= 0)) {
      errors.push('Max tokens must be a positive number');
    }

    if (config.top_p && (typeof config.top_p !== 'number' || config.top_p < 0 || config.top_p > 1)) {
      errors.push('Top-p must be between 0 and 1');
    }
  }

  /**
   * UI 설정 검증
   */
  private async validateUiSettings(config: any, errors: string[]): Promise<void> {
    if (config.theme && !['light', 'dark'].includes(config.theme)) {
      errors.push('Theme must be either light or dark');
    }

    if (config.language && typeof config.language !== 'string') {
      errors.push('Language must be a string');
    }

    if (config.show_confidence_scores && typeof config.show_confidence_scores !== 'boolean') {
      errors.push('show_confidence_scores must be a boolean');
    }
  }

  /**
   * 설정 변경 히스토리 기록
   */
  private async recordConfigurationHistory(
    client: any,
    data: {
      workspace_id: string;
      configuration_id: string;
      change_type: 'create' | 'update' | 'delete' | 'rollback';
      config_category: string;
      config_key: string;
      old_value: any;
      new_value: any;
      change_reason?: string;
      change_description?: string;
      impact_assessment?: any;
      changed_by: string;
      change_approved_by?: string;
    }
  ): Promise<void> {
    await client.query(`
      INSERT INTO configuration_history (
        workspace_id, configuration_id, change_type, config_category, 
        config_key, old_value, new_value, change_reason, change_description,
        impact_assessment, changed_by, change_approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      data.workspace_id,
      data.configuration_id,
      data.change_type,
      data.config_category,
      data.config_key,
      data.old_value ? JSON.stringify(data.old_value) : null,
      JSON.stringify(data.new_value),
      data.change_reason,
      data.change_description,
      data.impact_assessment ? JSON.stringify(data.impact_assessment) : null,
      data.changed_by,
      data.change_approved_by
    ]);
  }

  /**
   * 설정을 배포된 솔루션에 적용
   */
  async deployConfigurationToSolution(
    configurationId: string, 
    solutionIds: string[]
  ): Promise<{ success: boolean; deployed_solutions: string[]; failed_solutions: string[] }> {
    try {
      logger.info('Deploying configuration to solutions', {
        configurationId,
        solutionIds
      });

      const deployedSolutions: string[] = [];
      const failedSolutions: string[] = [];

      // 각 솔루션에 설정 배포 (실제로는 솔루션별 API 호출)
      for (const solutionId of solutionIds) {
        try {
          // TODO: 실제 솔루션 배포 API 호출
          // await this.deploySolutionConfiguration(solutionId, configuration);
          
          deployedSolutions.push(solutionId);
          
          // 배포 상태 업데이트
          await pool.query(`
            UPDATE workspace_configurations 
            SET deployed_to_solution = true,
                deployment_status = 'deployed',
                deployed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [configurationId]);

        } catch (error) {
          logger.error('Failed to deploy configuration to solution', {
            configurationId,
            solutionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failedSolutions.push(solutionId);
        }
      }

      // 배포 히스토리 업데이트
      await pool.query(`
        UPDATE configuration_history 
        SET deployed_to_solutions = $1,
            deployment_completed = $2,
            applied_at = CURRENT_TIMESTAMP
        WHERE configuration_id = $3
      `, [
        deployedSolutions,
        failedSolutions.length === 0,
        configurationId
      ]);

      logger.info('Configuration deployment completed', {
        configurationId,
        deployedCount: deployedSolutions.length,
        failedCount: failedSolutions.length
      });

      return {
        success: failedSolutions.length === 0,
        deployed_solutions: deployedSolutions,
        failed_solutions: failedSolutions
      };

    } catch (error) {
      logger.error('Failed to deploy configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configurationId,
        solutionIds
      });
      throw error;
    }
  }
}
