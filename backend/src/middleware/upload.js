// [advice from AI] 파일 업로드 제한 및 보안 미들웨어
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { logger, logSecurity } = require('../utils/logger');

// 업로드 디렉토리 설정
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 허용된 파일 타입
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'csv,json,xlsx,pdf,txt').split(',');
const allowedMimeTypes = {
  'csv': ['text/csv', 'application/csv'],
  'json': ['application/json', 'text/json'],
  'xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  'pdf': ['application/pdf'],
  'txt': ['text/plain']
};

// 파일 크기 제한 (기본 50MB)
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 테넌트별 디렉토리 생성
    const tenantId = req.params.tenantId || req.body.tenantId || 'default';
    const tenantDir = path.join(uploadDir, tenantId);
    
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    
    cb(null, tenantDir);
  },
  
  filename: (req, file, cb) => {
    // 안전한 파일명 생성
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const sanitizedOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
    
    const filename = `${timestamp}_${randomSuffix}_${sanitizedOriginalName}`;
    
    // 파일 정보 로깅
    logger.info('File upload initiated', {
      originalName: file.originalname,
      filename,
      mimetype: file.mimetype,
      size: file.size,
      tenantId: req.params.tenantId || req.body.tenantId
    });
    
    cb(null, filename);
  }
});

// 파일 필터링
const fileFilter = (req, file, cb) => {
  try {
    // 파일 확장자 검사
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (!allowedFileTypes.includes(ext)) {
      logSecurity('INVALID_FILE_TYPE', {
        filename: file.originalname,
        extension: ext,
        allowedTypes: allowedFileTypes,
        ip: req.ip
      });
      
      return cb(new Error(`File type .${ext} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`));
    }
    
    // MIME 타입 검사
    const allowedMimes = allowedMimeTypes[ext] || [];
    if (!allowedMimes.includes(file.mimetype)) {
      logSecurity('INVALID_MIME_TYPE', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: ext,
        allowedMimes,
        ip: req.ip
      });
      
      return cb(new Error(`Invalid MIME type for .${ext} file. Expected: ${allowedMimes.join(', ')}`));
    }
    
    // 파일명 보안 검사
    const dangerousPatterns = [
      /\.\./g,  // Path traversal
      /[<>:"|?*]/g,  // Invalid characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Windows reserved names
    ];
    
    const filename = file.originalname;
    if (dangerousPatterns.some(pattern => pattern.test(filename))) {
      logSecurity('DANGEROUS_FILENAME', {
        filename,
        ip: req.ip
      });
      
      return cb(new Error('Invalid filename detected'));
    }
    
    cb(null, true);
  } catch (error) {
    logger.error('File filter error', { error: error.message });
    cb(error);
  }
};

// Multer 설정
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 10, // 최대 10개 파일
    fields: 20, // 최대 20개 필드
    fieldNameSize: 100, // 필드명 최대 길이
    fieldSize: 1024 * 1024 // 필드 값 최대 크기 (1MB)
  }
});

// 파일 업로드 후 검증 미들웨어
const validateUploadedFile = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }
    
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files) {
      // 실제 파일 크기 재검증
      const stats = fs.statSync(file.path);
      if (stats.size > maxFileSize) {
        fs.unlinkSync(file.path); // 파일 삭제
        return res.status(413).json({
          error: 'File too large',
          maxSize: `${Math.round(maxFileSize / (1024 * 1024))}MB`
        });
      }
      
      // 파일 헤더 검사 (매직 넘버)
      const buffer = fs.readFileSync(file.path, { start: 0, end: 10 });
      const isValidFile = await validateFileHeader(buffer, file.mimetype);
      
      if (!isValidFile) {
        fs.unlinkSync(file.path); // 파일 삭제
        logSecurity('INVALID_FILE_HEADER', {
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip
        });
        
        return res.status(400).json({
          error: 'Invalid file format detected'
        });
      }
      
      // 파일 업로드 성공 로그
      logger.info('File upload completed', {
        filename: file.filename,
        originalName: file.originalname,
        size: stats.size,
        path: file.path,
        tenantId: req.params.tenantId || req.body.tenantId
      });
    }
    
    next();
  } catch (error) {
    logger.error('File validation error', { error: error.message });
    res.status(500).json({ error: 'File validation failed' });
  }
};

// 파일 헤더 검증 (매직 넘버)
const validateFileHeader = async (buffer, mimetype) => {
  const magicNumbers = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'application/json': [0x7B], // {
    'text/csv': [0x22, 0x2C, 0x0A, 0x0D], // 일반적인 CSV 문자들
    'text/plain': [], // 텍스트는 다양한 시작 가능
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B] // PK (ZIP)
  };
  
  const expectedMagic = magicNumbers[mimetype];
  if (!expectedMagic || expectedMagic.length === 0) {
    return true; // 검증할 매직 넘버가 없으면 통과
  }
  
  for (let i = 0; i < expectedMagic.length; i++) {
    if (buffer[i] !== expectedMagic[i]) {
      return false;
    }
  }
  
  return true;
};

// 파일 정리 미들웨어 (에러 발생 시)
const cleanupFiles = (error, req, res, next) => {
  if (error && req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        logger.info('Cleaned up uploaded file due to error', { filename: file.filename });
      }
    });
  }
  
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size: ${Math.round(maxFileSize / (1024 * 1024))}MB`;
        statusCode = 413;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum: 10 files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
    
    logSecurity('FILE_UPLOAD_ERROR', {
      error: error.code,
      message: error.message,
      ip: req.ip
    });
    
    return res.status(statusCode).json({ error: message });
  }
  
  next(error);
};

// 업로드된 파일 정리 스케줄러 (24시간 후 삭제)
const scheduleFileCleanup = (filePath) => {
  setTimeout(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('Scheduled file cleanup completed', { filePath });
    }
  }, 24 * 60 * 60 * 1000); // 24시간
};

module.exports = {
  upload,
  validateUploadedFile,
  cleanupFiles,
  scheduleFileCleanup,
  maxFileSize,
  allowedFileTypes
};
