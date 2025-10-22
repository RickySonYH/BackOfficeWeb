// [advice from AI] 워크스페이스 설정 관리 컨트롤러

import { Request, Response } from 'express';
import { WorkspaceConfigurationService } from '../services/workspace-configuration.service';
import { logger } from '../utils/logger';
import {
  ConfigurationUpdateRequest,
  ConfigurationRollbackRequest,
  ConfigurationDeploymentRequest,
  BulkConfigurationUpdateRequest
} from '../types/workspace-configuration';

const workspaceConfigService = new WorkspaceConfigurationService();

/**
 * 워크스페이스 설정 조회
 */
export const getWorkspaceConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { environment = 'production' } = req.query;

    const result = await workspaceConfigService.getWorkspaceConfiguration(
      workspaceId,
      environment as 'development' | 'staging' | 'production'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get workspace configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get workspace configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 카테고리별 조회
 */
export const getConfigurationByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, category } = req.params;
    const { environment = 'production' } = req.query;

    const result = await workspaceConfigService.getConfigurationByCategory(
      workspaceId,
      category,
      environment as 'development' | 'staging' | 'production'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get configuration by category:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get configuration by category',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 업데이트
 */
export const updateConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const updateRequest: ConfigurationUpdateRequest = {
      workspaceId,
      ...req.body,
      updatedBy: (req as any).user?.id || 'system'
    };

    // 설정 유효성 검증
    const validationResult = await workspaceConfigService.validateConfiguration(
      updateRequest.workspaceId,
      updateRequest.configCategory,
      updateRequest.configKey,
      updateRequest.configValue
    );

    if (!validationResult.isValid) {
      res.status(400).json({
        success: false,
        error: 'Configuration validation failed',
        validationErrors: validationResult.errors,
        warnings: validationResult.warnings,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await workspaceConfigService.updateConfiguration(updateRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Configuration updated successfully',
        warnings: validationResult.warnings,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to update configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 대량 설정 업데이트
 */
export const bulkUpdateConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const bulkRequest: BulkConfigurationUpdateRequest = {
      workspaceId,
      ...req.body,
      updatedBy: (req as any).user?.id || 'system'
    };

    // 각 설정에 대한 유효성 검증
    const validationErrors: Array<{
      configCategory: string;
      configKey: string;
      errors: string[];
    }> = [];

    for (const config of bulkRequest.updates) {
      const validationResult = await workspaceConfigService.validateConfiguration(
        workspaceId,
        config.configCategory,
        config.configKey,
        config.configValue
      );

      if (!validationResult.isValid) {
        validationErrors.push({
          configCategory: config.configCategory,
          configKey: config.configKey,
          errors: validationResult.errors
        });
      }
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Bulk configuration validation failed',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await workspaceConfigService.bulkUpdateConfiguration(
      bulkRequest.workspaceId,
      bulkRequest.updates,
      bulkRequest.environment,
      bulkRequest.updatedBy,
      bulkRequest.changeReason
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Bulk configuration update completed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to bulk update configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk update configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 롤백
 */
export const rollbackConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const rollbackRequest: ConfigurationRollbackRequest = {
      workspaceId,
      ...req.body,
      rolledBackBy: (req as any).user?.id || 'system'
    };

    const result = await workspaceConfigService.rollbackConfiguration(rollbackRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Configuration rolled back successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to rollback configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rollback configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 변경 히스토리 조회
 */
export const getConfigurationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { 
      configCategory, 
      configKey, 
      limit = '50', 
      offset = '0' 
    } = req.query;

    const result = await workspaceConfigService.getConfigurationHistory(
      workspaceId,
      configCategory as string,
      configKey as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get configuration history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get configuration history',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 유효성 검증
 */
export const validateConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { configCategory, configKey, configValue } = req.body;

    const result = await workspaceConfigService.validateConfiguration(
      workspaceId,
      configCategory,
      configKey,
      configValue
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to validate configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 템플릿 조회
 */
export const getConfigurationTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceType } = req.params;

    if (!['KMS', 'ADVISOR'].includes(workspaceType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid workspace type. Must be KMS or ADVISOR',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await workspaceConfigService.getConfigurationTemplates(
      workspaceType as 'KMS' | 'ADVISOR'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get configuration templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get configuration templates',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 배포
 */
export const deployConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const deploymentRequest: ConfigurationDeploymentRequest = {
      workspaceId,
      ...req.body,
      deployedBy: (req as any).user?.id || 'system'
    };

    const result = await workspaceConfigService.deployConfiguration(deploymentRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Configuration deployed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to deploy configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 내보내기
 */
export const exportConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { environment = 'production', format = 'json' } = req.query;

    const configResult = await workspaceConfigService.getWorkspaceConfiguration(
      workspaceId,
      environment as 'development' | 'staging' | 'production'
    );

    if (!configResult.success || !configResult.data) {
      res.status(500).json({
        success: false,
        error: configResult.error || 'Failed to get configuration for export',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 설정 데이터를 내보내기 형식으로 변환
    const exportData = {
      workspaceId,
      environment,
      exportedAt: new Date().toISOString(),
      exportedBy: (req as any).user?.id || 'system',
      configurations: {}
    };

    // 카테고리별로 그룹화
    const configsByCategory: { [category: string]: { [key: string]: any } } = {};
    for (const config of configResult.data) {
      if (!configsByCategory[config.config_category]) {
        configsByCategory[config.config_category] = {};
      }
      configsByCategory[config.config_category][config.config_key] = config.config_value;
    }

    (exportData as any).configurations = configsByCategory;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="workspace-config-${workspaceId}-${environment}-${Date.now()}.json"`);
      res.json(exportData);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format. Only JSON is currently supported.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to export configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export configuration',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 설정 가져오기
 */
export const importConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { 
      configurations, 
      environment = 'development', 
      overwriteExisting = false 
    } = req.body;

    if (!configurations || typeof configurations !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration data',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const updates: Array<{
      configCategory: string;
      configKey: string;
      configValue: any;
    }> = [];

    // 설정 데이터를 업데이트 형식으로 변환
    for (const [category, categoryConfigs] of Object.entries(configurations)) {
      if (typeof categoryConfigs === 'object' && categoryConfigs !== null) {
        for (const [key, value] of Object.entries(categoryConfigs)) {
          updates.push({
            configCategory: category,
            configKey: key,
            configValue: value
          });
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid configuration updates found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 기존 설정 확인 (덮어쓰기 옵션이 false인 경우)
    if (!overwriteExisting) {
      const existingConfig = await workspaceConfigService.getWorkspaceConfiguration(
        workspaceId,
        environment as 'development' | 'staging' | 'production'
      );

      if (existingConfig.success && existingConfig.data && existingConfig.data.length > 0) {
        res.status(409).json({
          success: false,
          error: 'Configuration already exists. Set overwriteExisting to true to overwrite.',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // 대량 업데이트 실행
    const result = await workspaceConfigService.bulkUpdateConfiguration(
      workspaceId,
      updates,
      environment as 'development' | 'staging' | 'production',
      (req as any).user?.id || 'system',
      'Configuration import'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Configuration imported successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to import configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import configuration',
      timestamp: new Date().toISOString()
    });
  }
};
