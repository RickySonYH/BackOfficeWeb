// [advice from AI] 테넌트 DB 연결 관리 서비스
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import { TenantDbConnection, DbConnectionTestResult } from '../types/database';
import crypto from 'crypto';

// [advice from AI] 테넌트 DB 연결 정보 인터페이스
interface TenantDbConnectionInfo {
  id: string;
  tenantId: string;
  dbType: 'postgres' | 'mongodb';
  connectionHost: string;
  connectionPort: number;
  databaseName: string;
  username: string;
  password: string; // 복호화된 비밀번호
}

// [advice from AI] 연결 풀 캐시
interface ConnectionPoolCache {
  [key: string]: Pool | MongoClient;
}

// [advice from AI] 테넌트 DB 서비스 클래스
export class TenantDbService {
  private connectionPools: ConnectionPoolCache = {};
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32ch';
    if (this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  // [advice from AI] 비밀번호 암호화
  private encryptPassword(password: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // [advice from AI] 비밀번호 복호화
  private decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }
    
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted || '', 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // [advice from AI] 테넌트 DB 연결 정보 등록
  async registerTenantDbConnection(connectionInfo: {
    tenantId: string;
    dbType: 'postgres' | 'mongodb';
    connectionHost: string;
    connectionPort: number;
    databaseName: string;
    username: string;
    password: string;
  }): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      logger.info(`Registering DB connection for tenant: ${connectionInfo.tenantId}`, {
        dbType: connectionInfo.dbType,
        host: connectionInfo.connectionHost,
        database: connectionInfo.databaseName
      });

      // [advice from AI] 비밀번호 암호화
      const encryptedPassword = this.encryptPassword(connectionInfo.password);

      // [advice from AI] DB에 연결 정보 저장
      const insertQuery = `
        INSERT INTO tenant_db_connections 
        (tenant_id, db_type, connection_host, connection_port, database_name, username, password_encrypted)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, db_type) 
        DO UPDATE SET
          connection_host = EXCLUDED.connection_host,
          connection_port = EXCLUDED.connection_port,
          database_name = EXCLUDED.database_name,
          username = EXCLUDED.username,
          password_encrypted = EXCLUDED.password_encrypted,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await pool.query(insertQuery, [
        connectionInfo.tenantId,
        connectionInfo.dbType,
        connectionInfo.connectionHost,
        connectionInfo.connectionPort,
        connectionInfo.databaseName,
        connectionInfo.username,
        encryptedPassword
      ]);

      const connectionId = result.rows[0].id;

      // [advice from AI] 연결 테스트 수행
      const testResult = await this.testConnection(connectionId);
      
      // [advice from AI] 연결 상태 업데이트
      await this.updateConnectionStatus(connectionId, testResult.success ? 'connected' : 'failed');

      logger.info(`DB connection registered successfully for tenant: ${connectionInfo.tenantId}`, {
        connectionId,
        testResult: testResult.success
      });

      return {
        success: true,
        connectionId
      };

    } catch (error) {
      logger.error(`Failed to register DB connection for tenant: ${connectionInfo.tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] 테넌트 DB 연결 정보 조회
  async getTenantDbConnections(tenantId: string): Promise<TenantDbConnection[]> {
    try {
      const query = `
        SELECT id, tenant_id, db_type, connection_host, connection_port, 
               database_name, username, password_encrypted, connection_status, 
               last_tested_at, created_at, updated_at
        FROM tenant_db_connections
        WHERE tenant_id = $1
        ORDER BY db_type, created_at
      `;

      const result = await pool.query(query, [tenantId]);
      
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        dbType: row.db_type,
        connectionHost: row.connection_host,
        connectionPort: row.connection_port,
        databaseName: row.database_name,
        username: row.username,
        passwordEncrypted: row.password_encrypted,
        connectionStatus: row.connection_status,
        lastTestedAt: row.last_tested_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      logger.error(`Failed to get DB connections for tenant: ${tenantId}:`, error);
      return [];
    }
  }

  // [advice from AI] 연결 테스트
  async testConnection(connectionId: string): Promise<DbConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // [advice from AI] 연결 정보 조회
      const connectionInfo = await this.getConnectionInfo(connectionId);
      if (!connectionInfo) {
        return {
          success: false,
          error: 'Connection info not found'
        };
      }

      let testResult: DbConnectionTestResult;

      if (connectionInfo.dbType === 'postgres') {
        testResult = await this.testPostgresConnection(connectionInfo);
      } else if (connectionInfo.dbType === 'mongodb') {
        testResult = await this.testMongoConnection(connectionInfo);
      } else {
        return {
          success: false,
          error: 'Unsupported database type'
        };
      }

      const responseTime = Date.now() - startTime;
      
      // [advice from AI] 연결 상태 및 테스트 시간 업데이트
      await this.updateConnectionStatus(
        connectionId, 
        testResult.success ? 'connected' : 'failed'
      );

      return {
        ...testResult,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Connection test failed for ${connectionId}:`, error);
      
      await this.updateConnectionStatus(connectionId, 'failed');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      };
    }
  }

  // [advice from AI] PostgreSQL 연결 테스트
  private async testPostgresConnection(connectionInfo: TenantDbConnectionInfo): Promise<DbConnectionTestResult> {
    let testClient: Pool | null = null;
    
    try {
      const poolConfig = {
        host: connectionInfo.connectionHost,
        port: connectionInfo.connectionPort,
        database: connectionInfo.databaseName,
        user: connectionInfo.username,
        password: connectionInfo.password,
        max: 1, // 테스트용이므로 최소 연결
        connectionTimeoutMillis: parseInt(process.env.TENANT_DB_CONNECTION_TIMEOUT || '10') * 1000
      };

      testClient = new Pool(poolConfig);
      
      // [advice from AI] 간단한 쿼리로 연결 테스트
      const result = await testClient.query('SELECT NOW() as current_time, version() as version');
      
      return {
        success: true,
        details: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version,
          dbType: 'postgres'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PostgreSQL connection failed'
      };
    } finally {
      if (testClient) {
        await testClient.end();
      }
    }
  }

  // [advice from AI] MongoDB 연결 테스트
  private async testMongoConnection(connectionInfo: TenantDbConnectionInfo): Promise<DbConnectionTestResult> {
    let testClient: MongoClient | null = null;
    
    try {
      const connectionString = `mongodb://${connectionInfo.username}:${connectionInfo.password}@${connectionInfo.connectionHost}:${connectionInfo.connectionPort}/${connectionInfo.databaseName}`;
      
      testClient = new MongoClient(connectionString, {
        serverSelectionTimeoutMS: parseInt(process.env.TENANT_DB_CONNECTION_TIMEOUT || '10') * 1000
      });

      await testClient.connect();
      
      // [advice from AI] 간단한 ping으로 연결 테스트
      const adminDb = testClient.db().admin();
      const result = await adminDb.ping();
      
      return {
        success: true,
        details: {
          ping: result,
          dbType: 'mongodb'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MongoDB connection failed'
      };
    } finally {
      if (testClient) {
        await testClient.close();
      }
    }
  }

  // [advice from AI] 연결 정보 조회 (복호화된 비밀번호 포함)
  private async getConnectionInfo(connectionId: string): Promise<TenantDbConnectionInfo | null> {
    try {
      const query = `
        SELECT id, tenant_id, db_type, connection_host, connection_port, 
               database_name, username, password_encrypted
        FROM tenant_db_connections
        WHERE id = $1
      `;

      const result = await pool.query(query, [connectionId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      return {
        id: row.id,
        tenantId: row.tenant_id,
        dbType: row.db_type,
        connectionHost: row.connection_host,
        connectionPort: row.connection_port,
        databaseName: row.database_name,
        username: row.username,
        password: this.decryptPassword(row.password_encrypted)
      };

    } catch (error) {
      logger.error(`Failed to get connection info for ${connectionId}:`, error);
      return null;
    }
  }

  // [advice from AI] 연결 상태 업데이트
  private async updateConnectionStatus(connectionId: string, status: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE tenant_db_connections 
        SET connection_status = $1, last_tested_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await pool.query(updateQuery, [status, connectionId]);
    } catch (error) {
      logger.error(`Failed to update connection status for ${connectionId}:`, error);
    }
  }

  // [advice from AI] 연결 풀 정리
  async cleanup(): Promise<void> {
    logger.info('Cleaning up tenant database connection pools');
    
    for (const [key, connection] of Object.entries(this.connectionPools)) {
      try {
        if (connection instanceof Pool) {
          await connection.end();
        } else if (connection instanceof MongoClient) {
          await connection.close();
        }
        delete this.connectionPools[key];
      } catch (error) {
        logger.error(`Failed to close connection pool ${key}:`, error);
      }
    }
  }
}

// [advice from AI] 싱글톤 테넌트 DB 서비스 인스턴스
export const tenantDbService = new TenantDbService();
