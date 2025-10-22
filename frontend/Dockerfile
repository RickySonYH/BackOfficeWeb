# [advice from AI] 프론트엔드 Multi-stage Docker build
# Stage 1: Build stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (레이어 캐싱 최적화)
COPY package*.json ./

# 의존성 설치 (개발 의존성 포함)
RUN npm ci --only=production=false

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine AS production

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 파일을 Nginx 서빙 디렉토리로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 포트 노출
EXPOSE 6001

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6001/ || exit 1

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]