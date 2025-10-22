// [advice from AI] 보안 강화 미들웨어
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const { logger, logSecurity } = require('../utils/logger');

// CORS 설정
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:6001',
      'http://localhost:6001',
      'https://ops.aicc.co.kr'
    ];
    
    // 개발 환경에서는 origin이 없을 수 있음 (Postman 등)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurity('CORS_VIOLATION', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Rate Limiting 설정
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: message || {
      error: 'Too many requests from this IP',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // 헬스체크는 제외
      return req.path === '/health';
    },
    onLimitReached: (req) => {
      logSecurity('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
    }
  });
};

// 일반 API Rate Limit
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15분
  100, // 100 요청
  'Too many requests, please try again later'
);

// 로그인 API Rate Limit (더 엄격)
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15분
  5, // 5번 시도
  'Too many login attempts, please try again later'
);

// 파일 업로드 Rate Limit
const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1시간
  10, // 10개 파일
  'Too many file uploads, please try again later'
);

// Helmet 보안 헤더 설정
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || "http://localhost:6001"]
    }
  },
  crossOriginEmbedderPolicy: false // 개발 환경 호환성
});

// 테넌트 DB 연결 정보 암호화
class EncryptionService {
  constructor() {
    this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY;
    
    if (!this.secretKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // 키 길이 확인
    if (this.secretKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters long');
    }
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      cipher.setAAD(Buffer.from('tenant-db-connection', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      
      decipher.setAAD(Buffer.from('tenant-db-connection', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Failed to decrypt data');
    }
  }
}

// SQL Injection 방지 미들웨어
const sqlInjectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) return true;
      } else if (checkValue(obj[key]) || checkValue(key)) {
        return true;
      }
    }
    return false;
  };

  // 요청 데이터 검사
  const suspicious = checkObject(req.query) || 
                   checkObject(req.body) || 
                   checkObject(req.params);

  if (suspicious) {
    logSecurity('SQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      query: req.query,
      body: req.body,
      params: req.params
    });
    
    return res.status(400).json({
      error: 'Invalid request data detected'
    });
  }

  next();
};

// XSS 방지 미들웨어
const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return xssPatterns.reduce((acc, pattern) => {
        return acc.replace(pattern, '');
      }, value);
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  // 요청 데이터 정화
  sanitizeObject(req.query);
  sanitizeObject(req.body);
  sanitizeObject(req.params);

  next();
};

module.exports = {
  corsOptions,
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  helmetConfig,
  EncryptionService,
  sqlInjectionProtection,
  xssProtection
};
