#!/bin/bash
# [advice from AI] AICC Operations Platform Kubernetes 배포 검증 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="aicc-ops-platform"
PASSED=0
FAILED=0

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[CHECK]${NC} $1"; }

check_pass() {
    echo -e "${GREEN}✓ PASS${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC} $1"
    ((FAILED++))
}

echo "AICC Operations Platform 배포 검증"
echo "=================================="
echo

# 1. Docker 이미지 빌드 성공 확인
log_step "Docker 이미지 빌드 확인"
if docker images | grep -q "aicc/ops-backend.*latest"; then
    check_pass "Backend 이미지 빌드 성공"
else
    check_fail "Backend 이미지가 없습니다"
fi

if docker images | grep -q "aicc/ops-frontend.*latest"; then
    check_pass "Frontend 이미지 빌드 성공"
else
    check_fail "Frontend 이미지가 없습니다"
fi

# 이미지 크기 확인
BACKEND_SIZE=$(docker images aicc/ops-backend:latest --format "table {{.Size}}" | tail -1)
FRONTEND_SIZE=$(docker images aicc/ops-frontend:latest --format "table {{.Size}}" | tail -1)
log_info "Backend 이미지 크기: $BACKEND_SIZE"
log_info "Frontend 이미지 크기: $FRONTEND_SIZE"

echo

# 2. Kubernetes 리소스 확인
log_step "Kubernetes 리소스 상태 확인"

# 네임스페이스 확인
if kubectl get namespace $NAMESPACE &>/dev/null; then
    check_pass "네임스페이스 '$NAMESPACE' 존재"
else
    check_fail "네임스페이스 '$NAMESPACE'가 없습니다"
fi

# ConfigMap 확인
if kubectl get configmap aicc-ops-config -n $NAMESPACE &>/dev/null; then
    check_pass "ConfigMap 'aicc-ops-config' 존재"
else
    check_fail "ConfigMap 'aicc-ops-config'가 없습니다"
fi

# Secret 확인
if kubectl get secret aicc-ops-secrets -n $NAMESPACE &>/dev/null; then
    check_pass "Secret 'aicc-ops-secrets' 존재"
else
    check_fail "Secret 'aicc-ops-secrets'가 없습니다"
fi

# ServiceAccount 확인
if kubectl get serviceaccount aicc-ops-service-account -n $NAMESPACE &>/dev/null; then
    check_pass "ServiceAccount 'aicc-ops-service-account' 존재"
else
    check_fail "ServiceAccount 'aicc-ops-service-account'가 없습니다"
fi

echo

# 3. 배포 상태 확인
log_step "배포 상태 확인"

# Backend 배포 확인
BACKEND_READY=$(kubectl get deployment aicc-ops-backend -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
BACKEND_DESIRED=$(kubectl get deployment aicc-ops-backend -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

if [ "$BACKEND_READY" = "$BACKEND_DESIRED" ] && [ "$BACKEND_READY" != "0" ]; then
    check_pass "Backend 배포 ($BACKEND_READY/$BACKEND_DESIRED) 정상"
else
    check_fail "Backend 배포 ($BACKEND_READY/$BACKEND_DESIRED) 비정상"
fi

# Frontend 배포 확인
FRONTEND_READY=$(kubectl get deployment aicc-ops-frontend -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
FRONTEND_DESIRED=$(kubectl get deployment aicc-ops-frontend -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

if [ "$FRONTEND_READY" = "$FRONTEND_DESIRED" ] && [ "$FRONTEND_READY" != "0" ]; then
    check_pass "Frontend 배포 ($FRONTEND_READY/$FRONTEND_DESIRED) 정상"
else
    check_fail "Frontend 배포 ($FRONTEND_READY/$FRONTEND_DESIRED) 비정상"
fi

echo

# 4. 서비스 확인
log_step "서비스 상태 확인"

# Backend 서비스
if kubectl get service aicc-ops-backend-service -n $NAMESPACE &>/dev/null; then
    BACKEND_PORT=$(kubectl get service aicc-ops-backend-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    if [ "$BACKEND_PORT" = "6000" ]; then
        check_pass "Backend 서비스 (포트 $BACKEND_PORT) 정상"
    else
        check_fail "Backend 서비스 포트가 6000이 아닙니다: $BACKEND_PORT"
    fi
else
    check_fail "Backend 서비스가 없습니다"
fi

# Frontend 서비스
if kubectl get service aicc-ops-frontend-service -n $NAMESPACE &>/dev/null; then
    FRONTEND_PORT=$(kubectl get service aicc-ops-frontend-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    if [ "$FRONTEND_PORT" = "6001" ]; then
        check_pass "Frontend 서비스 (포트 $FRONTEND_PORT) 정상"
    else
        check_fail "Frontend 서비스 포트가 6001이 아닙니다: $FRONTEND_PORT"
    fi
else
    check_fail "Frontend 서비스가 없습니다"
fi

echo

# 5. 헬스체크 확인
log_step "헬스체크 확인"

# Backend 헬스체크
if kubectl exec -n $NAMESPACE deployment/aicc-ops-backend -- wget -q --spider http://localhost:6000/api/health 2>/dev/null; then
    check_pass "Backend 헬스체크 (/api/health) 성공"
else
    check_fail "Backend 헬스체크 실패"
fi

# Frontend 헬스체크
if kubectl exec -n $NAMESPACE deployment/aicc-ops-frontend -- wget -q --spider http://localhost:6001/health 2>/dev/null; then
    check_pass "Frontend 헬스체크 (/health) 성공"
else
    check_fail "Frontend 헬스체크 실패"
fi

echo

# 6. CORS 설정 확인
log_step "CORS 설정 확인"

# ConfigMap에서 CORS 설정 확인
CORS_ORIGIN=$(kubectl get configmap aicc-ops-config -n $NAMESPACE -o jsonpath='{.data.CORS_ORIGIN}' 2>/dev/null)
if [ "$CORS_ORIGIN" = "https://ops.aicc.co.kr" ]; then
    check_pass "CORS Origin 설정 정상: $CORS_ORIGIN"
else
    check_fail "CORS Origin 설정 확인 필요: $CORS_ORIGIN"
fi

echo

# 7. Rate Limiting 설정 확인
log_step "Rate Limiting 설정 확인"

RATE_LIMIT=$(kubectl get configmap aicc-ops-config -n $NAMESPACE -o jsonpath='{.data.RATE_LIMIT_MAX_REQUESTS}' 2>/dev/null)
if [ "$RATE_LIMIT" = "100" ]; then
    check_pass "Rate Limit 설정 정상: $RATE_LIMIT requests/window"
else
    check_fail "Rate Limit 설정 확인 필요: $RATE_LIMIT"
fi

echo

# 8. 암호화 설정 확인
log_step "암호화 설정 확인"

# Secret에서 암호화 키 존재 확인 (값은 확인하지 않음)
if kubectl get secret aicc-ops-secrets -n $NAMESPACE -o jsonpath='{.data.encryption-key}' &>/dev/null; then
    check_pass "암호화 키 설정됨"
else
    check_fail "암호화 키가 설정되지 않음"
fi

if kubectl get secret aicc-ops-secrets -n $NAMESPACE -o jsonpath='{.data.jwt-secret}' &>/dev/null; then
    check_pass "JWT Secret 설정됨"
else
    check_fail "JWT Secret이 설정되지 않음"
fi

echo

# 9. Ingress 확인
log_step "Ingress 설정 확인"

if kubectl get ingress aicc-ops-ingress -n $NAMESPACE &>/dev/null; then
    check_pass "Ingress 'aicc-ops-ingress' 존재"
    
    # TLS 설정 확인
    TLS_SECRET=$(kubectl get ingress aicc-ops-ingress -n $NAMESPACE -o jsonpath='{.spec.tls[0].secretName}' 2>/dev/null)
    if [ "$TLS_SECRET" = "aicc-ops-tls" ]; then
        check_pass "TLS 설정 정상: $TLS_SECRET"
    else
        check_fail "TLS 설정 확인 필요: $TLS_SECRET"
    fi
else
    check_fail "Ingress가 없습니다"
fi

echo

# 10. RBAC 권한 확인
log_step "RBAC 권한 확인"

# ServiceAccount가 Pod에서 Kubernetes API에 접근할 수 있는지 확인
if kubectl auth can-i get pods --as=system:serviceaccount:$NAMESPACE:aicc-ops-service-account -n $NAMESPACE &>/dev/null; then
    check_pass "ServiceAccount Kubernetes API 접근 권한 정상"
else
    check_fail "ServiceAccount Kubernetes API 접근 권한 없음"
fi

echo

# 11. 리소스 제한 확인
log_step "리소스 제한 확인"

# Backend 리소스 제한
BACKEND_CPU_LIMIT=$(kubectl get deployment aicc-ops-backend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}' 2>/dev/null)
BACKEND_MEM_LIMIT=$(kubectl get deployment aicc-ops-backend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}' 2>/dev/null)

if [ -n "$BACKEND_CPU_LIMIT" ] && [ -n "$BACKEND_MEM_LIMIT" ]; then
    check_pass "Backend 리소스 제한 설정: CPU=$BACKEND_CPU_LIMIT, Memory=$BACKEND_MEM_LIMIT"
else
    check_fail "Backend 리소스 제한이 설정되지 않음"
fi

# Frontend 리소스 제한
FRONTEND_CPU_LIMIT=$(kubectl get deployment aicc-ops-frontend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}' 2>/dev/null)
FRONTEND_MEM_LIMIT=$(kubectl get deployment aicc-ops-frontend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}' 2>/dev/null)

if [ -n "$FRONTEND_CPU_LIMIT" ] && [ -n "$FRONTEND_MEM_LIMIT" ]; then
    check_pass "Frontend 리소스 제한 설정: CPU=$FRONTEND_CPU_LIMIT, Memory=$FRONTEND_MEM_LIMIT"
else
    check_fail "Frontend 리소스 제한이 설정되지 않음"
fi

echo

# 12. 최종 결과
log_step "검증 결과 요약"
echo "=================================="
echo -e "통과: ${GREEN}$PASSED${NC}"
echo -e "실패: ${RED}$FAILED${NC}"
echo -e "총계: $((PASSED + FAILED))"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 검증이 통과했습니다!${NC}"
    echo -e "${GREEN}프로덕션 배포 준비가 완료되었습니다.${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED개의 검증이 실패했습니다.${NC}"
    echo -e "${RED}실패한 항목들을 수정한 후 다시 검증해주세요.${NC}"
    exit 1
fi
