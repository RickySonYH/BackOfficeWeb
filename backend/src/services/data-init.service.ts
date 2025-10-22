import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import * as XLSX from 'xlsx';
import * as csv from 'csv-parser';
import * as pdf from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';

// [advice from AI] 테넌트 데이터 초기화를 위한 종합 서비스
// PostgreSQL 스키마 생성, MongoDB 컬렉션 생성, 워크스페이스 데이터 시딩, 설정 적용 기능 제공

export interface DatabaseConnection {
  id: string;
  tenant_id: string;
  connection_type: 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string;
  connection_status: 'connected' | 'disconnected' | 'error';
}

export interface InitializationLog {
  id: string;
  tenant_id: string;
  operation_type: 'database_init' | 'data_seed' | 'config_apply';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  details?: any;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface FileParseResult {
  filename: string;
  file_type: 'csv' | 'json' | 'xlsx' | 'pdf' | 'txt';
  total_records: number;
  parsed_records: number;
  failed_records: number;
  errors: string[];
  data: any[];
}

export class DataInitializationService {
  private logs: InitializationLog[] = [];
  private dbConnections: DatabaseConnection[] = [];

  constructor() {
    // 시뮬레이션용 DB 연결 정보 초기화
    this.initializeTestConnections();
  }

  /**
   * 테스트용 DB 연결 정보 초기화
   */
  private initializeTestConnections() {
    this.dbConnections = [
      {
        id: '1',
        tenant_id: '1',
        connection_type: 'postgresql',
        host: 'postgres.aicc-solutions.local',
        port: 5432,
        database_name: 'aicc_prod',
        username: 'aicc_user',
        password_encrypted: 'encrypted_password_1',
        connection_status: 'connected'
      },
      {
        id: '2',
        tenant_id: '1',
        connection_type: 'mongodb',
        host: 'mongo.aicc-solutions.local',
        port: 27017,
        database_name: 'aicc_logs',
        username: 'mongo_user',
        password_encrypted: 'encrypted_password_2',
        connection_status: 'connected'
      },
      {
        id: '3',
        tenant_id: '2',
        connection_type: 'postgresql',
        host: 'postgres.globaltech.local',
        port: 5432,
        database_name: 'globaltech_db',
        username: 'gt_user',
        password_encrypted: 'encrypted_password_3',
        connection_status: 'connected'
      }
    ];
  }

  /**
   * 로그 생성
   */
  private createLog(
    tenantId: string,
    operationType: 'database_init' | 'data_seed' | 'config_apply',
    message: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending',
    details?: any,
    errorMessage?: string
  ): InitializationLog {
    const log: InitializationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      operation_type: operationType,
      status,
      message,
      details,
      started_at: new Date().toISOString(),
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
      error_message: errorMessage
    };
    
    this.logs.push(log);
    return log;
  }

  /**
   * 로그 업데이트
   */
  private updateLog(logId: string, updates: Partial<InitializationLog>) {
    const logIndex = this.logs.findIndex(log => log.id === logId);
    if (logIndex !== -1) {
      this.logs[logIndex] = {
        ...this.logs[logIndex],
        ...updates,
        completed_at: updates.status === 'completed' || updates.status === 'failed' 
          ? new Date().toISOString() 
          : this.logs[logIndex].completed_at
      };
    }
  }

  /**
   * 1. 테넌트 데이터베이스 초기화
   */
  async initializeTenantDatabase(tenantId: string): Promise<{
    success: boolean;
    initialized_databases: string[];
    logs: InitializationLog[];
    error?: string;
  }> {
    const log = this.createLog(tenantId, 'database_init', '테넌트 데이터베이스 초기화 시작', 'in_progress');
    
    try {
      const connections = this.dbConnections.filter(conn => conn.tenant_id === tenantId);
      const initializedDatabases: string[] = [];

      if (connections.length === 0) {
        throw new Error('테넌트의 데이터베이스 연결 정보를 찾을 수 없습니다.');
      }

      // PostgreSQL 초기화
      const pgConnection = connections.find(conn => conn.connection_type === 'postgresql');
      if (pgConnection) {
        await this.initializePostgreSQL(tenantId, pgConnection);
        initializedDatabases.push('postgresql');
      }

      // MongoDB 초기화
      const mongoConnection = connections.find(conn => conn.connection_type === 'mongodb');
      if (mongoConnection) {
        await this.initializeMongoDB(tenantId, mongoConnection);
        initializedDatabases.push('mongodb');
      }

      this.updateLog(log.id, {
        status: 'completed',
        message: '테넌트 데이터베이스 초기화 완료',
        details: { initialized_databases: initializedDatabases }
      });

      return {
        success: true,
        initialized_databases: initializedDatabases,
        logs: this.logs.filter(l => l.tenant_id === tenantId)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.updateLog(log.id, {
        status: 'failed',
        message: '테넌트 데이터베이스 초기화 실패',
        error_message: errorMessage
      });

      return {
        success: false,
        initialized_databases: [],
        logs: this.logs.filter(l => l.tenant_id === tenantId),
        error: errorMessage
      };
    }
  }

  /**
   * PostgreSQL 스키마 초기화
   */
  private async initializePostgreSQL(tenantId: string, connection: DatabaseConnection): Promise<void> {
    const log = this.createLog(tenantId, 'database_init', 'PostgreSQL 스키마 생성 시작', 'in_progress');

    try {
      // 실제 환경에서는 실제 DB 연결 및 스키마 생성
      // 여기서는 시뮬레이션
      await this.simulateAsyncOperation(2000); // 2초 시뮬레이션

      const schemas = {
        call_history: `
          CREATE TABLE IF NOT EXISTS call_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL,
            customer_id VARCHAR(255),
            agent_id VARCHAR(255),
            call_start TIMESTAMP,
            call_end TIMESTAMP,
            call_duration INTEGER,
            transcript TEXT,
            sentiment VARCHAR(50),
            resolution_status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        call_scripts: `
          CREATE TABLE IF NOT EXISTS call_scripts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL,
            workspace_id VARCHAR(255),
            script_name VARCHAR(255),
            script_content TEXT,
            category VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        knowledge_base: `
          CREATE TABLE IF NOT EXISTS knowledge_base (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL,
            workspace_id VARCHAR(255),
            title VARCHAR(500),
            content TEXT,
            category VARCHAR(255),
            tags TEXT[],
            embedding_vector FLOAT8[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      };

      this.updateLog(log.id, {
        status: 'completed',
        message: 'PostgreSQL 스키마 생성 완료',
        details: { 
          connection: `${connection.host}:${connection.port}/${connection.database_name}`,
          schemas: Object.keys(schemas)
        }
      });

      console.log(`PostgreSQL schemas created for tenant ${tenantId}:`, Object.keys(schemas));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.updateLog(log.id, {
        status: 'failed',
        message: 'PostgreSQL 스키마 생성 실패',
        error_message: errorMessage
      });
      throw error;
    }
  }

  /**
   * MongoDB 컬렉션 초기화
   */
  private async initializeMongoDB(tenantId: string, connection: DatabaseConnection): Promise<void> {
    const log = this.createLog(tenantId, 'database_init', 'MongoDB 컬렉션 생성 시작', 'in_progress');

    try {
      // 실제 환경에서는 실제 DB 연결 및 컬렉션 생성
      // 여기서는 시뮬레이션
      await this.simulateAsyncOperation(1500); // 1.5초 시뮬레이션

      const collections = [
        'kms_documents',
        'kms_categories', 
        'advisor_templates'
      ];

      // 인덱스 생성 시뮬레이션
      const indexes = {
        kms_documents: [
          { tenant_id: 1, workspace_id: 1 },
          { title: 'text', content: 'text' },
          { 'metadata.upload_date': -1 }
        ],
        kms_categories: [
          { tenant_id: 1, workspace_id: 1 },
          { order: 1 }
        ],
        advisor_templates: [
          { tenant_id: 1, workspace_id: 1 },
          { 'trigger_conditions.keywords': 1 }
        ]
      };

      this.updateLog(log.id, {
        status: 'completed',
        message: 'MongoDB 컬렉션 생성 완료',
        details: { 
          connection: `${connection.host}:${connection.port}/${connection.database_name}`,
          collections,
          indexes: Object.keys(indexes)
        }
      });

      console.log(`MongoDB collections created for tenant ${tenantId}:`, collections);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.updateLog(log.id, {
        status: 'failed',
        message: 'MongoDB 컬렉션 생성 실패',
        error_message: errorMessage
      });
      throw error;
    }
  }

  /**
   * 2. 워크스페이스 데이터 시딩
   */
  async seedWorkspaceData(
    workspaceId: string,
    dataType: 'documents' | 'faq' | 'manual' | 'scenarios' | 'templates',
    files: any[],
    options: {
      batch_size?: number;
      overwrite_existing?: boolean;
      auto_categorize?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: {
      workspace_id: string;
      data_type: string;
      processed_files: number;
      total_records: number;
      failed_records: number;
      processing_time: number;
    };
    logs: InitializationLog[];
    error?: string;
  }> {
    const startTime = Date.now();
    const log = this.createLog(
      workspaceId, // tenant_id로 사용
      'data_seed',
      `워크스페이스 데이터 시딩 시작 (${dataType})`,
      'in_progress'
    );

    try {
      const parseResults: FileParseResult[] = [];
      let totalRecords = 0;
      let failedRecords = 0;

      // 파일별 파싱 처리
      for (const file of files) {
        const parseResult = await this.parseFile(file, dataType);
        parseResults.push(parseResult);
        totalRecords += parseResult.parsed_records;
        failedRecords += parseResult.failed_records;
      }

      // 데이터 타입별 저장 처리
      await this.saveDataByType(workspaceId, dataType, parseResults, options);

      const processingTime = Date.now() - startTime;

      this.updateLog(log.id, {
        status: 'completed',
        message: `워크스페이스 데이터 시딩 완료 (${dataType})`,
        details: {
          workspace_id: workspaceId,
          data_type: dataType,
          processed_files: files.length,
          total_records: totalRecords,
          failed_records: failedRecords,
          processing_time: processingTime,
          parse_results: parseResults
        }
      });

      return {
        success: true,
        data: {
          workspace_id: workspaceId,
          data_type: dataType,
          processed_files: files.length,
          total_records: totalRecords,
          failed_records: failedRecords,
          processing_time: processingTime
        },
        logs: this.logs.filter(l => l.tenant_id === workspaceId)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.updateLog(log.id, {
        status: 'failed',
        message: `워크스페이스 데이터 시딩 실패 (${dataType})`,
        error_message: errorMessage
      });

      return {
        success: false,
        logs: this.logs.filter(l => l.tenant_id === workspaceId),
        error: errorMessage
      };
    }
  }

  /**
   * 파일 파싱
   */
  private async parseFile(file: any, dataType: string): Promise<FileParseResult> {
    const fileExtension = path.extname(file.originalname || file.filename || '').toLowerCase();
    let fileType: 'csv' | 'json' | 'xlsx' | 'pdf' | 'txt';
    
    // 파일 타입 결정
    switch (fileExtension) {
      case '.csv':
        fileType = 'csv';
        break;
      case '.json':
        fileType = 'json';
        break;
      case '.xlsx':
      case '.xls':
        fileType = 'xlsx';
        break;
      case '.pdf':
        fileType = 'pdf';
        break;
      default:
        fileType = 'txt';
    }

    // 시뮬레이션된 파싱 결과
    await this.simulateAsyncOperation(1000 + Math.random() * 2000); // 1-3초 시뮬레이션

    const mockData = this.generateMockDataByType(dataType, 10 + Math.floor(Math.random() * 20));
    
    return {
      filename: file.originalname || file.filename || 'unknown',
      file_type: fileType,
      total_records: mockData.length,
      parsed_records: mockData.length - Math.floor(Math.random() * 3), // 일부 실패 시뮬레이션
      failed_records: Math.floor(Math.random() * 3),
      errors: Math.random() > 0.7 ? ['일부 레코드의 형식이 올바르지 않습니다.'] : [],
      data: mockData
    };
  }

  /**
   * 데이터 타입별 목업 데이터 생성
   */
  private generateMockDataByType(dataType: string, count: number): any[] {
    const data: any[] = [];
    
    for (let i = 0; i < count; i++) {
      switch (dataType) {
        case 'documents':
          data.push({
            title: `문서 ${i + 1}`,
            content: `문서 내용 ${i + 1}...`,
            category: ['기술', '제품', '서비스'][i % 3],
            tags: [`태그${i + 1}`, `키워드${i + 1}`]
          });
          break;
        case 'faq':
          data.push({
            question: `자주 묻는 질문 ${i + 1}`,
            answer: `답변 ${i + 1}...`,
            category: ['일반', '기술', '결제'][i % 3],
            priority: Math.floor(Math.random() * 5) + 1
          });
          break;
        case 'scenarios':
          data.push({
            name: `시나리오 ${i + 1}`,
            description: `상담 시나리오 ${i + 1}`,
            triggers: [`키워드${i + 1}`, `조건${i + 1}`],
            category: '상담'
          });
          break;
        case 'templates':
          data.push({
            name: `템플릿 ${i + 1}`,
            content: `안녕하세요, {{customer_name}}님. 템플릿 ${i + 1} 내용입니다.`,
            variables: ['customer_name'],
            category: '인사'
          });
          break;
        default:
          data.push({
            title: `데이터 ${i + 1}`,
            content: `내용 ${i + 1}`,
            type: dataType
          });
      }
    }
    
    return data;
  }

  /**
   * 데이터 타입별 저장 처리
   */
  private async saveDataByType(
    workspaceId: string,
    dataType: string,
    parseResults: FileParseResult[],
    options: any
  ): Promise<void> {
    // 시뮬레이션된 저장 처리
    await this.simulateAsyncOperation(1500);

    console.log(`Saving ${dataType} data for workspace ${workspaceId}:`, {
      files: parseResults.length,
      totalRecords: parseResults.reduce((sum, result) => sum + result.parsed_records, 0),
      options
    });
  }

  /**
   * 3. 워크스페이스 설정 적용
   */
  async applyWorkspaceConfig(
    workspaceId: string,
    operations: {
      create_vector_index?: boolean;
      register_trigger_rules?: boolean;
      sync_categories?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: {
      workspace_id: string;
      applied_operations: string[];
      vector_index_status?: 'created' | 'updated' | 'failed';
      trigger_rules_count?: number;
      synced_categories_count?: number;
    };
    logs: InitializationLog[];
    error?: string;
  }> {
    const log = this.createLog(
      workspaceId, // tenant_id로 사용
      'config_apply',
      '워크스페이스 설정 적용 시작',
      'in_progress'
    );

    try {
      const appliedOperations: string[] = [];
      let vectorIndexStatus: 'created' | 'updated' | 'failed' | undefined;
      let triggerRulesCount: number | undefined;
      let syncedCategoriesCount: number | undefined;

      // 벡터 인덱스 생성 (KMS용)
      if (operations.create_vector_index) {
        await this.createVectorIndex(workspaceId);
        appliedOperations.push('create_vector_index');
        vectorIndexStatus = 'created';
      }

      // 트리거 규칙 등록 (어드바이저용)
      if (operations.register_trigger_rules) {
        triggerRulesCount = await this.registerTriggerRules(workspaceId);
        appliedOperations.push('register_trigger_rules');
      }

      // 카테고리 동기화
      if (operations.sync_categories) {
        syncedCategoriesCount = await this.syncCategories(workspaceId);
        appliedOperations.push('sync_categories');
      }

      this.updateLog(log.id, {
        status: 'completed',
        message: '워크스페이스 설정 적용 완료',
        details: {
          workspace_id: workspaceId,
          applied_operations: appliedOperations,
          vector_index_status: vectorIndexStatus,
          trigger_rules_count: triggerRulesCount,
          synced_categories_count: syncedCategoriesCount
        }
      });

      return {
        success: true,
        data: {
          workspace_id: workspaceId,
          applied_operations: appliedOperations,
          vector_index_status: vectorIndexStatus,
          trigger_rules_count: triggerRulesCount,
          synced_categories_count: syncedCategoriesCount
        },
        logs: this.logs.filter(l => l.tenant_id === workspaceId)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.updateLog(log.id, {
        status: 'failed',
        message: '워크스페이스 설정 적용 실패',
        error_message: errorMessage
      });

      return {
        success: false,
        logs: this.logs.filter(l => l.tenant_id === workspaceId),
        error: errorMessage
      };
    }
  }

  /**
   * 벡터 인덱스 생성
   */
  private async createVectorIndex(workspaceId: string): Promise<void> {
    await this.simulateAsyncOperation(3000); // 3초 시뮬레이션
    console.log(`Vector index created for workspace ${workspaceId}`);
  }

  /**
   * 트리거 규칙 등록
   */
  private async registerTriggerRules(workspaceId: string): Promise<number> {
    await this.simulateAsyncOperation(2000); // 2초 시뮬레이션
    const rulesCount = 5 + Math.floor(Math.random() * 10);
    console.log(`${rulesCount} trigger rules registered for workspace ${workspaceId}`);
    return rulesCount;
  }

  /**
   * 카테고리 동기화
   */
  private async syncCategories(workspaceId: string): Promise<number> {
    await this.simulateAsyncOperation(1000); // 1초 시뮬레이션
    const categoriesCount = 3 + Math.floor(Math.random() * 7);
    console.log(`${categoriesCount} categories synced for workspace ${workspaceId}`);
    return categoriesCount;
  }

  /**
   * 4. 초기화 상태 조회
   */
  async getInitializationStatus(tenantId: string): Promise<{
    success: boolean;
    data?: {
      tenant_id: string;
      overall_status: 'pending' | 'in_progress' | 'completed' | 'failed';
      database_status: {
        postgresql?: 'pending' | 'in_progress' | 'completed' | 'failed';
        mongodb?: 'pending' | 'in_progress' | 'completed' | 'failed';
      };
      workspace_status: {
        [workspace_id: string]: {
          data_seeding: 'pending' | 'in_progress' | 'completed' | 'failed';
          config_applied: 'pending' | 'in_progress' | 'completed' | 'failed';
        };
      };
      logs: InitializationLog[];
      last_updated: string;
    };
    error?: string;
  }> {
    try {
      const tenantLogs = this.logs.filter(log => log.tenant_id === tenantId);
      
      // 데이터베이스 상태 분석
      const databaseStatus: any = {};
      const dbInitLogs = tenantLogs.filter(log => log.operation_type === 'database_init');
      
      if (dbInitLogs.length > 0) {
        const latestDbLog = dbInitLogs[dbInitLogs.length - 1];
        if (latestDbLog.details?.initialized_databases) {
          latestDbLog.details.initialized_databases.forEach((dbType: string) => {
            databaseStatus[dbType] = latestDbLog.status;
          });
        }
      }

      // 워크스페이스 상태 분석
      const workspaceStatus: any = {};
      const dataSeedLogs = tenantLogs.filter(log => log.operation_type === 'data_seed');
      const configApplyLogs = tenantLogs.filter(log => log.operation_type === 'config_apply');

      // 데이터 시딩 상태
      dataSeedLogs.forEach(log => {
        const workspaceId = log.details?.workspace_id || 'unknown';
        if (!workspaceStatus[workspaceId]) {
          workspaceStatus[workspaceId] = {};
        }
        workspaceStatus[workspaceId].data_seeding = log.status;
      });

      // 설정 적용 상태
      configApplyLogs.forEach(log => {
        const workspaceId = log.details?.workspace_id || 'unknown';
        if (!workspaceStatus[workspaceId]) {
          workspaceStatus[workspaceId] = {};
        }
        workspaceStatus[workspaceId].config_applied = log.status;
      });

      // 전체 상태 결정
      let overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';
      if (tenantLogs.some(log => log.status === 'failed')) {
        overallStatus = 'failed';
      } else if (tenantLogs.some(log => log.status === 'in_progress')) {
        overallStatus = 'in_progress';
      } else if (tenantLogs.length > 0 && tenantLogs.every(log => log.status === 'completed')) {
        overallStatus = 'completed';
      }

      return {
        success: true,
        data: {
          tenant_id: tenantId,
          overall_status: overallStatus,
          database_status: databaseStatus,
          workspace_status: workspaceStatus,
          logs: tenantLogs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
          last_updated: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 비동기 작업 시뮬레이션
   */
  private async simulateAsyncOperation(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 모든 로그 조회
   */
  getAllLogs(): InitializationLog[] {
    return this.logs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  /**
   * 테넌트별 로그 조회
   */
  getTenantLogs(tenantId: string): InitializationLog[] {
    return this.logs
      .filter(log => log.tenant_id === tenantId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }
}