// [advice from AI] 헬스체크 라우트
import { Router, Request, Response } from 'express';
import { testDatabaseConnection } from '../config/database';
import { kubernetesClient } from '../config/kubernetes';
import { logger } from '../config/logger';

const router = Router();

// [advice from AI] 기본 헬스체크 엔드포인트
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    // [advice from AI] 기본 서버 상태
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'AICC Operations Management Platform Backend',
      version: '1.0.0',
      port: process.env.PORT || 6000,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      responseTime: 0
    };

    // [advice from AI] 응답 시간 계산
    healthStatus.responseTime = Date.now() - startTime;

    res.status(200).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// [advice from AI] 상세 헬스체크 엔드포인트 (모든 의존성 포함)
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // [advice from AI] 병렬로 모든 의존성 체크
    const [dbStatus, k8sStatus] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkKubernetesHealth()
    ]);

    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'AICC Operations Management Platform Backend',
      version: '1.0.0',
      port: process.env.PORT || 6000,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      dependencies: {
        database: dbStatus.status === 'fulfilled' ? dbStatus.value : { status: 'ERROR', error: dbStatus.reason },
        kubernetes: k8sStatus.status === 'fulfilled' ? k8sStatus.value : { status: 'ERROR', error: k8sStatus.reason }
      }
    };

    // [advice from AI] 의존성 중 하나라도 실패하면 전체 상태를 DEGRADED로 설정
    const hasFailures = Object.values(healthStatus.dependencies).some(dep => dep.status !== 'OK');
    if (hasFailures) {
      healthStatus.status = 'DEGRADED';
    }

    const statusCode = healthStatus.status === 'OK' ? 200 : 
                      healthStatus.status === 'DEGRADED' ? 206 : 503;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// [advice from AI] 데이터베이스 헬스체크
router.get('/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const statusCode = dbHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(dbHealth);

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      component: 'database',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// [advice from AI] Kubernetes 헬스체크
router.get('/kubernetes', async (req: Request, res: Response): Promise<void> => {
  try {
    const k8sHealth = await checkKubernetesHealth();
    const statusCode = k8sHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(k8sHealth);

  } catch (error) {
    logger.error('Kubernetes health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      component: 'kubernetes',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// [advice from AI] 준비 상태 확인 (Kubernetes readiness probe용)
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    // [advice from AI] 필수 의존성만 체크 (빠른 응답)
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
      res.status(200).json({
        status: 'READY',
        timestamp: new Date().toISOString(),
        message: 'Service is ready to accept requests'
      });
    } else {
      res.status(503).json({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        message: 'Service is not ready - database connection failed'
      });
    }

  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// [advice from AI] 생존 확인 (Kubernetes liveness probe용)
router.get('/live', (req: Request, res: Response): void => {
  // [advice from AI] 간단한 생존 확인 (의존성 체크 없음)
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

// [advice from AI] 데이터베이스 헬스체크 함수
async function checkDatabaseHealth(): Promise<{
  status: string;
  component: string;
  timestamp: string;
  responseTime?: number;
  details?: any;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connected = await testDatabaseConnection();
    const responseTime = Date.now() - startTime;

    return {
      status: connected ? 'OK' : 'ERROR',
      component: 'database',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 6432,
        database: process.env.DB_NAME || 'aicc_ops'
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ERROR',
      component: 'database',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

// [advice from AI] Kubernetes 헬스체크 함수
async function checkKubernetesHealth(): Promise<{
  status: string;
  component: string;
  timestamp: string;
  responseTime?: number;
  details?: any;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connected = await kubernetesClient.testConnection();
    const responseTime = Date.now() - startTime;

    return {
      status: connected ? 'OK' : 'ERROR',
      component: 'kubernetes',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        clusterUrl: process.env.K8S_CLUSTER_URL || 'default',
        inCluster: process.env.K8S_IN_CLUSTER === 'true',
        useServiceAccount: process.env.K8S_USE_SERVICE_ACCOUNT === 'true'
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ERROR',
      component: 'kubernetes',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'Kubernetes connection failed'
    };
  }
}

export default router;
