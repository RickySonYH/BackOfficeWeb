# 🚀 AICC Operations Platform - 프로덕션 배포 가이드

## 📋 목차
1. [시스템 요구사항](#시스템-요구사항)
2. [데이터베이스 설정](#데이터베이스-설정)
3. [백엔드 배포](#백엔드-배포)
4. [프론트엔드 배포](#프론트엔드-배포)
5. [환경 변수 설정](#환경-변수-설정)
6. [보안 설정](#보안-설정)
7. [모니터링 설정](#모니터링-설정)
8. [문제 해결](#문제-해결)

## 🔧 시스템 요구사항

### 최소 요구사항
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 50GB SSD
- **Network**: 1Gbps

### 권장 요구사항
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 8 cores
- **Memory**: 16GB RAM
- **Storage**: 100GB SSD
- **Network**: 1Gbps

### 필수 소프트웨어
- **Node.js**: 18.17.0+
- **PostgreSQL**: 13+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Nginx**: 1.18+

## 🗄️ 데이터베이스 설정

### 1. PostgreSQL 설치 및 설정

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo dnf install postgresql postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
```

### 2. 데이터베이스 사용자 생성

```bash
sudo -u postgres psql
```

```sql
-- 데이터베이스 사용자 생성
CREATE USER aicc_admin WITH ENCRYPTED PASSWORD 'your_secure_password';

-- 데이터베이스 권한 부여
ALTER USER aicc_admin CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE postgres TO aicc_admin;

-- 연결 종료
\q
```

### 3. 자동 데이터베이스 설정

```bash
# 환경 변수 설정
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aicc_ops_platform
export DB_USER=aicc_admin
export DB_PASSWORD=your_secure_password

# 데이터베이스 설정 스크립트 실행
./scripts/setup-database.sh
```

### 4. 수동 데이터베이스 설정

```bash
# 데이터베이스 생성
createdb -U aicc_admin aicc_ops_platform

# 스키마 적용
psql -U aicc_admin -d aicc_ops_platform -f database/production-schema.sql

# 초기 데이터 삽입
psql -U aicc_admin -d aicc_ops_platform -f database/initial-data.sql
```

## 🔙 백엔드 배포

### 1. 소스 코드 배포

```bash
# 프로젝트 클론
git clone https://github.com/RickySonYH/BackOfficeWeb.git
cd BackOfficeWeb

# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치
npm ci --production
```

### 2. 환경 변수 설정

```bash
# 프로덕션 환경 변수 파일 생성
cp env.production.example .env.production

# 환경 변수 편집
nano .env.production
```

**필수 환경 변수:**
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aicc_ops_platform
DB_USER=aicc_admin
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_32_chars_min
ENCRYPTION_KEY=your_encryption_key_32_chars
```

### 3. 백엔드 빌드 및 실행

```bash
# TypeScript 컴파일
npm run build

# 프로덕션 실행
npm start

# 또는 PM2로 실행 (권장)
npm install -g pm2
pm2 start dist/index.js --name "aicc-backend"
pm2 save
pm2 startup
```

## 🎨 프론트엔드 배포

### 1. 프론트엔드 빌드

```bash
# 프론트엔드 디렉토리로 이동
cd ../frontend

# 의존성 설치
npm ci

# 프로덕션 환경 변수 설정
cp env.production.example .env.production
nano .env.production
```

**프론트엔드 환경 변수:**
```env
VITE_API_BASE_URL=http://your-domain.com:3001
VITE_ENABLE_MOCK_DATA=false
VITE_APP_ENV=production
```

### 2. 빌드 실행

```bash
# 프로덕션 빌드
npm run build
```

### 3. Nginx 설정

```bash
# Nginx 설치
sudo apt install nginx

# 사이트 설정 파일 생성
sudo nano /etc/nginx/sites-available/aicc-ops
```

**Nginx 설정:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 프론트엔드 정적 파일
    location / {
        root /path/to/BackOfficeWeb/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 프록시
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 4. Nginx 활성화

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/aicc-ops /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 🔐 보안 설정

### 1. SSL/TLS 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 다음 라인 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3001  # 백엔드 포트 직접 접근 차단
```

### 3. 데이터베이스 보안

```bash
# PostgreSQL 설정 파일 편집
sudo nano /etc/postgresql/13/main/postgresql.conf

# 다음 설정 적용:
# listen_addresses = 'localhost'
# ssl = on
# log_connections = on
# log_disconnections = on

# pg_hba.conf 편집
sudo nano /etc/postgresql/13/main/pg_hba.conf

# 로컬 연결만 허용하도록 설정
```

## 📊 모니터링 설정

### 1. 시스템 모니터링

```bash
# htop 설치
sudo apt install htop

# 시스템 리소스 모니터링 스크립트 생성
cat > /usr/local/bin/system-monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status $(date) ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
echo "Active Connections: $(netstat -an | grep :3001 | grep ESTABLISHED | wc -l)"
EOF

chmod +x /usr/local/bin/system-monitor.sh
```

### 2. 애플리케이션 모니터링

```bash
# PM2 모니터링 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# 로그 확인
pm2 logs aicc-backend
```

### 3. 데이터베이스 모니터링

```sql
-- 활성 연결 수 확인
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 느린 쿼리 로깅 활성화
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

## 🚀 Docker를 이용한 배포 (권장)

### 1. Docker Compose 실행

```bash
# 프로덕션 환경 변수 설정
cp .env.example .env.production
nano .env.production

# Docker Compose로 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. 데이터베이스 초기화 (Docker 환경)

```bash
# 데이터베이스 컨테이너에서 스키마 적용
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d aicc_ops_platform -f /docker-entrypoint-initdb.d/production-schema.sql

# 초기 데이터 삽입
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d aicc_ops_platform -f /docker-entrypoint-initdb.d/initial-data.sql
```

## 🔧 문제 해결

### 1. 일반적인 문제들

**데이터베이스 연결 오류:**
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -p 5432 -U aicc_admin -d aicc_ops_platform -c "SELECT 1;"
```

**백엔드 서비스 오류:**
```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs aicc-backend --lines 100

# 서비스 재시작
pm2 restart aicc-backend
```

**프론트엔드 404 오류:**
```bash
# Nginx 상태 확인
sudo systemctl status nginx

# 설정 테스트
sudo nginx -t

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 2. 성능 최적화

**데이터베이스 최적화:**
```sql
-- 인덱스 사용률 확인
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public';

-- 자주 사용되는 쿼리 최적화
EXPLAIN ANALYZE SELECT * FROM users WHERE role = 'admin';
```

**메모리 최적화:**
```bash
# Node.js 힙 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart aicc-backend
```

## 📞 지원 및 연락처

문제 발생 시 다음 정보를 포함하여 문의하세요:

1. **시스템 정보**: OS, Node.js 버전, PostgreSQL 버전
2. **오류 로그**: 백엔드, 프론트엔드, 데이터베이스 로그
3. **재현 단계**: 문제 발생까지의 단계별 설명
4. **환경 설정**: 환경 변수 및 설정 파일 (민감한 정보 제외)

---

## ✅ 배포 체크리스트

- [ ] PostgreSQL 설치 및 설정 완료
- [ ] 데이터베이스 스키마 및 초기 데이터 적용
- [ ] 백엔드 빌드 및 배포 완료
- [ ] 프론트엔드 빌드 및 Nginx 설정 완료
- [ ] SSL/TLS 인증서 설정
- [ ] 방화벽 및 보안 설정
- [ ] 모니터링 도구 설정
- [ ] 백업 전략 수립
- [ ] 기본 관리자 계정 패스워드 변경
- [ ] 시스템 성능 테스트 완료

**🎉 배포 완료 후 http://your-domain.com 으로 접속하여 정상 작동을 확인하세요!**
