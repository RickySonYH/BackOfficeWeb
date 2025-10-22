// [advice from AI] 강화된 RBAC 시스템 서비스

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import {
  Permission,
  Role,
  UserRoleAssignment,
  EcpRoleMapping,
  PermissionCheck,
  PermissionCheckResult,
  PermissionAuditLog,
  CreateRoleRequest,
  AssignRoleRequest,
  CreateEcpMappingRequest,
  BulkPermissionCheckRequest,
  BulkPermissionCheckResponse,
  UserPermissionSummary,
  PermissionContext,
  PermissionPolicy
} from '../types/enhanced-rbac';

export class EnhancedRbacService {

  /**
   * 권한 확인 (핵심 메서드)
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionCheckResult> {
    const startTime = Date.now();
    
    try {
      // 1. 사용자의 모든 역할 조회 (활성화된 것만)
      const userRoles = await this.getUserActiveRoles(check.user_id, check.resource_type, check.resource_id);
      
      if (userRoles.length === 0) {
        const result = {
          allowed: false,
          reason: 'No active roles found for user',
          matched_permissions: [],
          denied_reasons: ['User has no assigned roles']
        };
        
        await this.logPermissionCheck(check, result, startTime);
        return result;
      }

      // 2. 역할에서 권한 추출 및 상속 처리
      const effectivePermissions = await this.getEffectivePermissions(userRoles);

      // 3. 요청된 액션과 매칭되는 권한 찾기
      const matchedPermissions = effectivePermissions.filter(permission => 
        this.doesPermissionMatch(permission, check)
      );

      if (matchedPermissions.length === 0) {
        const result = {
          allowed: false,
          reason: 'No matching permissions found',
          matched_permissions: [],
          denied_reasons: [`No permission found for action '${check.action}' on resource '${check.resource_type}'`]
        };
        
        await this.logPermissionCheck(check, result, startTime);
        return result;
      }

      // 4. 조건부 권한 평가
      const conditionResults = await this.evaluatePermissionConditions(matchedPermissions, check);
      const allowedPermissions = conditionResults.filter(r => r.allowed).map(r => r.permission);

      if (allowedPermissions.length === 0) {
        const result = {
          allowed: false,
          reason: 'Permission conditions not met',
          matched_permissions: matchedPermissions,
          denied_reasons: conditionResults.filter(r => !r.allowed).map(r => r.reason)
        };
        
        await this.logPermissionCheck(check, result, startTime);
        return result;
      }

      // 5. 정책 엔진 평가 (추가 보안 레이어)
      const policyResult = await this.evaluatePolicies(check, allowedPermissions);
      
      if (!policyResult.allowed) {
        const result = {
          allowed: false,
          reason: policyResult.reason,
          matched_permissions: matchedPermissions,
          denied_reasons: [policyResult.reason]
        };
        
        await this.logPermissionCheck(check, result, startTime);
        return result;
      }

      // 6. 권한 허용
      const result = {
        allowed: true,
        reason: 'Permission granted',
        matched_permissions: allowedPermissions
      };
      
      await this.logPermissionCheck(check, result, startTime);
      return result;

    } catch (error) {
      logger.error('Permission check failed:', error);
      const result = {
        allowed: false,
        reason: 'Internal error during permission check',
        matched_permissions: [],
        denied_reasons: ['System error occurred']
      };
      
      await this.logPermissionCheck(check, result, startTime);
      return result;
    }
  }

  /**
   * 대량 권한 확인
   */
  async bulkCheckPermissions(request: BulkPermissionCheckRequest): Promise<BulkPermissionCheckResponse> {
    const results = [];
    let allowedCount = 0;

    for (const check of request.checks) {
      const permissionCheck: PermissionCheck = {
        user_id: request.user_id,
        resource_type: check.resource_type as any,
        resource_id: check.resource_id,
        action: check.action,
        context: request.context
      };

      const result = await this.checkPermission(permissionCheck);
      
      results.push({
        resource_type: check.resource_type,
        resource_id: check.resource_id,
        action: check.action,
        allowed: result.allowed,
        reason: result.reason
      });

      if (result.allowed) {
        allowedCount++;
      }
    }

    return {
      user_id: request.user_id,
      results,
      overall_summary: {
        total_checks: request.checks.length,
        allowed_count: allowedCount,
        denied_count: request.checks.length - allowedCount
      }
    };
  }

  /**
   * 사용자의 활성 역할 조회
   */
  private async getUserActiveRoles(
    userId: string, 
    resourceType?: string, 
    resourceId?: string
  ): Promise<UserRoleAssignment[]> {
    let query = `
      SELECT ura.*, r.name as role_name, r.role_type, r.permissions
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
        AND r.is_active = true
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;

    // 리소스 타입별 필터링
    if (resourceType) {
      query += ` AND (ura.resource_type = 'system' OR ura.resource_type = $${paramIndex++})`;
      params.push(resourceType);
    }

    // 리소스 ID별 필터링
    if (resourceId) {
      query += ` AND (ura.resource_id IS NULL OR ura.resource_id = $${paramIndex++})`;
      params.push(resourceId);
    }

    query += ` ORDER BY ura.resource_type DESC, ura.assigned_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 효과적인 권한 계산 (상속 포함)
   */
  private async getEffectivePermissions(userRoles: UserRoleAssignment[]): Promise<Permission[]> {
    const allPermissions = new Map<string, Permission>();

    for (const roleAssignment of userRoles) {
      // 직접 권한
      const directPermissions = await this.getRolePermissions(roleAssignment.role_id);
      directPermissions.forEach(p => allPermissions.set(p.id, p));

      // 상속된 권한
      const inheritedPermissions = await this.getInheritedPermissions(roleAssignment.role_id);
      inheritedPermissions.forEach(p => allPermissions.set(p.id, p));
    }

    return Array.from(allPermissions.values());
  }

  /**
   * 역할의 직접 권한 조회
   */
  private async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await pool.query(`
      SELECT p.*
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1 AND rp.is_active = true
    `, [roleId]);

    return result.rows;
  }

  /**
   * 역할의 상속된 권한 조회
   */
  private async getInheritedPermissions(roleId: string): Promise<Permission[]> {
    const inheritedPermissions = new Map<string, Permission>();
    const visited = new Set<string>();
    
    await this.collectInheritedPermissions(roleId, inheritedPermissions, visited);
    
    return Array.from(inheritedPermissions.values());
  }

  /**
   * 재귀적으로 상속된 권한 수집
   */
  private async collectInheritedPermissions(
    roleId: string, 
    permissionsMap: Map<string, Permission>, 
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(roleId)) {
      return; // 순환 참조 방지
    }
    visited.add(roleId);

    // 부모 역할들 조회
    const parentRoles = await pool.query(`
      SELECT parent_role_id, inheritance_type, conditions
      FROM role_hierarchy
      WHERE child_role_id = $1
    `, [roleId]);

    for (const parentRole of parentRoles.rows) {
      // 부모 역할의 권한 조회
      const parentPermissions = await this.getRolePermissions(parentRole.parent_role_id);
      
      // 상속 타입에 따른 필터링
      const filteredPermissions = this.filterInheritedPermissions(
        parentPermissions, 
        parentRole.inheritance_type, 
        parentRole.conditions
      );
      
      filteredPermissions.forEach(p => permissionsMap.set(p.id, p));

      // 재귀적으로 상위 부모들의 권한도 수집
      await this.collectInheritedPermissions(parentRole.parent_role_id, permissionsMap, visited);
    }
  }

  /**
   * 상속 타입에 따른 권한 필터링
   */
  private filterInheritedPermissions(
    permissions: Permission[], 
    inheritanceType: string, 
    conditions: any
  ): Permission[] {
    switch (inheritanceType) {
      case 'full':
        return permissions;
      
      case 'partial':
        // 조건에 따른 부분 상속
        return permissions.filter(p => this.evaluateInheritanceCondition(p, conditions));
      
      case 'conditional':
        // 복잡한 조건부 상속
        return permissions.filter(p => this.evaluateComplexInheritanceCondition(p, conditions));
      
      default:
        return permissions;
    }
  }

  /**
   * 권한과 요청이 매칭되는지 확인
   */
  private doesPermissionMatch(permission: Permission, check: PermissionCheck): boolean {
    // 리소스 타입 매칭
    if (permission.resource_type !== check.resource_type && permission.resource_type !== '*') {
      return false;
    }

    // 액션 매칭 (와일드카드 지원)
    if (permission.action !== check.action && permission.action !== '*') {
      // 패턴 매칭 지원 (예: "read:*", "manage:*")
      if (!this.matchesActionPattern(permission.action, check.action)) {
        return false;
      }
    }

    // 스코프 확인
    return this.isScopeValid(permission, check);
  }

  /**
   * 액션 패턴 매칭
   */
  private matchesActionPattern(permissionAction: string, requestedAction: string): boolean {
    if (permissionAction.endsWith('*')) {
      const prefix = permissionAction.slice(0, -1);
      return requestedAction.startsWith(prefix);
    }
    
    if (permissionAction.includes(':')) {
      const [category, action] = permissionAction.split(':');
      const [reqCategory, reqAction] = requestedAction.split(':');
      
      if (category !== reqCategory && category !== '*') {
        return false;
      }
      
      return action === reqAction || action === '*';
    }
    
    return false;
  }

  /**
   * 권한 스코프 유효성 확인
   */
  private isScopeValid(permission: Permission, check: PermissionCheck): boolean {
    switch (permission.scope) {
      case 'global':
        return true;
      
      case 'tenant':
        // 테넌트 스코프인 경우 리소스가 해당 테넌트에 속해야 함
        return this.isResourceInTenantScope(check);
      
      case 'workspace':
        // 워크스페이스 스코프인 경우 리소스가 해당 워크스페이스에 속해야 함
        return this.isResourceInWorkspaceScope(check);
      
      case 'resource':
        // 리소스 스코프인 경우 정확한 리소스 ID 매칭 필요
        return check.resource_id !== undefined;
      
      default:
        return false;
    }
  }

  /**
   * 권한 조건 평가
   */
  private async evaluatePermissionConditions(
    permissions: Permission[], 
    check: PermissionCheck
  ): Promise<Array<{ permission: Permission; allowed: boolean; reason: string }>> {
    const results = [];

    for (const permission of permissions) {
      if (!permission.conditions || permission.conditions.length === 0) {
        results.push({
          permission,
          allowed: true,
          reason: 'No conditions to evaluate'
        });
        continue;
      }

      let conditionsMet = true;
      let failureReason = '';

      for (const condition of permission.conditions) {
        const conditionResult = await this.evaluateSingleCondition(condition, check);
        if (!conditionResult.met) {
          conditionsMet = false;
          failureReason = conditionResult.reason;
          break;
        }
      }

      results.push({
        permission,
        allowed: conditionsMet,
        reason: conditionsMet ? 'All conditions met' : failureReason
      });
    }

    return results;
  }

  /**
   * 단일 조건 평가
   */
  private async evaluateSingleCondition(
    condition: any, 
    check: PermissionCheck
  ): Promise<{ met: boolean; reason: string }> {
    const contextValue = this.getContextValue(condition.field, check);
    
    switch (condition.operator) {
      case 'equals':
        return {
          met: contextValue === condition.value,
          reason: contextValue === condition.value ? 'Condition met' : `Expected ${condition.value}, got ${contextValue}`
        };
      
      case 'not_equals':
        return {
          met: contextValue !== condition.value,
          reason: contextValue !== condition.value ? 'Condition met' : `Value should not be ${condition.value}`
        };
      
      case 'in':
        const inResult = Array.isArray(condition.value) && condition.value.includes(contextValue);
        return {
          met: inResult,
          reason: inResult ? 'Value found in allowed list' : `Value ${contextValue} not in allowed list`
        };
      
      case 'contains':
        const containsResult = String(contextValue).includes(String(condition.value));
        return {
          met: containsResult,
          reason: containsResult ? 'Contains condition met' : `Value does not contain ${condition.value}`
        };
      
      case 'regex':
        try {
          const regex = new RegExp(condition.value);
          const regexResult = regex.test(String(contextValue));
          return {
            met: regexResult,
            reason: regexResult ? 'Regex pattern matched' : `Value does not match pattern ${condition.value}`
          };
        } catch (error) {
          return {
            met: false,
            reason: 'Invalid regex pattern'
          };
        }
      
      default:
        return {
          met: false,
          reason: `Unknown operator: ${condition.operator}`
        };
    }
  }

  /**
   * 컨텍스트에서 값 추출
   */
  private getContextValue(field: string, check: PermissionCheck): any {
    switch (field) {
      case 'user_id':
        return check.user_id;
      case 'resource_type':
        return check.resource_type;
      case 'resource_id':
        return check.resource_id;
      case 'action':
        return check.action;
      case 'ip_address':
        return check.context?.ip_address;
      case 'workspace_type':
        return check.context?.workspace_type;
      case 'tenant_status':
        return check.context?.tenant_status;
      default:
        return check.context?.additional_data?.[field];
    }
  }

  /**
   * 정책 엔진 평가
   */
  private async evaluatePolicies(
    check: PermissionCheck, 
    permissions: Permission[]
  ): Promise<{ allowed: boolean; reason: string }> {
    // 활성 정책들 조회
    const policies = await this.getActivePolicies(check.resource_type, check.action);
    
    if (policies.length === 0) {
      return { allowed: true, reason: 'No policies to evaluate' };
    }

    // 우선순위 순으로 정렬
    policies.sort((a, b) => b.priority - a.priority);

    for (const policy of policies) {
      const policyResult = await this.evaluatePolicy(policy, check, permissions);
      
      // DENY 정책이 매칭되면 즉시 거부
      if (policy.policy_type === 'deny' && policyResult.matches) {
        return { allowed: false, reason: `Denied by policy: ${policy.name}` };
      }
      
      // ALLOW 정책이 매칭되면 허용 (하지만 다른 DENY 정책도 확인해야 함)
      if (policy.policy_type === 'allow' && policyResult.matches) {
        // 계속해서 다른 정책들도 확인
        continue;
      }
    }

    return { allowed: true, reason: 'No denying policies matched' };
  }

  /**
   * 활성 정책 조회
   */
  private async getActivePolicies(resourceType: string, action: string): Promise<PermissionPolicy[]> {
    const result = await pool.query(`
      SELECT * FROM permission_policies
      WHERE is_active = true
        AND (
          actions @> $1::jsonb 
          OR actions @> '["*"]'::jsonb
        )
        AND (
          resources @> $2::jsonb
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(resources) AS resource
            WHERE resource->>'resource_type' = '*'
          )
        )
      ORDER BY priority DESC
    `, [JSON.stringify([action]), JSON.stringify([{ resource_type: resourceType }])]);

    return result.rows;
  }

  /**
   * 개별 정책 평가
   */
  private async evaluatePolicy(
    policy: PermissionPolicy, 
    check: PermissionCheck, 
    permissions: Permission[]
  ): Promise<{ matches: boolean; reason: string }> {
    // 정책 조건들을 모두 평가
    for (const condition of policy.conditions) {
      const conditionResult = await this.evaluateSingleCondition(condition, check);
      if (!conditionResult.met) {
        return { matches: false, reason: `Policy condition not met: ${conditionResult.reason}` };
      }
    }

    return { matches: true, reason: 'All policy conditions met' };
  }

  /**
   * 권한 확인 로그 기록
   */
  private async logPermissionCheck(
    check: PermissionCheck, 
    result: PermissionCheckResult, 
    startTime: number
  ): Promise<void> {
    try {
      const processingTime = Date.now() - startTime;
      
      await pool.query(`
        INSERT INTO permission_audit_logs 
        (user_id, action_type, resource_type, resource_id, requested_action, 
         result, reason, ip_address, user_agent, session_id, metadata)
        VALUES ($1, 'permission_check', $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        check.user_id,
        check.resource_type,
        check.resource_id,
        check.action,
        result.allowed ? 'granted' : 'denied',
        result.reason,
        check.context?.ip_address,
        check.context?.additional_data?.user_agent,
        check.context?.additional_data?.session_id,
        JSON.stringify({
          processing_time_ms: processingTime,
          matched_permissions_count: result.matched_permissions.length,
          denied_reasons: result.denied_reasons
        })
      ]);
    } catch (error) {
      logger.error('Failed to log permission check:', error);
    }
  }

  /**
   * 역할 생성
   */
  async createRole(request: CreateRoleRequest, createdBy: string): Promise<{
    success: boolean;
    data?: { roleId: string };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 역할 생성
      const roleResult = await client.query(`
        INSERT INTO roles (name, description, role_type, is_system_role, max_assignable_level, created_by)
        VALUES ($1, $2, $3, false, $4, $5)
        RETURNING id
      `, [
        request.name,
        request.description,
        request.role_type,
        request.max_assignable_level,
        createdBy
      ]);

      const roleId = roleResult.rows[0].id;

      // 권한 할당
      for (const permissionId of request.permissions) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id, is_active)
          VALUES ($1, $2, true)
        `, [roleId, permissionId]);
      }

      // 상속 관계 설정
      if (request.inherits_from) {
        for (const parentRoleId of request.inherits_from) {
          await client.query(`
            INSERT INTO role_hierarchy (parent_role_id, child_role_id, inheritance_type)
            VALUES ($1, $2, 'full')
          `, [parentRoleId, roleId]);
        }
      }

      await client.query('COMMIT');

      logger.info('Role created successfully', { roleId, name: request.name, createdBy });

      return { success: true, data: { roleId } };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 사용자에게 역할 할당
   */
  async assignRole(request: AssignRoleRequest, assignedBy: string): Promise<{
    success: boolean;
    data?: { assignmentId: string };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 기존 할당 확인 (중복 방지)
      const existingAssignment = await client.query(`
        SELECT id FROM user_role_assignments
        WHERE user_id = $1 AND role_id = $2 AND resource_type = $3 
          AND (resource_id = $4 OR (resource_id IS NULL AND $4 IS NULL))
          AND is_active = true
      `, [request.user_id, request.role_id, request.resource_type, request.resource_id]);

      if (existingAssignment.rows.length > 0) {
        return {
          success: false,
          error: 'Role already assigned to user for this resource'
        };
      }

      // 새 할당 생성
      const assignmentResult = await client.query(`
        INSERT INTO user_role_assignments 
        (user_id, role_id, resource_type, resource_id, assigned_by, expires_at, conditions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        request.user_id,
        request.role_id,
        request.resource_type,
        request.resource_id,
        assignedBy,
        request.expires_at,
        JSON.stringify(request.conditions || [])
      ]);

      const assignmentId = assignmentResult.rows[0].id;

      // 감사 로그 기록
      await client.query(`
        INSERT INTO permission_audit_logs 
        (user_id, action_type, resource_type, resource_id, result, reason, performed_by, metadata)
        VALUES ($1, 'role_assignment', $2, $3, 'granted', $4, $5, $6)
      `, [
        request.user_id,
        request.resource_type,
        request.resource_id,
        `Role ${request.role_id} assigned`,
        assignedBy,
        JSON.stringify({ assignment_id: assignmentId, role_id: request.role_id })
      ]);

      await client.query('COMMIT');

      logger.info('Role assigned successfully', { 
        assignmentId, 
        userId: request.user_id, 
        roleId: request.role_id,
        assignedBy 
      });

      return { success: true, data: { assignmentId } };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to assign role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * ECP 역할 매핑 생성
   */
  async createEcpRoleMapping(request: CreateEcpMappingRequest, createdBy: string): Promise<{
    success: boolean;
    data?: { mappingId: string };
    error?: string;
  }> {
    try {
      const result = await pool.query(`
        INSERT INTO ecp_role_mappings 
        (ecp_role_id, ecp_role_name, internal_role_id, tenant_id, workspace_id, 
         mapping_type, mapping_config, priority, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        request.ecp_role_id,
        request.ecp_role_name,
        request.internal_role_id,
        request.tenant_id,
        request.workspace_id,
        request.mapping_type,
        JSON.stringify(request.mapping_config),
        request.priority,
        createdBy
      ]);

      const mappingId = result.rows[0].id;

      logger.info('ECP role mapping created successfully', { 
        mappingId, 
        ecpRoleId: request.ecp_role_id,
        internalRoleId: request.internal_role_id,
        createdBy 
      });

      return { success: true, data: { mappingId } };

    } catch (error) {
      logger.error('Failed to create ECP role mapping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 사용자 권한 요약 조회
   */
  async getUserPermissionSummary(userId: string): Promise<{
    success: boolean;
    data?: UserPermissionSummary;
    error?: string;
  }> {
    try {
      // 사용자 기본 정보 조회
      const userResult = await pool.query(`
        SELECT id, username, email FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.rows[0];

      // 사용자의 모든 역할 할당 조회
      const rolesResult = await pool.query(`
        SELECT 
          ura.*,
          r.name as role_name, r.description as role_description, r.role_type,
          CASE 
            WHEN ura.resource_type = 'tenant' THEN t.tenant_key
            WHEN ura.resource_type = 'workspace' THEN w.name
            ELSE NULL
          END as resource_name
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        LEFT JOIN tenants t ON ura.resource_type = 'tenant' AND ura.resource_id = t.id
        LEFT JOIN workspaces w ON ura.resource_type = 'workspace' AND ura.resource_id = w.id
        WHERE ura.user_id = $1 AND ura.is_active = true
        ORDER BY ura.resource_type, ura.assigned_at DESC
      `, [userId]);

      // 효과적인 권한 계산
      const effectivePermissions = await this.getEffectivePermissions(rolesResult.rows);

      // 워크스페이스별 접근 권한 정리
      const workspaceAccess = await this.getWorkspaceAccess(userId);
      const tenantAccess = await this.getTenantAccess(userId);

      const summary: UserPermissionSummary = {
        user_id: userId,
        username: user.username,
        email: user.email,
        roles: rolesResult.rows.map(row => ({
          role: {
            id: row.role_id,
            name: row.role_name,
            description: row.role_description,
            role_type: row.role_type,
            is_system_role: false,
            permissions: [],
            max_assignable_level: 'workspace',
            created_at: row.created_at,
            updated_at: row.updated_at
          },
          assignment: row,
          resource_name: row.resource_name
        })),
        effective_permissions: effectivePermissions,
        workspace_access: workspaceAccess,
        tenant_access: tenantAccess
      };

      return { success: true, data: summary };

    } catch (error) {
      logger.error('Failed to get user permission summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 워크스페이스 접근 권한 조회
   */
  private async getWorkspaceAccess(userId: string): Promise<Array<{
    workspace_id: string;
    workspace_name: string;
    permissions: string[];
  }>> {
    const result = await pool.query(`
      SELECT DISTINCT
        w.id as workspace_id,
        w.name as workspace_name,
        array_agg(DISTINCT p.action) as permissions
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN workspaces w ON (
        (ura.resource_type = 'workspace' AND ura.resource_id = w.id)
        OR (ura.resource_type = 'tenant' AND w.tenant_id = ura.resource_id)
        OR ura.resource_type = 'system'
      )
      WHERE ura.user_id = $1 AND ura.is_active = true AND rp.is_active = true
      GROUP BY w.id, w.name
      ORDER BY w.name
    `, [userId]);

    return result.rows;
  }

  /**
   * 테넌트 접근 권한 조회
   */
  private async getTenantAccess(userId: string): Promise<Array<{
    tenant_id: string;
    tenant_name: string;
    permissions: string[];
  }>> {
    const result = await pool.query(`
      SELECT DISTINCT
        t.id as tenant_id,
        c.name as tenant_name,
        array_agg(DISTINCT p.action) as permissions
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN tenants t ON (
        (ura.resource_type = 'tenant' AND ura.resource_id = t.id)
        OR ura.resource_type = 'system'
      )
      JOIN companies c ON t.company_id = c.id
      WHERE ura.user_id = $1 AND ura.is_active = true AND rp.is_active = true
      GROUP BY t.id, c.name
      ORDER BY c.name
    `, [userId]);

    return result.rows;
  }

  // 헬퍼 메서드들
  private isResourceInTenantScope(check: PermissionCheck): boolean {
    // 실제 구현에서는 리소스가 특정 테넌트에 속하는지 확인
    return true; // 시뮬레이션
  }

  private isResourceInWorkspaceScope(check: PermissionCheck): boolean {
    // 실제 구현에서는 리소스가 특정 워크스페이스에 속하는지 확인
    return true; // 시뮬레이션
  }

  private evaluateInheritanceCondition(permission: Permission, conditions: any): boolean {
    // 상속 조건 평가 로직
    return true; // 시뮬레이션
  }

  private evaluateComplexInheritanceCondition(permission: Permission, conditions: any): boolean {
    // 복잡한 상속 조건 평가 로직
    return true; // 시뮬레이션
  }
}
