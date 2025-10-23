// backend/src/services/tenant.service.ts

import { pool } from '../config/database';
import { logger } from '../config/logger';
import { kubernetesService } from './kubernetes.service';
import { 
  Tenant, 
  TenantWithCompany, 
  CreateTenantRequest, 
  TenantDbConnection,
  CreateTenantDbConnectionRequest,
  DbConnectionTestResult 
} from '../types/tenant';
import crypto from 'crypto';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

class TenantService {
  
  // [advice from AI] 테넌트 키 자동 생성
  generateTenantKey(companyName: string): string {
    const cleanCompanyName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    
    return `${cleanCompanyName}-${date}-${randomSuffix}`;
  }

  // [advice from AI] Kubernetes namespace 이름 생성
  generateNamespace(tenantKey: string): string {
    return `tenant-${tenantKey}`;
  }

  // [advice from AI] 테넌트 목록 조회 (회사별 필터링 지원)
  async getTenants(page: number = 1, limit: number = 10, companyId?: string): Promise<{ tenants: TenantWithCompany[], total: number }> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          t.id, t.company_id, t.tenant_key, t.kubernetes_namespace, 
          t.deployment_status, t.created_at, t.updated_at,
          c.name as company_name, c.business_number as company_business_number
        FROM tenants t
        JOIN companies c ON t.company_id = c.id
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total
        FROM tenants t
        JOIN companies c ON t.company_id = c.id
      `;
      
      const queryParams: any[] = [];
      const countParams: any[] = [];
      
      if (companyId) {
        query += ' WHERE t.company_id = $1';
        countQuery += ' WHERE t.company_id = $1';
        queryParams.push(companyId);
        countParams.push(companyId);
      }
      
      query += ' ORDER BY t.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
      queryParams.push(limit, offset);
      
      const [tenantsResult, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, countParams)
      ]);
      
      return {
        tenants: tenantsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } finally {
      client.release();
    }
  }

  // [advice from AI] 테넌트 생성
  async createTenant(data: CreateTenantRequest): Promise<TenantWithCompany> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 회사 정보 조회
      const companyResult = await client.query(
        'SELECT id, name, business_number FROM companies WHERE id = $1',
        [data.company_id]
      );
      
      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }
      
      const company = companyResult.rows[0];
      
      // 테넌트 키 및 네임스페이스 생성
      const tenantKey = data.tenant_key || this.generateTenantKey(company.name);
      const namespace = data.kubernetes_namespace || this.generateNamespace(tenantKey);
      
      // 테넌트 키 중복 체크
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE tenant_key = $1',
        [tenantKey]
      );
      
      if (existingTenant.rows.length > 0) {
        throw new Error('Tenant key already exists');
      }
      
      // 테넌트 생성
      const tenantResult = await client.query(`
        INSERT INTO tenants (company_id, tenant_key, kubernetes_namespace, deployment_status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, company_id, tenant_key, kubernetes_namespace, deployment_status, created_at, updated_at
      `, [data.company_id, tenantKey, namespace, 'pending']);
      
      const tenant = tenantResult.rows[0];
      
      await client.query('COMMIT');
      
      // Kubernetes namespace 생성 (비동기)
      this.createKubernetesNamespace(tenant.id, namespace)
        .then(() => {
          logger.info(`Kubernetes namespace created for tenant: ${tenant.id}`);
        })
        .catch((error) => {
          logger.error(`Failed to create Kubernetes namespace for tenant ${tenant.id}:`, error);
        });
      
      return {
        ...tenant,
        company_name: company.name,
        company_business_number: company.business_number
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] Kubernetes namespace 생성 및 배포 상태 업데이트
  private async createKubernetesNamespace(tenantId: string, namespace: string): Promise<void> {
    const client = await pool.connect();
    try {
      // 배포 상태를 'deploying'으로 업데이트
      await client.query(
        'UPDATE tenants SET deployment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['deploying', tenantId]
      );
      
      // Kubernetes namespace 생성
      const success = await kubernetesService.createNamespace(namespace);
      
      if (success) {
        // 네임스페이스 생성 성공
        await client.query(
          'UPDATE tenants SET deployment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['active', tenantId]
        );
        logger.info(`Kubernetes namespace '${namespace}' created successfully for tenant ${tenantId}`);
      } else {
        // 네임스페이스 생성 실패
        await client.query(
          'UPDATE tenants SET deployment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['failed', tenantId]
        );
        logger.error(`Failed to create Kubernetes namespace '${namespace}' for tenant ${tenantId}`);
      }
    } catch (error) {
      // 오류 발생 시 상태를 'failed'로 업데이트
      await client.query(
        'UPDATE tenants SET deployment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', tenantId]
      );
      logger.error(`Error creating Kubernetes namespace for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 테넌트 상세 정보 조회
  async getTenantById(id: string): Promise<TenantWithCompany | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          t.id, t.company_id, t.tenant_key, t.kubernetes_namespace, 
          t.deployment_status, t.created_at, t.updated_at,
          c.name as company_name, c.business_number as company_business_number
        FROM tenants t
        JOIN companies c ON t.company_id = c.id
        WHERE t.id = $1
      `, [id]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 테넌트 DB 연결 정보 조회
  async getTenantDbConnections(tenantId: string): Promise<TenantDbConnection[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM tenant_db_connections WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 테넌트 DB 연결 정보 등록
  async createTenantDbConnection(tenantId: string, data: CreateTenantDbConnectionRequest): Promise<TenantDbConnection> {
    const client = await pool.connect();
    try {
      // 비밀번호 암호화
      const encryptedPassword = this.encryptPassword(data.password);
      
      const result = await client.query(`
        INSERT INTO tenant_db_connections 
        (tenant_id, connection_type, host, port, database_name, username, password_encrypted, connection_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tenantId,
        data.connection_type,
        data.host,
        data.port,
        data.database_name,
        data.username,
        encryptedPassword,
        'pending'
      ]);
      
      const connection = result.rows[0];
      
      // 연결 테스트 (비동기)
      this.testDatabaseConnection(connection.id, data)
        .then(() => {
          logger.info(`Database connection test completed for connection: ${connection.id}`);
        })
        .catch((error) => {
          logger.error(`Database connection test failed for connection ${connection.id}:`, error);
        });
      
      return connection;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 데이터베이스 연결 테스트
  async testDatabaseConnection(connectionId: string, connectionData: CreateTenantDbConnectionRequest): Promise<DbConnectionTestResult> {
    const client = await pool.connect();
    const startTime = Date.now();
    
    try {
      let testResult: DbConnectionTestResult;
      
      if (connectionData.connection_type === 'postgresql') {
        testResult = await this.testPostgreSQLConnection(connectionData);
      } else if (connectionData.connection_type === 'mongodb') {
        testResult = await this.testMongoDBConnection(connectionData);
      } else {
        throw new Error('Unsupported connection type');
      }
      
      const connectionTime = Date.now() - startTime;
      testResult.connection_time = connectionTime;
      
      // 연결 테스트 결과 업데이트
      await client.query(`
        UPDATE tenant_db_connections 
        SET connection_status = $1, last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [testResult.success ? 'connected' : 'failed', connectionId]);
      
      return testResult;
    } catch (error) {
      // 연결 실패 상태 업데이트
      await client.query(`
        UPDATE tenant_db_connections 
        SET connection_status = $1, last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, ['failed', connectionId]);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        connection_time: Date.now() - startTime
      };
    } finally {
      client.release();
    }
  }

  // [advice from AI] PostgreSQL 연결 테스트
  private async testPostgreSQLConnection(data: CreateTenantDbConnectionRequest): Promise<DbConnectionTestResult> {
    const client = new Client({
      host: data.host,
      port: data.port,
      database: data.database_name,
      user: data.username,
      password: data.password,
      connectionTimeoutMillis: 5000
    });
    
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      return {
        success: true,
        message: 'PostgreSQL connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // [advice from AI] MongoDB 연결 테스트
  private async testMongoDBConnection(data: CreateTenantDbConnectionRequest): Promise<DbConnectionTestResult> {
    const uri = `mongodb://${data.username}:${data.password}@${data.host}:${data.port}/${data.database_name}`;
    
    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      
      return {
        success: true,
        message: 'MongoDB connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // [advice from AI] 비밀번호 암호화
  private encryptPassword(password: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.DB_ENCRYPTION_KEY || 'default-key').digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // [advice from AI] 비밀번호 복호화
  private decryptPassword(encryptedPassword: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.DB_ENCRYPTION_KEY || 'default-key').digest();
    
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0] || '', 'hex');
    const encrypted = parts[1] || '';
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * 테넌트 배포 상태 업데이트
   */
  async updateTenantDeploymentStatus(tenantId: string, status: 'active' | 'inactive' | 'pending' | 'failed'): Promise<void> {
    const query = `
      UPDATE tenants 
      SET deployment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await pool.query(query, [status, tenantId]);
    logger.info(`Updated tenant ${tenantId} deployment status to ${status}`);
  }
}

export const tenantService = new TenantService();
