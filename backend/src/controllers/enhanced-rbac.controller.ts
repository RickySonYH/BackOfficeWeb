// [advice from AI] 강화된 RBAC 시스템 컨트롤러

import { Request, Response } from 'express';
import { EnhancedRbacService } from '../services/enhanced-rbac.service';
import { EcpSyncService } from '../services/ecp-sync.service';
import { logger } from '../utils/logger';
import {
  CreateRoleRequest,
  AssignRoleRequest,
  CreateEcpMappingRequest,
  BulkPermissionCheckRequest,
  PermissionCheck
} from '../types/enhanced-rbac';

export class EnhancedRbacController {
  private rbacService: EnhancedRbacService;
  private ecpSyncService: EcpSyncService;

  constructor() {
    this.rbacService = new EnhancedRbacService();
    this.ecpSyncService = new EcpSyncService();
  }

  /**
   * 권한 확인 API
   */
  checkPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, resource_type, resource_id, action } = req.body;

      if (!user_id || !resource_type || !action) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, resource_type, action'
        });
        return;
      }

      const permissionCheck: PermissionCheck = {
        user_id,
        resource_type,
        resource_id,
        action,
        context: {
          ...(req.ip && { ip_address: req.ip }),
          additional_data: {
            ...(req.get('User-Agent') && { user_agent: req.get('User-Agent') }),
            session_id: (req as any).session?.id
          }
        }
      };

      const result = await this.rbacService.checkPermission(permissionCheck);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Permission check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 대량 권한 확인 API
   */
  bulkCheckPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, checks } = req.body;

      if (!user_id || !Array.isArray(checks)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, checks (array)'
        });
        return;
      }

      const bulkRequest: BulkPermissionCheckRequest = {
        user_id,
        checks,
        context: {
          ...(req.ip && { ip_address: req.ip }),
          ...(req.get('User-Agent') && { user_agent: req.get('User-Agent') }),
          session_id: (req as any).session?.id
        }
      };

      const result = await this.rbacService.bulkCheckPermissions(bulkRequest);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Bulk permission check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 역할 생성 API
   */
  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const roleRequest: CreateRoleRequest = req.body;
      const createdBy = req.user?.id || 'system';

      // 입력 유효성 검사
      if (!roleRequest.name || !roleRequest.role_type || !roleRequest.permissions) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, role_type, permissions'
        });
        return;
      }

      const result = await this.rbacService.createRole(roleRequest, createdBy);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Role created successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Role creation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 역할 할당 API
   */
  assignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const assignRequest: AssignRoleRequest = req.body;
      const assignedBy = req.user?.id || 'system';

      // 입력 유효성 검사
      if (!assignRequest.user_id || !assignRequest.role_id || !assignRequest.resource_type) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, role_id, resource_type'
        });
        return;
      }

      const result = await this.rbacService.assignRole(assignRequest, assignedBy);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Role assigned successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Role assignment failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * ECP 역할 매핑 생성 API
   */
  createEcpRoleMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const mappingRequest: CreateEcpMappingRequest = req.body;
      const createdBy = req.user?.id || 'system';

      // 입력 유효성 검사
      if (!mappingRequest.ecp_role_id || !mappingRequest.ecp_role_name || !mappingRequest.internal_role_id) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ecp_role_id, ecp_role_name, internal_role_id'
        });
        return;
      }

      const result = await this.rbacService.createEcpRoleMapping(mappingRequest, createdBy);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'ECP role mapping created successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('ECP role mapping creation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 사용자 권한 요약 조회 API
   */
  getUserPermissionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await this.rbacService.getUserPermissionSummary(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Get user permission summary failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 전체 ECP 동기화 실행 API
   */
  performFullEcpSync = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Manual full ECP sync requested by user:', req.user?.id);
      
      const result = await this.ecpSyncService.performFullSync();

      res.status(200).json({
        success: true,
        data: result,
        message: 'Full ECP synchronization completed'
      });

    } catch (error) {
      logger.error('Full ECP sync failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 증분 ECP 동기화 실행 API
   */
  performIncrementalEcpSync = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Manual incremental ECP sync requested by user:', req.user?.id);
      
      const result = await this.ecpSyncService.performIncrementalSync();

      res.status(200).json({
        success: true,
        data: result,
        message: 'Incremental ECP synchronization completed'
      });

    } catch (error) {
      logger.error('Incremental ECP sync failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 특정 사용자 ECP 동기화 API
   */
  syncSpecificUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      logger.info(`Manual user sync requested for user ${userId} by:`, req.user?.id);
      
      const result = await this.ecpSyncService.syncSpecificUser(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.changes,
          message: 'User synchronization completed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('User sync failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * ECP 연결 상태 확인 API
   */
  checkEcpConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.ecpSyncService.checkEcpConnection();

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('ECP connection check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 권한 감사 로그 조회 API
   */
  getPermissionAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        user_id,
        action_type,
        resource_type,
        result,
        start_date,
        end_date,
        page = 1,
        limit = 50
      } = req.query;

      // TODO: 실제 데이터베이스 쿼리 구현
      // 지금은 모의 데이터 반환
      const mockLogs = [
        {
          id: '1',
          user_id: user_id || 'user-1',
          action_type: 'permission_check',
          resource_type: 'workspace',
          resource_id: 'workspace-1',
          requested_action: 'read',
          result: 'granted',
          reason: 'Permission granted via role assignment',
          ip_address: '192.168.1.100',
          created_at: new Date().toISOString()
        }
      ];

      res.status(200).json({
        success: true,
        data: mockLogs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockLogs.length,
          total_pages: Math.ceil(mockLogs.length / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Get permission audit logs failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 사용자별 권한 매트릭스 조회 API
   */
  getPermissionMatrix = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenant_id, workspace_id } = req.query;

      // TODO: 실제 권한 매트릭스 생성 로직 구현
      // 지금은 모의 데이터 반환
      const mockMatrix = {
        resources: [
          { type: 'workspace', id: 'workspace-1', name: 'KMS Workspace' },
          { type: 'workspace', id: 'workspace-2', name: 'Advisor Workspace' }
        ],
        actions: ['read', 'write', 'delete', 'manage'],
        users: [
          {
            user_id: 'user-1',
            username: 'admin',
            permissions: {
              'workspace-1': { read: true, write: true, delete: true, manage: true },
              'workspace-2': { read: true, write: false, delete: false, manage: false }
            }
          }
        ]
      };

      res.status(200).json({
        success: true,
        data: mockMatrix
      });

    } catch (error) {
      logger.error('Get permission matrix failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 역할 계층 구조 조회 API
   */
  getRoleHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: 실제 역할 계층 구조 조회 로직 구현
      const mockHierarchy = {
        nodes: [
          { id: 'system_admin', name: 'System Admin', type: 'system', level: 0 },
          { id: 'tenant_admin', name: 'Tenant Admin', type: 'tenant', level: 1 },
          { id: 'workspace_admin', name: 'Workspace Admin', type: 'workspace', level: 2 },
          { id: 'workspace_user', name: 'Workspace User', type: 'workspace', level: 3 }
        ],
        edges: [
          { parent: 'system_admin', child: 'tenant_admin' },
          { parent: 'tenant_admin', child: 'workspace_admin' },
          { parent: 'workspace_admin', child: 'workspace_user' }
        ]
      };

      res.status(200).json({
        success: true,
        data: mockHierarchy
      });

    } catch (error) {
      logger.error('Get role hierarchy failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * ECP 동기화 히스토리 조회 API
   */
  getEcpSyncHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sync_type,
        success,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      // TODO: 실제 동기화 히스토리 조회 로직 구현
      const mockHistory = [
        {
          id: '1',
          sync_type: 'incremental',
          success: true,
          synchronized_users: 15,
          created_assignments: 3,
          updated_assignments: 2,
          removed_assignments: 1,
          duration_ms: 2500,
          completed_at: new Date().toISOString()
        }
      ];

      res.status(200).json({
        success: true,
        data: mockHistory,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockHistory.length,
          total_pages: Math.ceil(mockHistory.length / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Get ECP sync history failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 권한 통계 조회 API
   */
  getPermissionStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: 실제 권한 통계 계산 로직 구현
      const mockStats = {
        total_users: 50,
        total_roles: 12,
        total_permissions: 25,
        active_assignments: 75,
        recent_permission_checks: 1250,
        denied_requests_last_24h: 15,
        top_accessed_resources: [
          { resource_type: 'workspace', resource_name: 'KMS Workspace', access_count: 450 },
          { resource_type: 'workspace', resource_name: 'Advisor Workspace', access_count: 320 }
        ],
        permission_check_success_rate: 94.5
      };

      res.status(200).json({
        success: true,
        data: mockStats
      });

    } catch (error) {
      logger.error('Get permission statistics failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
