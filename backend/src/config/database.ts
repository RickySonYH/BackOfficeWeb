// [advice from AI] PostgreSQL 데이터베이스 연결 설정
import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

// [advice from AI] 데이터베이스 연결 설정 인터페이스
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

// [advice from AI] 환경변수에서 DB 설정 로드
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6432'),
    database: process.env.DB_NAME || 'aicc_ops',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
  };
};

// [advice from AI] PostgreSQL 연결 풀 설정
const createPool = (): Pool => {
  const config = getDatabaseConfig();
  
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl,
    max: config.maxConnections,
    min: 2, // 최소 연결 수
    idleTimeoutMillis: 30000, // 30초 후 유휴 연결 해제
    connectionTimeoutMillis: 10000, // 10초 연결 타임아웃
    // acquireTimeoutMillis: 60000, // 60초 획득 타임아웃 (pg 라이브러리에서 지원하지 않는 옵션)
  };

  const pool = new Pool(poolConfig);

  // [advice from AI] 연결 풀 이벤트 리스너
  pool.on('connect', (client) => {
    logger.info('Database client connected');
  });

  pool.on('acquire', (client) => {
    logger.debug('Database client acquired from pool');
  });

  pool.on('error', (err, client) => {
    logger.error('Database pool error:', err);
  });

  pool.on('remove', (client) => {
    logger.debug('Database client removed from pool');
  });

  return pool;
};

// [advice from AI] 데이터베이스 연결 풀 인스턴스
export const pool = createPool();

// [advice from AI] 데이터베이스 연결 테스트 함수
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    logger.info('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

// [advice from AI] 데이터베이스 연결 종료 함수
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
  }
};

// [advice from AI] 트랜잭션 헬퍼 함수
export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// [advice from AI] 쿼리 실행 헬퍼 함수
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Query executed', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Query execution failed', {
      query: text,
      params,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};
