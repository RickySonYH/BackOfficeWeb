# AICC Operations Management Platform

> 콜봇/콜센터 솔루션을 위한 통합 운영 관리 플랫폼

## 📋 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [시스템 요구사항](#시스템-요구사항)
- [설치 및 실행](#설치-및-실행)
- [환경 설정](#환경-설정)
- [API 문서](#api-문서)
- [보안 설정](#보안-설정)
- [모니터링](#모니터링)
- [문제 해결](#문제-해결)

## 🎯 개요

AICC Operations Management Platform은 콜봇과 콜센터 솔루션의 통합 운영을 위한 웹 기반 관리 플랫폼입니다.

### 주요 특징

- **멀티 테넌트 아키텍처**: 여러 고객사의 독립적인 환경 관리
- **ECP 인증 연동**: 기업 통합 인증 시스템 지원
- **데이터 초기화 자동화**: 테넌트별 DB 스키마 및 데이터 자동 구성
- **실시간 모니터링**: 시스템 상태 및 초기화 진행 상황 실시간 추적
- **보안 강화**: 암호화, Rate Limiting, CORS 등 다층 보안

## 🚀 주요 기능

### 1. 대시보드
- **전체 통계**: 회사, 테넌트, 사용자, 워크스페이스 현황
- **초기화 현황**: 테넌트별 데이터 초기화 진행 상태
- **최근 활동**: 회사 등록, 테넌트 생성, 초기화 로그
- **시스템 상태**: DB, 백엔드, Kubernetes, ECP 연결 상태

### 2. 테넌트 관리
- **회사 관리**: 고객사 정보 등록 및 관리
- **테넊트 생성**: Kubernetes 네임스페이스 기반 테넌트 생성
- **DB 연결 관리**: PostgreSQL/MongoDB 연결 정보 암호화 저장
- **배포 상태 추적**: 테넌트 배포 진행 상황 모니터링

### 3. 사용자 관리
- **역할 기반 접근 제어**: Admin, Manager, User 권한 관리
- **ECP 인증 연동**: 기업 통합 인증 시스템 지원
- **테넌트별 사용자 관리**: 테넌트 단위 사용자 권한 관리

### 4. 워크스페이스 관리
- **KMS 워크스페이스**: 지식 관리 시스템 설정
- **Advisor 워크스페이스**: 상담 어드바이저 시스템 설정
- **동적 설정**: JSONB 기반 유연한 워크스페이스 설정

### 5. 데이터 초기화
- **자동 스키마 생성**: PostgreSQL/MongoDB 스키마 자동 생성
- **대용량 파일 업로드**: CSV, JSON, XLSX, PDF 파일 지원 (최대 50MB)
- **실시간 진행 상황**: 초기화 과정 실시간 모니터링
- **상세 로깅**: 모든 초기화 과정 상세 기록

## 💻 시스템 요구사항

### 최소 요구사항
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 50GB SSD
- **Network**: 1Gbps

### 권장 요구사항
- **CPU**: 8 cores
- **Memory**: 16GB RAM
- **Storage**: 100GB SSD
- **Network**: 10Gbps

### 소프트웨어 요구사항
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (개발 환경)
- **PostgreSQL**: 13+
- **Redis**: 6+

## 🛠 설치 및 실행

### 1. 개발 환경 실행

```bash
# 저장소 클론
git clone <repository-url>
cd BackOffice Manager

# 환경 변수 설정
cp frontend/env.production.example frontend/.env
cp backend/env.production.example backend/.env

# 개발 서버 실행
docker-compose up -d

# 또는 개별 실행
cd frontend && npm install && npm run dev  # Port: 6001
cd backend && npm install && npm run dev   # Port: 6000
```

### 2. 프로덕션 환경 배포

```bash
# 프로덕션 환경 변수 설정
cp frontend/env.production.example frontend/.env.production
cp backend/env.production.example backend/.env.production

# 민감 정보 설정 (반드시 변경 필요)
nano backend/.env.production
# - JWT_SECRET: 강력한 JWT 비밀키 설정
# - ENCRYPTION_KEY: 32자리 암호화 키 설정
# - DB_PASSWORD: 데이터베이스 비밀번호 설정
# - ECP_CLIENT_SECRET: ECP 클라이언트 시크릿 설정

# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

### 3. Kubernetes 배포 (선택사항)

```bash
# Secret 생성
kubectl create secret generic aicc-ops-secrets \
  --from-literal=jwt-secret=<your-jwt-secret> \
  --from-literal=encryption-key=<your-encryption-key> \
  --from-literal=db-password=<your-db-password>

# ConfigMap 적용
kubectl apply -f k8s/secrets.yaml.example

# 애플리케이션 배포
kubectl apply -f k8s/
```

## ⚙️ 환경 설정

### 포트 설정

| 서비스 | 개발 포트 | 프로덕션 포트 | 설명 |
|--------|----------|---------------|------|
| Frontend | 6001 | 6001 | React 웹 애플리케이션 |
| Backend | 6000 | 6000 | Node.js API 서버 |
| PostgreSQL | 6432 | 6432 | 메인 데이터베이스 |
| Redis | 6379 | 6379 | 세션 스토어 |
| ECP Auth | 8000 | 8000 | ECP 인증 서버 |

### 주요 환경 변수

#### 프론트엔드 (.env.production)
```env
VITE_API_BASE_URL=http://localhost:6000
VITE_ECP_AUTH_URL=http://localhost:8000
VITE_MAX_FILE_SIZE=52428800
```

#### 백엔드 (.env.production)
```env
NODE_ENV=production
PORT=6000
DB_HOST=localhost
DB_PORT=6432
JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=52428800
```

## 🔒 보안 설정

### 1. HTTPS 설정 (프로덕션)

```bash
# SSL 인증서 생성 (Let's Encrypt 권장)
certbot certonly --standalone -d your-domain.com

# Nginx 설정에 SSL 인증서 경로 추가
# nginx/nginx.conf 파일 수정 필요
```

### 2. 방화벽 설정

```bash
# 필요한 포트만 개방
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 6001  # Frontend (내부망만)
ufw allow 6000  # Backend API (내부망만)
ufw enable
```

### 3. 데이터베이스 보안

```sql
-- PostgreSQL 보안 설정
ALTER USER aicc_admin WITH PASSWORD 'strong_password_here';
REVOKE ALL ON DATABASE aicc_operations FROM PUBLIC;
GRANT CONNECT ON DATABASE aicc_operations TO aicc_admin;
```

## 📊 모니터링

### 1. 헬스체크 엔드포인트

- **Frontend**: `GET http://localhost:6001/health`
- **Backend**: `GET http://localhost:6000/health`
- **ECP Auth**: `GET http://localhost:8000/api/health`

### 2. 로그 위치

```
logs/
├── backend/           # 백엔드 로그
│   ├── combined.log   # 전체 로그
│   ├── error.log      # 에러 로그
│   └── data-init.log  # 데이터 초기화 로그
├── nginx/             # Nginx 로그
├── postgres/          # PostgreSQL 로그
└── redis/             # Redis 로그
```

### 3. 성능 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 데이터베이스 성능
docker exec -it aicc-ops-postgres psql -U aicc_admin -d aicc_operations -c "
SELECT * FROM index_usage_stats ORDER BY idx_scan DESC LIMIT 10;
"

# 로그 분석
tail -f logs/backend/combined.log | grep ERROR
```

## 🔧 문제 해결

### 자주 발생하는 문제

#### 1. 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :6001
lsof -i :6000

# 프로세스 종료
kill -9 <PID>
```

#### 2. 데이터베이스 연결 실패
```bash
# PostgreSQL 상태 확인
docker exec -it aicc-ops-postgres pg_isready

# 연결 테스트
docker exec -it aicc-ops-postgres psql -U aicc_admin -d aicc_operations -c "SELECT 1;"
```

#### 3. 메모리 부족
```bash
# 메모리 사용량 확인
free -h
docker system df

# 불필요한 이미지 정리
docker system prune -a
```

#### 4. 파일 업로드 실패
```bash
# 업로드 디렉토리 권한 확인
ls -la uploads/

# 권한 수정
chmod 755 uploads/
chown -R node:node uploads/
```

### 로그 분석

```bash
# 에러 로그 확인
grep -i error logs/backend/combined.log

# 데이터 초기화 로그 확인
tail -f logs/backend/data-init.log

# 보안 이벤트 확인
grep "Security Event" logs/backend/combined.log
```

## 📚 API 문서

### 인증
모든 API 요청에는 JWT 토큰이 필요합니다.

```bash
# 로그인
curl -X POST http://localhost:6000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# 토큰 사용
curl -X GET http://localhost:6000/api/dashboard \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 주요 엔드포인트

#### 대시보드
- `GET /api/dashboard` - 대시보드 데이터 조회
- `GET /api/dashboard/system-status` - 시스템 상태 조회

#### 데이터 초기화
- `POST /api/data-init/tenant/:tenantId/initialize` - 테넌트 초기화
- `POST /api/data-init/workspace/:workspaceId/seed` - 데이터 시딩
- `GET /api/data-init/tenant/:tenantId/status` - 초기화 상태 조회

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 지원

- **이메일**: support@aicc.co.kr
- **문서**: [Wiki 페이지](링크)
- **이슈 리포트**: [GitHub Issues](링크)

---

**© 2024 AICC. All rights reserved.**