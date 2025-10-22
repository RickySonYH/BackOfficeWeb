// [advice from AI] Winston 로거 설정
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 로그 디렉토리 생성
const logDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로그 레벨 설정
const logLevel = process.env.LOG_LEVEL || 'info';

// 커스텀 로그 포맷
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // 메타데이터 추가
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // 스택 트레이스 추가
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'aicc-ops-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || 14,
      tailable: true
    }),
    
    // 전체 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || 14,
      tailable: true
    }),

    // 데이터 초기화 전용 로그
    new winston.transports.File({
      filename: path.join(logDir, 'data-init.log'),
      level: 'info',
      maxsize: '50m',
      maxFiles: 30,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // 예외 처리
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: '10m',
      maxFiles: 5
    })
  ],
  
  // Promise rejection 처리
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: '10m',
      maxFiles: 5
    })
  ]
});

// 개발 환경에서는 콘솔 출력 추가
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 데이터 초기화 전용 로거
const dataInitLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'data-initialization',
    category: 'tenant-setup'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'data-init.log'),
      maxsize: '50m',
      maxFiles: 30
    })
  ]
});

// 로그 헬퍼 함수들
const logHelpers = {
  // 데이터 초기화 로그
  logDataInit: (tenantId, action, status, message, details = {}) => {
    dataInitLogger.info('Data initialization event', {
      tenantId,
      action,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // API 요청 로그
  logApiRequest: (req, res, duration) => {
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });
  },

  // 에러 로그 (상세)
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  },

  // 보안 관련 로그
  logSecurity: (event, details = {}) => {
    logger.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  // 데이터베이스 쿼리 로그 (개발 환경)
  logQuery: (query, duration, params = {}) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Database Query', {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration: `${duration}ms`,
        params
      });
    }
  }
};

module.exports = {
  logger,
  dataInitLogger,
  ...logHelpers
};
