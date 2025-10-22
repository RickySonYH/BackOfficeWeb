// [advice from AI] Backend 애플리케이션 진입점
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { testDatabaseConnection } from './config/database';
import { kubernetesClient } from './config/kubernetes';
import { internalAuthService } from './services/internal-auth.service';

// [advice from AI] 라우트 임포트
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import companiesRoutes from './routes/companies';
import tenantsRoutes from './routes/tenants';
import solutionDeploymentRoutes from './routes/solution-deployment';
import workspaceConfigurationRoutes from './routes/workspace-configuration';
import knowledgeDataRoutes from './routes/knowledge-data';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '6000');

// [advice from AI] 보안 미들웨어 설정
app.use(helmet());

// [advice from AI] CORS 설정 (프론트엔드 포트 6001에서 접근 허용)
app.use(cors({
  origin: ['http://localhost:6001', 'http://frontend:6001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// [advice from AI] Rate limiting 설정
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 최대 100 요청
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// [advice from AI] Body parser 미들웨어
app.use(express.json({ limit: process.env.MAX_FILE_SIZE ? `${process.env.MAX_FILE_SIZE}mb` : '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE ? `${process.env.MAX_FILE_SIZE}mb` : '50mb' }));

// [advice from AI] 라우트 등록
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/solution-deployment', solutionDeploymentRoutes);
app.use('/api/workspace-configuration', workspaceConfigurationRoutes);
app.use('/api/knowledge-data', knowledgeDataRoutes);

// [advice from AI] 기본 루트
app.get('/', (req, res) => {
  res.json({
    message: 'AICC Operations Management Platform API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      healthDetailed: '/api/health/detailed',
      auth: '/api/auth',
      companies: '/api/companies',
      tenants: '/api/tenants',
      solutionDeployment: '/api/solution-deployment',
      workspaceConfiguration: '/api/workspace-configuration',
      knowledgeData: '/api/knowledge-data',
      docs: '/api/docs'
    }
  });
});

// [advice from AI] 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// [advice from AI] 에러 핸들링 미들웨어
app.use(errorHandler);

// [advice from AI] 애플리케이션 초기화 함수
async function initializeApplication(): Promise<void> {
  try {
    logger.info('🚀 Initializing AICC Operations Backend...');

    // [advice from AI] 데이터베이스 연결 테스트
    logger.info('📊 Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      logger.info('✅ Database connection successful');
    } else {
      logger.warn('⚠️ Database connection failed - service will start but may not function properly');
    }

            // [advice from AI] Kubernetes 연결 테스트
            logger.info('☸️ Testing Kubernetes connection...');
            try {
              const k8sConnected = await kubernetesClient.testConnection();
              if (k8sConnected) {
                logger.info('✅ Kubernetes connection successful');
              } else {
                logger.warn('⚠️ Kubernetes connection failed - K8s features will not be available');
              }
            } catch (error) {
              logger.warn('⚠️ Kubernetes client initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            }

            // [advice from AI] 내부 인증 기본 사용자 초기화
            logger.info('👤 Initializing default users for internal authentication...');
            try {
              await internalAuthService.initializeDefaultUsers();
              logger.info('✅ Default users initialization completed');
            } catch (error) {
              logger.warn('⚠️ Default users initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            }

            logger.info('🎉 AICC Operations Backend initialization completed');

  } catch (error) {
    logger.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

// [advice from AI] 서버 시작
async function startServer(): Promise<void> {
  try {
    await initializeApplication();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 AICC Operations Backend server is running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      logger.info(`🌐 CORS enabled for: http://localhost:6001`);
      logger.info(`📈 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // [advice from AI] Graceful shutdown 처리
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// [advice from AI] 서버 시작
startServer();

export default app;
