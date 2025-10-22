#!/bin/bash
# [advice from AI] AICC Operations Platform Kubernetes 배포 스크립트

set -e  # 에러 발생 시 스크립트 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 변수 설정
NAMESPACE="aicc-ops-platform"
BACKEND_IMAGE="aicc/ops-backend:latest"
FRONTEND_IMAGE="aicc/ops-frontend:latest"
TIMEOUT="300s"

# 함수 정의
check_prerequisites() {
    log_step "Prerequisites 확인 중..."
    
    # kubectl 확인
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl이 설치되어 있지 않습니다."
        exit 1
    fi
    
    # 클러스터 연결 확인
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Kubernetes 클러스터에 연결할 수 없습니다."
        exit 1
    fi
    
    # 현재 컨텍스트 확인
    CURRENT_CONTEXT=$(kubectl config current-context)
    log_info "현재 컨텍스트: $CURRENT_CONTEXT"
    
    # 확인 프롬프트
    read -p "이 컨텍스트에 배포하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "배포가 취소되었습니다."
        exit 0
    fi
}

create_namespace() {
    log_step "네임스페이스 생성 중..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warn "네임스페이스 '$NAMESPACE'가 이미 존재합니다."
    else
        kubectl apply -f namespace.yaml
        log_info "네임스페이스 '$NAMESPACE' 생성 완료"
    fi
}

check_secrets() {
    log_step "Secret 설정 확인 중..."
    
    # secret.yaml에서 기본값 확인
    if grep -q "eW91cl9zdXBlcl9zZWNyZXRfand0X2tleV9oZXJl" secret.yaml; then
        log_error "secret.yaml의 기본값을 실제 값으로 변경해야 합니다!"
        log_error "다음 명령으로 base64 인코딩된 값을 생성하세요:"
        log_error "echo -n 'your_secret_value' | base64"
        exit 1
    fi
    
    log_info "Secret 설정이 올바르게 구성되어 있습니다."
}

deploy_configs() {
    log_step "ConfigMap과 Secret 배포 중..."
    
    kubectl apply -f configmap.yaml
    kubectl apply -f secret.yaml
    
    log_info "ConfigMap과 Secret 배포 완료"
}

deploy_rbac() {
    log_step "RBAC 설정 배포 중..."
    
    kubectl apply -f rbac.yaml
    
    log_info "RBAC 설정 배포 완료"
}

deploy_backend() {
    log_step "Backend 서비스 배포 중..."
    
    kubectl apply -f deployment-backend.yaml
    kubectl apply -f service-backend.yaml
    
    # 배포 상태 확인
    kubectl rollout status deployment/aicc-ops-backend -n $NAMESPACE --timeout=$TIMEOUT
    
    log_info "Backend 서비스 배포 완료"
}

deploy_frontend() {
    log_step "Frontend 서비스 배포 중..."
    
    kubectl apply -f deployment-frontend.yaml
    kubectl apply -f service-frontend.yaml
    
    # 배포 상태 확인
    kubectl rollout status deployment/aicc-ops-frontend -n $NAMESPACE --timeout=$TIMEOUT
    
    log_info "Frontend 서비스 배포 완료"
}

deploy_ingress() {
    log_step "Ingress 배포 중..."
    
    # Ingress Controller 확인
    if ! kubectl get ingressclass nginx &> /dev/null; then
        log_warn "Nginx Ingress Controller가 설치되어 있지 않습니다."
        log_warn "다음 명령으로 설치하세요: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml"
        read -p "Ingress 배포를 건너뛰시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    kubectl apply -f ingress.yaml
    
    log_info "Ingress 배포 완료"
}

check_health() {
    log_step "헬스체크 수행 중..."
    
    # Backend 헬스체크
    log_info "Backend 헬스체크 중..."
    for i in {1..30}; do
        if kubectl exec -n $NAMESPACE deployment/aicc-ops-backend -- wget -q --spider http://localhost:6000/api/health; then
            log_info "Backend 헬스체크 성공"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Backend 헬스체크 실패"
            return 1
        fi
        sleep 10
    done
    
    # Frontend 헬스체크
    log_info "Frontend 헬스체크 중..."
    for i in {1..30}; do
        if kubectl exec -n $NAMESPACE deployment/aicc-ops-frontend -- wget -q --spider http://localhost:6001/health; then
            log_info "Frontend 헬스체크 성공"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Frontend 헬스체크 실패"
            return 1
        fi
        sleep 10
    done
}

show_status() {
    log_step "배포 상태 확인 중..."
    
    echo
    log_info "=== Pod 상태 ==="
    kubectl get pods -n $NAMESPACE -o wide
    
    echo
    log_info "=== Service 상태 ==="
    kubectl get svc -n $NAMESPACE
    
    echo
    log_info "=== Ingress 상태 ==="
    kubectl get ingress -n $NAMESPACE
    
    echo
    log_info "=== 리소스 사용량 ==="
    kubectl top pods -n $NAMESPACE 2>/dev/null || log_warn "Metrics server가 설치되어 있지 않습니다."
}

show_access_info() {
    log_step "접근 정보 표시 중..."
    
    echo
    log_info "=== 접근 방법 ==="
    
    # NodePort 서비스 URL
    if command -v minikube &> /dev/null && minikube status &> /dev/null; then
        BACKEND_URL=$(minikube service aicc-ops-backend-nodeport -n $NAMESPACE --url 2>/dev/null || echo "N/A")
        FRONTEND_URL=$(minikube service aicc-ops-frontend-nodeport -n $NAMESPACE --url 2>/dev/null || echo "N/A")
        
        echo "Minikube 환경:"
        echo "  Frontend: $FRONTEND_URL"
        echo "  Backend:  $BACKEND_URL/api/health"
    fi
    
    # 포트 포워딩 명령
    echo
    echo "포트 포워딩 명령:"
    echo "  kubectl port-forward -n $NAMESPACE service/aicc-ops-frontend-service 6001:6001"
    echo "  kubectl port-forward -n $NAMESPACE service/aicc-ops-backend-service 6000:6000"
    
    # Ingress 정보
    INGRESS_IP=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$INGRESS_IP" ]; then
        echo
        echo "Ingress 접근:"
        echo "  https://ops.aicc.co.kr (IP: $INGRESS_IP)"
        echo "  https://api.ops.aicc.co.kr (IP: $INGRESS_IP)"
    fi
}

cleanup() {
    log_step "정리 작업 수행 중..."
    
    read -p "네임스페이스 '$NAMESPACE'를 삭제하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace $NAMESPACE
        log_info "네임스페이스 '$NAMESPACE' 삭제 완료"
    fi
}

# 메인 실행 로직
main() {
    echo "AICC Operations Platform Kubernetes 배포 스크립트"
    echo "================================================"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_namespace
            check_secrets
            deploy_configs
            deploy_rbac
            deploy_backend
            deploy_frontend
            deploy_ingress
            check_health
            show_status
            show_access_info
            log_info "배포가 완료되었습니다!"
            ;;
        "status")
            show_status
            show_access_info
            ;;
        "cleanup")
            cleanup
            ;;
        "health")
            check_health
            ;;
        *)
            echo "사용법: $0 [deploy|status|cleanup|health]"
            echo "  deploy:  전체 배포 수행 (기본값)"
            echo "  status:  현재 상태 확인"
            echo "  cleanup: 리소스 정리"
            echo "  health:  헬스체크 수행"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
