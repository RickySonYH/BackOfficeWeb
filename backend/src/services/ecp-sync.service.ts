// [advice from AI] ECP 동기화 서비스 - 실시간 권한 동기화 및 히스토리 관리

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import axios from 'axios';
import { EnhancedRbacService } from './enhanced-rbac.service';
import {
  EcpRoleMapping,
  UserRoleAssignment,
  PermissionAuditLog
} from '../types/enhanced-rbac';

interface EcpUserRole {
  user_id: string;
  role_id: string;
  role_name: string;
  tenant_id?: string;
  workspace_id?: string;
  permissions: string[];
  last_updated: string;
}

interface EcpSyncResult {
  success: boolean;
  synchronized_users: number;
  created_assignments: number;
  updated_assignments: number;
  removed_assignments: number;
  errors: string[];
}

interface RoleChangeEvent {
  event_type: 'role_assigned' | 'role_revoked' | 'role_updated' | 'permission_changed';
  user_id: string;
  role_id: string;
  tenant_id?: string | undefined;
  workspace_id?: string | undefined;
  timestamp: string;
  changed_by: string;
  metadata?: any;
}

export class EcpSyncService {
  private rbacService: EnhancedRbacService;
  private ecpApiBaseUrl: string;
  private ecpApiKey: string;
  private syncInterval: number = 5 * 60 * 1000; // 5분
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.rbacService = new EnhancedRbacService();
    this.ecpApiBaseUrl = process.env.ECP_API_BASE_URL || 'http://localhost:8000';
    this.ecpApiKey = process.env.ECP_API_KEY || 'default-api-key';
  }

  /**
   * ECP 동기화 시작
   */
  async startSyncService(): Promise<void> {
    logger.info('Starting ECP synchronization service');

    // 초기 동기화 실행
    await this.performFullSync();

    // 주기적 동기화 설정
    this.syncTimer = setInterval(async () => {
      try {
        await this.performIncrementalSync();
      } catch (error: any) {
        logger.error('Periodic ECP sync failed:', error);
      }
    }, this.syncInterval);

    logger.info('ECP synchronization service started successfully');
  }

  /**
   * ECP 동기화 중지
   */
  stopSyncService(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('ECP synchronization service stopped');
    }
  }

  /**
   * 전체 동기화 수행
   */
  async performFullSync(): Promise<EcpSyncResult> {
    const startTime = Date.now();
    logger.info('Starting full ECP synchronization');

    const result: EcpSyncResult = {
      success: true,
      synchronized_users: 0,
      created_assignments: 0,
      updated_assignments: 0,
      removed_assignments: 0,
      errors: []
    };

    try {
      // 1. ECP에서 모든 사용자 역할 정보 조회
      const ecpUsers = await this.fetchAllEcpUserRoles();
      logger.info(`Fetched ${ecpUsers.length} user roles from ECP`);

      // 2. 각 사용자별로 동기화 수행
      for (const ecpUser of ecpUsers) {
        try {
          const syncResult = await this.syncUserRoles(ecpUser);
          result.synchronized_users++;
          result.created_assignments += syncResult.created;
          result.updated_assignments += syncResult.updated;
          result.removed_assignments += syncResult.removed;
        } catch (error: any) {
          const errorMsg = `Failed to sync user ${ecpUser.user_id}: ${error}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // 3. ECP에서 제거된 사용자들의 역할 정리
      const cleanupResult = await this.cleanupRemovedUsers(ecpUsers);
      result.removed_assignments += cleanupResult.removed_assignments;

      // 4. 동기화 결과 기록
      await this.recordSyncResult(result, Date.now() - startTime);

      logger.info('Full ECP synchronization completed', {
        duration: Date.now() - startTime,
        synchronized_users: result.synchronized_users,
        total_changes: result.created_assignments + result.updated_assignments + result.removed_assignments
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Full sync failed: ${error}`);
      logger.error('Full ECP synchronization failed:', error);
    }

    return result;
  }

  /**
   * 증분 동기화 수행 (변경사항만)
   */
  async performIncrementalSync(): Promise<EcpSyncResult> {
    const startTime = Date.now();
    logger.info('Starting incremental ECP synchronization');

    const result: EcpSyncResult = {
      success: true,
      synchronized_users: 0,
      created_assignments: 0,
      updated_assignments: 0,
      removed_assignments: 0,
      errors: []
    };

    try {
      // 1. 마지막 동기화 시간 조회
      const lastSyncTime = await this.getLastSyncTime();
      
      // 2. ECP에서 변경된 사용자 역할 정보 조회
      const changedUsers = await this.fetchChangedEcpUserRoles(lastSyncTime);
      logger.info(`Found ${changedUsers.length} changed user roles since ${lastSyncTime}`);

      // 3. 변경된 사용자들만 동기화
      for (const ecpUser of changedUsers) {
        try {
          const syncResult = await this.syncUserRoles(ecpUser);
          result.synchronized_users++;
          result.created_assignments += syncResult.created;
          result.updated_assignments += syncResult.updated;
          result.removed_assignments += syncResult.removed;
        } catch (error: any) {
          const errorMsg = `Failed to sync user ${ecpUser.user_id}: ${error}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // 4. 동기화 결과 기록
      await this.recordSyncResult(result, Date.now() - startTime);

      logger.info('Incremental ECP synchronization completed', {
        duration: Date.now() - startTime,
        synchronized_users: result.synchronized_users
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Incremental sync failed: ${error}`);
      logger.error('Incremental ECP synchronization failed:', error);
    }

    return result;
  }

  /**
   * ECP에서 모든 사용자 역할 정보 조회
   */
  private async fetchAllEcpUserRoles(): Promise<EcpUserRole[]> {
    try {
      const response = await axios.get(`${this.ecpApiBaseUrl}/api/users/roles`, {
        headers: {
          'Authorization': `Bearer ${this.ecpApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return (response.data as any)?.data || [];
    } catch (error: any) {
      if (error.response) {
        logger.error('ECP API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw new Error(`Failed to fetch ECP user roles: ${error}`);
    }
  }

  /**
   * ECP에서 변경된 사용자 역할 정보 조회
   */
  private async fetchChangedEcpUserRoles(since: string): Promise<EcpUserRole[]> {
    try {
      const response = await axios.get(`${this.ecpApiBaseUrl}/api/users/roles/changes`, {
        headers: {
          'Authorization': `Bearer ${this.ecpApiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          since: since
        },
        timeout: 30000
      });

      return (response.data as any)?.data || [];
    } catch (error: any) {
      if (error.response) {
        logger.error('ECP API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw new Error(`Failed to fetch changed ECP user roles: ${error}`);
    }
  }

  /**
   * 개별 사용자 역할 동기화
   */
  private async syncUserRoles(ecpUser: EcpUserRole): Promise<{
    created: number;
    updated: number;
    removed: number;
  }> {
    const client = await pool.connect();
    const result = { created: 0, updated: 0, removed: 0 };

    try {
      await client.query('BEGIN');

      // 1. ECP 역할을 내부 역할로 매핑
      const mappedRoles = await this.mapEcpRolesToInternal(ecpUser, client);

      // 2. 현재 사용자의 활성 역할 할당 조회
      const currentAssignments = await this.getCurrentUserAssignments(ecpUser.user_id, client);

      // 3. 새로운 역할 할당 생성
      for (const mappedRole of mappedRoles) {
        const existingAssignment = currentAssignments.find(a => 
          a.role_id === mappedRole.internal_role_id &&
          a.resource_type === mappedRole.resource_type &&
          a.resource_id === mappedRole.resource_id
        );

        if (!existingAssignment) {
          // 새 할당 생성
          await this.createRoleAssignment(ecpUser.user_id, mappedRole, client);
          result.created++;
          
          await this.logRoleChange({
            event_type: 'role_assigned',
            user_id: ecpUser.user_id,
            role_id: mappedRole.internal_role_id,
            tenant_id: mappedRole.tenant_id || undefined,
            workspace_id: mappedRole.workspace_id || undefined,
            timestamp: new Date().toISOString(),
            changed_by: 'ecp_sync_service',
            metadata: { ecp_role_id: ecpUser.role_id, sync_type: 'automatic' }
          }, client);
        } else {
          // 기존 할당 업데이트 (필요한 경우)
          const needsUpdate = await this.checkAssignmentNeedsUpdate(existingAssignment, mappedRole);
          if (needsUpdate) {
            await this.updateRoleAssignment(existingAssignment.id, mappedRole, client);
            result.updated++;

            await this.logRoleChange({
              event_type: 'role_updated',
              user_id: ecpUser.user_id,
              role_id: mappedRole.internal_role_id,
              tenant_id: mappedRole.tenant_id || undefined,
              workspace_id: mappedRole.workspace_id || undefined,
              timestamp: new Date().toISOString(),
              changed_by: 'ecp_sync_service',
              metadata: { ecp_role_id: ecpUser.role_id, sync_type: 'automatic' }
            }, client);
          }
        }
      }

      // 4. ECP에서 제거된 역할 할당 비활성화
      const mappedRoleIds = mappedRoles.map(r => r.internal_role_id);
      for (const assignment of currentAssignments) {
        if (!mappedRoleIds.includes(assignment.role_id)) {
          await this.deactivateRoleAssignment(assignment.id, client);
          result.removed++;

          await this.logRoleChange({
            event_type: 'role_revoked',
            user_id: ecpUser.user_id,
            role_id: assignment.role_id,
            tenant_id: assignment.resource_type === 'tenant' ? assignment.resource_id : undefined,
            workspace_id: assignment.resource_type === 'workspace' ? assignment.resource_id : undefined,
            timestamp: new Date().toISOString(),
            changed_by: 'ecp_sync_service',
            metadata: { sync_type: 'automatic', reason: 'removed_from_ecp' }
          }, client);
        }
      }

      await client.query('COMMIT');
      return result;

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * ECP 역할을 내부 역할로 매핑
   */
  private async mapEcpRolesToInternal(ecpUser: EcpUserRole, client: any): Promise<Array<{
    internal_role_id: string;
    resource_type: 'system' | 'tenant' | 'workspace';
    resource_id?: string;
    tenant_id?: string;
    workspace_id?: string;
    conditions?: any;
  }>> {
    // ECP 역할 매핑 규칙 조회
    const mappings = await client.query(`
      SELECT * FROM ecp_role_mappings
      WHERE is_active = true
        AND (
          (mapping_type = 'exact' AND ecp_role_id = $1)
          OR (mapping_type = 'contains' AND $2 LIKE '%' || ecp_role_name || '%')
          OR (mapping_type = 'regex' AND $2 ~ ecp_role_name)
        )
        AND (tenant_id IS NULL OR tenant_id = $3)
        AND (workspace_id IS NULL OR workspace_id = $4)
      ORDER BY priority DESC, created_at ASC
    `, [ecpUser.role_id, ecpUser.role_name, ecpUser.tenant_id, ecpUser.workspace_id]);

    const mappedRoles = [];

    for (const mapping of mappings.rows) {
      mappedRoles.push({
        internal_role_id: mapping.internal_role_id,
        resource_type: this.determineResourceType(mapping, ecpUser),
        resource_id: this.determineResourceId(mapping, ecpUser),
        tenant_id: mapping.tenant_id || ecpUser.tenant_id,
        workspace_id: mapping.workspace_id || ecpUser.workspace_id,
        conditions: mapping.mapping_config?.conditions
      });
    }

    // 매핑되지 않은 역할에 대한 기본 처리
    if (mappedRoles.length === 0) {
      logger.warn(`No mapping found for ECP role: ${ecpUser.role_name} (${ecpUser.role_id})`);
      
      // 기본 역할 할당 (설정에 따라)
      const defaultRoleId = await this.getDefaultRoleForEcpRole(ecpUser.role_name, client);
      if (defaultRoleId) {
        mappedRoles.push({
          internal_role_id: defaultRoleId,
          resource_type: ecpUser.workspace_id ? 'workspace' : (ecpUser.tenant_id ? 'tenant' : 'system'),
          resource_id: ecpUser.workspace_id || ecpUser.tenant_id || undefined,
          tenant_id: ecpUser.tenant_id || undefined,
          workspace_id: ecpUser.workspace_id || undefined
        });
      }
    }

    return mappedRoles as Array<{
      internal_role_id: string;
      resource_type: 'system' | 'tenant' | 'workspace';
      resource_id?: string;
      tenant_id?: string;
      workspace_id?: string;
      conditions?: any;
    }>;
  }

  /**
   * 현재 사용자의 활성 역할 할당 조회
   */
  private async getCurrentUserAssignments(userId: string, client: any): Promise<UserRoleAssignment[]> {
    const result = await client.query(`
      SELECT * FROM user_role_assignments
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    return result.rows;
  }

  /**
   * 역할 할당 생성
   */
  private async createRoleAssignment(
    userId: string, 
    mappedRole: any, 
    client: any
  ): Promise<void> {
    await client.query(`
      INSERT INTO user_role_assignments 
      (user_id, role_id, resource_type, resource_id, assigned_by, conditions, metadata)
      VALUES ($1, $2, $3, $4, 'ecp_sync_service', $5, $6)
    `, [
      userId,
      mappedRole.internal_role_id,
      mappedRole.resource_type,
      mappedRole.resource_id,
      JSON.stringify(mappedRole.conditions || {}),
      JSON.stringify({
        sync_source: 'ecp',
        tenant_id: mappedRole.tenant_id,
        workspace_id: mappedRole.workspace_id
      })
    ]);
  }

  /**
   * 역할 할당 업데이트 필요성 확인
   */
  private async checkAssignmentNeedsUpdate(
    existingAssignment: UserRoleAssignment, 
    mappedRole: any
  ): Promise<boolean> {
    // 조건이나 메타데이터가 변경되었는지 확인
    const existingConditions = JSON.stringify(existingAssignment.conditions || {});
    const newConditions = JSON.stringify(mappedRole.conditions || {});
    
    return existingConditions !== newConditions;
  }

  /**
   * 역할 할당 업데이트
   */
  private async updateRoleAssignment(
    assignmentId: string, 
    mappedRole: any, 
    client: any
  ): Promise<void> {
    await client.query(`
      UPDATE user_role_assignments
      SET conditions = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [
      JSON.stringify(mappedRole.conditions || {}),
      JSON.stringify({
        sync_source: 'ecp',
        tenant_id: mappedRole.tenant_id,
        workspace_id: mappedRole.workspace_id,
        last_synced: new Date().toISOString()
      }),
      assignmentId
    ]);
  }

  /**
   * 역할 할당 비활성화
   */
  private async deactivateRoleAssignment(assignmentId: string, client: any): Promise<void> {
    await client.query(`
      UPDATE user_role_assignments
      SET is_active = false, deactivated_at = CURRENT_TIMESTAMP, deactivated_by = 'ecp_sync_service'
      WHERE id = $1
    `, [assignmentId]);
  }

  /**
   * 역할 변경 로그 기록
   */
  private async logRoleChange(event: RoleChangeEvent, client: any): Promise<void> {
    await client.query(`
      INSERT INTO permission_audit_logs 
      (user_id, action_type, resource_type, resource_id, result, reason, performed_by, metadata)
      VALUES ($1, $2, $3, $4, 'granted', $5, $6, $7)
    `, [
      event.user_id,
      event.event_type,
      event.tenant_id ? 'tenant' : (event.workspace_id ? 'workspace' : 'system'),
      event.tenant_id || event.workspace_id,
      `Role ${event.event_type} via ECP sync`,
      event.changed_by,
      JSON.stringify(event.metadata)
    ]);

    // 별도의 ECP 동기화 로그 테이블에도 기록
    await client.query(`
      INSERT INTO ecp_sync_logs 
      (event_type, user_id, role_id, tenant_id, workspace_id, timestamp, changed_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      event.event_type,
      event.user_id,
      event.role_id,
      event.tenant_id,
      event.workspace_id,
      event.timestamp,
      event.changed_by,
      JSON.stringify(event.metadata)
    ]);
  }

  /**
   * ECP에서 제거된 사용자들의 역할 정리
   */
  private async cleanupRemovedUsers(currentEcpUsers: EcpUserRole[]): Promise<{
    removed_assignments: number;
  }> {
    const currentEcpUserIds = currentEcpUsers.map(u => u.user_id);
    
    if (currentEcpUserIds.length === 0) {
      return { removed_assignments: 0 };
    }

    // ECP 동기화로 생성된 할당 중 현재 ECP에 없는 사용자들의 할당 비활성화
    const result = await pool.query(`
      UPDATE user_role_assignments
      SET is_active = false, deactivated_at = CURRENT_TIMESTAMP, deactivated_by = 'ecp_sync_cleanup'
      WHERE assigned_by = 'ecp_sync_service'
        AND is_active = true
        AND user_id NOT IN (${currentEcpUserIds.map((_, i) => `$${i + 1}`).join(', ')})
      RETURNING id
    `, currentEcpUserIds);

    logger.info(`Cleaned up ${result.rows.length} role assignments for removed ECP users`);

    return { removed_assignments: result.rows.length };
  }

  /**
   * 마지막 동기화 시간 조회
   */
  private async getLastSyncTime(): Promise<string> {
    const result = await pool.query(`
      SELECT MAX(completed_at) as last_sync
      FROM ecp_sync_results
      WHERE success = true
    `);

    return result.rows[0]?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 기본값: 24시간 전
  }

  /**
   * 동기화 결과 기록
   */
  private async recordSyncResult(result: EcpSyncResult, duration: number): Promise<void> {
    await pool.query(`
      INSERT INTO ecp_sync_results 
      (sync_type, success, synchronized_users, created_assignments, updated_assignments, 
       removed_assignments, errors, duration_ms, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `, [
      'incremental', // 또는 'full'
      result.success,
      result.synchronized_users,
      result.created_assignments,
      result.updated_assignments,
      result.removed_assignments,
      JSON.stringify(result.errors),
      duration
    ]);
  }

  /**
   * 수동 사용자 동기화
   */
  async syncSpecificUser(userId: string): Promise<{
    success: boolean;
    changes: { created: number; updated: number; removed: number };
    error?: string;
  }> {
    try {
      // ECP에서 특정 사용자 역할 정보 조회
      const response = await axios.get(`${this.ecpApiBaseUrl}/api/users/${userId}/roles`, {
        headers: {
          'Authorization': `Bearer ${this.ecpApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const ecpUser: EcpUserRole = (response.data as any)?.data;
      
      if (!ecpUser) {
        return {
          success: false,
          changes: { created: 0, updated: 0, removed: 0 },
          error: 'User not found in ECP'
        };
      }

      const changes = await this.syncUserRoles(ecpUser);

      logger.info(`Manual sync completed for user ${userId}`, changes);

      return {
        success: true,
        changes
      };

    } catch (error: any) {
      logger.error(`Manual sync failed for user ${userId}:`, error);
      return {
        success: false,
        changes: { created: 0, updated: 0, removed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ECP 연결 상태 확인
   */
  async checkEcpConnection(): Promise<{
    connected: boolean;
    response_time?: number;
    version?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.ecpApiBaseUrl}/api/health`, {
        headers: {
          'Authorization': `Bearer ${this.ecpApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        connected: true,
        response_time: Date.now() - startTime,
        version: (response.data as any)?.version
      };

    } catch (error: any) {
      return {
        connected: false,
        response_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 헬퍼 메서드들
  private determineResourceType(mapping: any, ecpUser: EcpUserRole): 'system' | 'tenant' | 'workspace' {
    if (mapping.workspace_id || ecpUser.workspace_id) return 'workspace';
    if (mapping.tenant_id || ecpUser.tenant_id) return 'tenant';
    return 'system';
  }

  private determineResourceId(mapping: any, ecpUser: EcpUserRole): string | undefined {
    return mapping.workspace_id || ecpUser.workspace_id || mapping.tenant_id || ecpUser.tenant_id;
  }

  private async getDefaultRoleForEcpRole(ecpRoleName: string, client: any): Promise<string | null> {
    // ECP 역할명을 기반으로 기본 내부 역할 결정 로직
    const roleMappings: { [key: string]: string } = {
      'admin': 'system_admin',
      'manager': 'tenant_manager',
      'user': 'workspace_user',
      'viewer': 'workspace_viewer'
    };

    const normalizedRoleName = ecpRoleName.toLowerCase();
    
    for (const [pattern, defaultRole] of Object.entries(roleMappings)) {
      if (normalizedRoleName.includes(pattern)) {
        // 해당 역할이 존재하는지 확인
        const result = await client.query(
          'SELECT id FROM roles WHERE name = $1 AND is_system_role = true',
          [defaultRole]
        );
        
        if (result.rows.length > 0) {
          return result.rows[0].id;
        }
      }
    }

    return null;
  }
}
