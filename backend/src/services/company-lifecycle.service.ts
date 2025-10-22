// [advice from AI] 회사 생명주기 관리 서비스 - 원자적 생성 프로세스
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { KubernetesService } from './kubernetes.service';
import { 
  CreateCompanyRequest,
  CreateCompanyWithSetupRequest, 
  CompleteCompanyResponse, 
  CompanyCreationResult,
  CompanyDeletionOptions,
  CompanyDeletionResult,
  WorkspaceTemplate,
  KMSWorkspaceConfig,
  AdvisorWorkspaceConfig,
  DeployedSolution,
  TenantSolutionMapping
} from '../types/company-lifecycle';
import { Company, Tenant, Workspace, User } from '../types/database';

export class CompanyLifecycleService {
  private kubernetesService: KubernetesService;

  constructor() {
    this.kubernetesService = new KubernetesService();
  }

  /**
   * 원자적 회사 생성 프로세스
   * 회사 -> 테넌트 -> 워크스페이스 -> 관리자 계정을 한 번에 생성
   */
  async createCompleteCompany(data: CreateCompanyWithSetupRequest): Promise<CompleteCompanyResponse> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('Starting complete company creation process', {
        companyName: data.name,
        businessNumber: data.businessNumber,
        adminEmail: data.adminEmail
      });

      // 1. 회사 생성
      const company = await this.createCompanyInTransaction(client, data);
      logger.info('Company created successfully', { companyId: company.id });

      // 2. 기본 테넌트 자동 생성
      const tenant = await this.createDefaultTenantInTransaction(client, company);
      logger.info('Default tenant created successfully', { tenantId: tenant.id });

      // 3. Kubernetes 네임스페이스 생성
      const kubernetesResult = await this.kubernetesService.createNamespace(tenant.tenant_key);
      if (!kubernetesResult.success) {
        throw new Error(`Failed to create Kubernetes namespace: ${kubernetesResult.error}`);
      }
      logger.info('Kubernetes namespace created successfully', { 
        namespace: kubernetesResult.namespaceName 
      });

      // 4. 기본 워크스페이스 생성
      const workspaces = await this.createDefaultWorkspacesInTransaction(client, tenant, data.defaultWorkspaces);
      logger.info('Default workspaces created successfully', { 
        workspaceCount: workspaces.length 
      });

      // 5. 기본 관리자 계정 생성
      const adminUser = await this.createDefaultAdminInTransaction(client, tenant, {
        email: data.adminEmail,
        username: data.adminUsername
      });
      logger.info('Default admin user created successfully', { userId: adminUser.id });

      // 6. 솔루션 할당 (선택사항)
      let solutionMapping: TenantSolutionMapping | null = null;
      if (data.solutionAssignment?.autoAssign) {
        solutionMapping = await this.assignTenantToOptimalSolution(tenant.id, data.solutionAssignment);
        if (solutionMapping) {
          logger.info('Tenant assigned to solution successfully', { 
            tenantId: tenant.id,
            solutionMappingId: solutionMapping.id 
          });
        }
      }

      // 7. 데이터 초기화 작업 스케줄링
      await this.scheduleDataInitialization(tenant.id, workspaces);

      await client.query('COMMIT');
      
      logger.info('Complete company creation process finished successfully', {
        companyId: company.id,
        tenantId: tenant.id,
        workspaceIds: workspaces.map(w => w.id),
        adminUserId: adminUser.id,
        solutionMappingId: solutionMapping?.id
      });

      return {
        company,
        tenant,
        workspaces,
        adminUser,
        kubernetesNamespace: kubernetesResult.namespaceName || tenant.kubernetes_namespace,
        solutionMapping: solutionMapping || undefined
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Complete company creation process failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyName: data.name
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 트랜잭션 내에서 회사 생성
   */
  private async createCompanyInTransaction(client: any, data: CreateCompanyRequest): Promise<Company> {
    // 사업자번호 중복 체크
    const duplicateCheck = await client.query(
      'SELECT id FROM companies WHERE business_number = $1',
      [data.businessNumber]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error('Business number already exists');
    }

    // 회사 생성
    const result = await client.query(`
      INSERT INTO companies (name, business_number, contract_date, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, business_number, contract_date, status, created_at, updated_at
    `, [
      data.name,
      data.businessNumber,
      data.contractDate,
      data.status || 'active'
    ]);

    return result.rows[0];
  }

  /**
   * 트랜잭션 내에서 기본 테넌트 생성
   */
  private async createDefaultTenantInTransaction(client: any, company: Company): Promise<Tenant> {
    const tenantKey = this.generateTenantKey(company.name);
    const namespace = this.generateNamespace(tenantKey);

    // 테넌트 키 중복 체크
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE tenant_key = $1',
      [tenantKey]
    );

    if (existingTenant.rows.length > 0) {
      throw new Error('Generated tenant key already exists');
    }

    const result = await client.query(`
      INSERT INTO tenants (company_id, tenant_key, kubernetes_namespace, deployment_status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, company_id, tenant_key, kubernetes_namespace, deployment_status, created_at, updated_at
    `, [company.id, tenantKey, namespace, 'pending']);

    return result.rows[0];
  }

  /**
   * 트랜잭션 내에서 기본 워크스페이스들 생성
   */
  private async createDefaultWorkspacesInTransaction(
    client: any, 
    tenant: Tenant, 
    options?: CreateCompanyWithSetupRequest['defaultWorkspaces']
  ): Promise<Workspace[]> {
    const workspaces: Workspace[] = [];
    
    // 기본 설정
    const defaultOptions = {
      createKMS: true,
      createAdvisor: true,
      ...options
    };

    // 워크스페이스 템플릿 조회
    const templates = await this.getWorkspaceTemplates();
    const kmsTemplate = templates.find(t => t.type === 'KMS');
    const advisorTemplate = templates.find(t => t.type === 'ADVISOR');

    // KMS 워크스페이스 생성
    if (defaultOptions.createKMS && kmsTemplate) {
      const kmsConfig = options?.kmsConfig || kmsTemplate.default_config;
      
      const kmsWorkspace = await client.query(`
        INSERT INTO workspaces (tenant_id, name, type, config_data, status, is_default, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, name, type, config_data, status, is_default, priority, created_at, updated_at
      `, [
        tenant.id,
        'Default KMS',
        'KMS',
        JSON.stringify(kmsConfig),
        'active',
        true,
        1
      ]);
      
      workspaces.push(kmsWorkspace.rows[0]);
      
      // 기본 워크스페이스 설정 저장
      await this.saveWorkspaceConfiguration(client, kmsWorkspace.rows[0].id, kmsConfig, 'KMS');
    }

    // Advisor 워크스페이스 생성
    if (defaultOptions.createAdvisor && advisorTemplate) {
      const advisorConfig = options?.advisorConfig || advisorTemplate.default_config;
      
      const advisorWorkspace = await client.query(`
        INSERT INTO workspaces (tenant_id, name, type, config_data, status, is_default, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, name, type, config_data, status, is_default, priority, created_at, updated_at
      `, [
        tenant.id,
        'Default Advisor',
        'ADVISOR',
        JSON.stringify(advisorConfig),
        'active',
        false,
        2
      ]);
      
      workspaces.push(advisorWorkspace.rows[0]);
      
      // 기본 워크스페이스 설정 저장
      await this.saveWorkspaceConfiguration(client, advisorWorkspace.rows[0].id, advisorConfig, 'ADVISOR');
    }

    return workspaces;
  }

  /**
   * 워크스페이스 설정을 구조화된 형태로 저장
   */
  private async saveWorkspaceConfiguration(
    client: any, 
    workspaceId: string, 
    config: any, 
    workspaceType: string
  ): Promise<void> {
    const configCategories = workspaceType === 'KMS' 
      ? ['vector_db_config', 'search_config', 'data_processing', 'ui_settings']
      : ['response_templates', 'escalation_rules', 'sentiment_analysis', 'conversation_config', 'auto_response_settings', 'ui_settings'];

    for (const category of configCategories) {
      if (config[category]) {
        for (const [key, value] of Object.entries(config[category])) {
          await client.query(`
            INSERT INTO workspace_configurations 
            (workspace_id, config_category, config_key, config_value, environment, version, is_active, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            workspaceId,
            category,
            key,
            JSON.stringify(value),
            'production',
            1,
            true,
            null // 시스템 생성
          ]);
        }
      }
    }
  }

  /**
   * 트랜잭션 내에서 기본 관리자 계정 생성
   */
  private async createDefaultAdminInTransaction(
    client: any, 
    tenant: Tenant, 
    adminData: { email: string; username: string }
  ): Promise<User> {
    const bcrypt = require('bcryptjs');
    
    // 기본 비밀번호 생성 (실제로는 이메일로 임시 비밀번호 발송)
    const tempPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 사용자명/이메일 중복 체크
    const duplicateCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [adminData.email, adminData.username]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error('Admin email or username already exists');
    }

    const result = await client.query(`
      INSERT INTO users (tenant_id, username, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, username, email, role, is_active, created_at, updated_at
    `, [
      tenant.id,
      adminData.username,
      adminData.email,
      hashedPassword,
      'admin',
      true
    ]);

    // TODO: 임시 비밀번호를 이메일로 발송
    logger.info('Temporary password generated for admin user', {
      userId: result.rows[0].id,
      email: adminData.email,
      tempPassword // 실제로는 로그에 기록하면 안됨
    });

    return result.rows[0];
  }

  /**
   * 데이터 초기화 작업 스케줄링
   */
  private async scheduleDataInitialization(tenantId: string, workspaces: Workspace[]): Promise<void> {
    // 비동기로 데이터 초기화 작업 스케줄링
    setImmediate(async () => {
      try {
        for (const workspace of workspaces) {
          logger.info('Scheduling data initialization for workspace', {
            workspaceId: workspace.id,
            workspaceType: workspace.type
          });
          
          // TODO: 데이터 초기화 서비스 호출
          // await this.dataInitService.initializeWorkspace(workspace.id);
        }
      } catch (error) {
        logger.error('Failed to schedule data initialization', {
          tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * 워크스페이스 템플릿 조회
   */
  private async getWorkspaceTemplates(): Promise<WorkspaceTemplate[]> {
    const result = await pool.query(`
      SELECT id, name, type, default_config, is_system_default, description, created_at, updated_at
      FROM workspace_templates
      WHERE is_system_default = true
      ORDER BY type, name
    `);
    
    return result.rows;
  }

  /**
   * 최적 솔루션 찾기 및 할당
   */
  private async assignTenantToOptimalSolution(
    tenantId: string, 
    requirements?: CreateCompanyWithSetupRequest['solutionAssignment']
  ): Promise<TenantSolutionMapping | null> {
    if (!requirements?.autoAssign) {
      return null;
    }

    try {
      // 사용 가능한 솔루션 조회
      let solutionQuery = `
        SELECT id, solution_name, max_tenants, current_tenants, 
               max_cpu_cores, max_memory_gb, current_cpu_usage, current_memory_usage,
               hardware_spec, status
        FROM deployed_solutions 
        WHERE status = 'active' AND current_tenants < max_tenants
      `;
      
      const params: any[] = [];
      
      if (requirements.preferredSolutionId) {
        solutionQuery += ` AND id = $1`;
        params.push(requirements.preferredSolutionId);
      }
      
      solutionQuery += ` ORDER BY 
        (current_tenants::float / max_tenants) ASC,
        (current_cpu_usage / max_cpu_cores) ASC,
        (current_memory_usage / max_memory_gb) ASC
        LIMIT 1
      `;

      const solutionResult = await pool.query(solutionQuery, params);
      
      if (solutionResult.rows.length === 0) {
        logger.warn('No available solution found for tenant assignment', { tenantId });
        return null;
      }

      const solution = solutionResult.rows[0];
      const resourceReq = requirements.resourceRequirements || {
        cpu_cores: 0.5,
        memory_gb: 1.0,
        storage_gb: 10.0
      };

      // 테넌트-솔루션 매핑 생성
      const mappingResult = await pool.query(`
        INSERT INTO tenant_solution_mappings 
        (tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb, allocated_storage_gb, status, priority, assigned_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, solution_id, allocated_cpu_cores, allocated_memory_gb, 
                  allocated_storage_gb, status, priority, assigned_at, assigned_by
      `, [
        tenantId,
        solution.id,
        resourceReq.cpu_cores,
        resourceReq.memory_gb,
        resourceReq.storage_gb,
        'assigned',
        0,
        null // 시스템 자동 할당
      ]);

      // 솔루션의 현재 테넌트 수 업데이트
      await pool.query(`
        UPDATE deployed_solutions 
        SET current_tenants = current_tenants + 1,
            current_cpu_usage = current_cpu_usage + $1,
            current_memory_usage = current_memory_usage + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [resourceReq.cpu_cores, resourceReq.memory_gb, solution.id]);

      logger.info('Tenant assigned to solution successfully', {
        tenantId,
        solutionId: solution.id,
        solutionName: solution.solution_name,
        allocatedResources: resourceReq
      });

      return mappingResult.rows[0];

    } catch (error) {
      logger.error('Failed to assign tenant to solution', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * 테넌트 키 생성
   */
  private generateTenantKey(companyName: string): string {
    const sanitized = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${sanitized}-${timestamp}`;
  }

  /**
   * Kubernetes 네임스페이스 이름 생성
   */
  private generateNamespace(tenantKey: string): string {
    return `tenant-${tenantKey}`;
  }

  /**
   * 임시 비밀번호 생성
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * 회사 삭제 (모든 관련 리소스 정리)
   */
  async deleteCompanyCompletely(companyId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 테넌트 조회
      const tenants = await client.query(
        'SELECT id, tenant_key, kubernetes_namespace FROM tenants WHERE company_id = $1',
        [companyId]
      );

      // 2. Kubernetes 리소스 정리
      for (const tenant of tenants.rows) {
        try {
          await this.kubernetesService.deleteNamespace(tenant.kubernetes_namespace);
        } catch (error) {
          logger.warn('Failed to delete Kubernetes namespace', {
            namespace: tenant.kubernetes_namespace,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // 3. 데이터베이스 정리 (CASCADE로 자동 정리됨)
      await client.query('DELETE FROM companies WHERE id = $1', [companyId]);

      await client.query('COMMIT');
      
      logger.info('Company completely deleted', { companyId });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete company completely', {
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
