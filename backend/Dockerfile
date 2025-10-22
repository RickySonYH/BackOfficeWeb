# [advice from AI] 백엔드 Multi-stage Docker build
# Stage 1: Build stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (레이어 캐싱 최적화)
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production=false

# 소스 코드 복사
COPY . .

# TypeScript 빌드 (필요한 경우)
RUN npm run build || echo "No build script found"

# Stage 2: Production stage
FROM node:18-alpine AS production

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production && npm cache clean --force

# 빌드된 파일과 소스 코드 복사
COPY --from=builder --chown=backend:nodejs /app .

# 사용자 변경
USER backend

# 포트 노출
EXPOSE 6000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6000/health || exit 1

# 애플리케이션 실행
CMD ["node", "src/app.js"]