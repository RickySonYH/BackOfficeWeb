#!/bin/bash
# [advice from AI] 프로덕션 데이터베이스 설정 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 설정
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-aicc_ops_platform}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres123}
PGPASSWORD=$DB_PASSWORD

export PGPASSWORD

# PostgreSQL 연결 테스트
test_connection() {
    log_info "PostgreSQL 연결 테스트 중..."
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "PostgreSQL 연결 성공"
        return 0
    else
        log_error "PostgreSQL 연결 실패"
        return 1
    fi
}

# 데이터베이스 생성
create_database() {
    log_info "데이터베이스 생성 중: $DB_NAME"
    
    # 데이터베이스가 이미 존재하는지 확인
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log_warning "데이터베이스 '$DB_NAME'가 이미 존재합니다."
        read -p "기존 데이터베이스를 삭제하고 다시 생성하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "기존 데이터베이스 삭제 중..."
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
            log_success "기존 데이터베이스 삭제 완료"
        else
            log_info "기존 데이터베이스를 유지합니다."
            return 0
        fi
    fi
    
    # 데이터베이스 생성
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    log_success "데이터베이스 '$DB_NAME' 생성 완료"
}

# 스키마 적용
apply_schema() {
    log_info "데이터베이스 스키마 적용 중..."
    
    if [ ! -f "database/production-schema.sql" ]; then
        log_error "스키마 파일을 찾을 수 없습니다: database/production-schema.sql"
        exit 1
    fi
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/production-schema.sql
    log_success "데이터베이스 스키마 적용 완료"
}

# 초기 데이터 삽입
insert_initial_data() {
    log_info "초기 데이터 삽입 중..."
    
    if [ ! -f "database/initial-data.sql" ]; then
        log_error "초기 데이터 파일을 찾을 수 없습니다: database/initial-data.sql"
        exit 1
    fi
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/initial-data.sql
    log_success "초기 데이터 삽입 완료"
}

# 데이터베이스 상태 확인
check_database_status() {
    log_info "데이터베이스 상태 확인 중..."
    
    # 테이블 수 확인
    TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log_info "생성된 테이블 수: $TABLE_COUNT"
    
    # 기본 사용자 확인
    USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;")
    log_info "등록된 사용자 수: $USER_COUNT"
    
    # 권한 수 확인
    PERMISSION_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM permissions;")
    log_info "설정된 권한 수: $PERMISSION_COUNT"
    
    # 역할 수 확인
    ROLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM roles;")
    log_info "설정된 역할 수: $ROLE_COUNT"
    
    log_success "데이터베이스 상태 확인 완료"
}

# 메인 실행 함수
main() {
    log_info "AICC Operations Platform 데이터베이스 설정 시작"
    log_info "데이터베이스: $DB_HOST:$DB_PORT/$DB_NAME"
    log_info "사용자: $DB_USER"
    echo
    
    # PostgreSQL 연결 테스트
    if ! test_connection; then
        log_error "PostgreSQL에 연결할 수 없습니다. 설정을 확인하세요."
        exit 1
    fi
    
    # 데이터베이스 생성
    create_database
    
    # 스키마 적용
    apply_schema
    
    # 초기 데이터 삽입
    insert_initial_data
    
    # 상태 확인
    check_database_status
    
    echo
    log_success "데이터베이스 설정이 완료되었습니다!"
    log_info "기본 관리자 계정:"
    log_info "  - 사용자명: admin"
    log_info "  - 이메일: admin@aicc-ops.com"
    log_info "  - 패스워드: admin123!"
    log_warning "프로덕션 환경에서는 반드시 기본 패스워드를 변경하세요!"
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
