# [advice from AI] Minikube 테스트 가이드

## Minikube를 이용한 로컬 Kubernetes 테스트

### 1. Minikube 설치 및 설정

```bash
# Minikube 설치 (Ubuntu/Debian)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Docker 드라이버로 Minikube 시작
minikube start --driver=docker --cpus=4 --memory=8192 --disk-size=50g

# Minikube 상태 확인
minikube status

# kubectl 설정 확인
kubectl cluster-info
```

### 2. 필요한 애드온 활성화

```bash
# Ingress Controller 활성화
minikube addons enable ingress

# Metrics Server 활성화 (HPA 사용 시)
minikube addons enable metrics-server

# Dashboard 활성화 (선택사항)
minikube addons enable dashboard

# Storage Provisioner 확인
minikube addons list | grep storage
```

### 3. Docker 이미지 빌드 및 로드

```bash
# Minikube Docker 환경 사용
eval $(minikube docker-env)

# 백엔드 이미지 빌드
cd backend
docker build -t aicc/ops-backend:latest .

# 프론트엔드 이미지 빌드
cd ../frontend
docker build -t aicc/ops-frontend:latest .

# 이미지 확인
docker images | grep aicc
```

### 4. Secret 값 설정

```bash
# Base64 인코딩된 값들 생성
echo -n 'your_super_secret_jwt_key_here_32_chars' | base64
echo -n 'your_secure_db_password_here' | base64
echo -n 'your_32_character_encryption_key12' | base64
echo -n 'your_ecp_client_secret_here' | base64
echo -n 'your_redis_password_here' | base64

# secret.yaml 파일의 data 섹션에 위 값들 입력
```

### 5. 리소스 배포

```bash
# 네임스페이스 생성
kubectl apply -f k8s/namespace.yaml

# ConfigMap과 Secret 배포
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# RBAC 설정 배포
kubectl apply -f k8s/rbac.yaml

# 백엔드 배포
kubectl apply -f k8s/deployment-backend.yaml
kubectl apply -f k8s/service-backend.yaml

# 프론트엔드 배포
kubectl apply -f k8s/deployment-frontend.yaml
kubectl apply -f k8s/service-frontend.yaml

# Ingress 배포
kubectl apply -f k8s/ingress.yaml
```

### 6. 배포 상태 확인

```bash
# 네임스페이스의 모든 리소스 확인
kubectl get all -n aicc-ops-platform

# Pod 상태 상세 확인
kubectl get pods -n aicc-ops-platform -o wide

# Pod 로그 확인
kubectl logs -n aicc-ops-platform -l component=backend
kubectl logs -n aicc-ops-platform -l component=frontend

# Service 확인
kubectl get svc -n aicc-ops-platform

# Ingress 확인
kubectl get ingress -n aicc-ops-platform
```

### 7. 헬스체크 테스트

```bash
# 백엔드 헬스체크 (NodePort 사용)
minikube service aicc-ops-backend-nodeport -n aicc-ops-platform --url
curl $(minikube service aicc-ops-backend-nodeport -n aicc-ops-platform --url)/api/health

# 프론트엔드 헬스체크 (NodePort 사용)
minikube service aicc-ops-frontend-nodeport -n aicc-ops-platform --url
curl $(minikube service aicc-ops-frontend-nodeport -n aicc-ops-platform --url)/health

# Ingress를 통한 접근 (hosts 파일 설정 필요)
minikube ip
# /etc/hosts에 다음 추가: <minikube-ip> ops.aicc.co.kr api.ops.aicc.co.kr

# 브라우저에서 접근
echo "http://$(minikube ip)"
```

### 8. 포트 포워딩 (개발/테스트용)

```bash
# 백엔드 포트 포워딩
kubectl port-forward -n aicc-ops-platform service/aicc-ops-backend-service 6000:6000 &

# 프론트엔드 포트 포워딩
kubectl port-forward -n aicc-ops-platform service/aicc-ops-frontend-service 6001:6001 &

# 브라우저에서 접근
# Frontend: http://localhost:6001
# Backend API: http://localhost:6000/api/health
```

### 9. 리소스 모니터링

```bash
# 리소스 사용량 확인
kubectl top nodes
kubectl top pods -n aicc-ops-platform

# 이벤트 확인
kubectl get events -n aicc-ops-platform --sort-by='.lastTimestamp'

# Describe로 상세 정보 확인
kubectl describe pod -n aicc-ops-platform -l component=backend
kubectl describe pod -n aicc-ops-platform -l component=frontend
```

### 10. 트러블슈팅

#### Pod가 시작되지 않는 경우

```bash
# Pod 상태 확인
kubectl get pods -n aicc-ops-platform

# Pod 로그 확인
kubectl logs -n aicc-ops-platform <pod-name>

# Pod 이벤트 확인
kubectl describe pod -n aicc-ops-platform <pod-name>

# 이미지 Pull 문제인 경우
kubectl get events -n aicc-ops-platform | grep Pull
```

#### 서비스 연결 문제

```bash
# 서비스 엔드포인트 확인
kubectl get endpoints -n aicc-ops-platform

# 네트워크 정책 확인
kubectl get networkpolicy -n aicc-ops-platform

# DNS 확인
kubectl exec -n aicc-ops-platform <pod-name> -- nslookup aicc-ops-backend-service
```

#### 볼륨 마운트 문제

```bash
# PVC 상태 확인
kubectl get pvc -n aicc-ops-platform

# StorageClass 확인
kubectl get storageclass

# 볼륨 상세 정보
kubectl describe pvc -n aicc-ops-platform <pvc-name>
```

### 11. 정리

```bash
# 모든 리소스 삭제
kubectl delete namespace aicc-ops-platform

# Minikube 정지
minikube stop

# Minikube 삭제 (완전 정리)
minikube delete
```

### 12. 성능 테스트

```bash
# Apache Bench를 이용한 부하 테스트
ab -n 1000 -c 10 http://$(minikube ip)/api/health

# 또는 curl을 이용한 간단 테스트
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
    http://$(minikube ip)/api/health
done
```

### 13. 개발 워크플로우

```bash
# 코드 변경 후 이미지 재빌드
eval $(minikube docker-env)
cd backend && docker build -t aicc/ops-backend:latest .

# 배포 업데이트 (이미지 Pull 정책이 Always인 경우)
kubectl rollout restart deployment/aicc-ops-backend -n aicc-ops-platform

# 롤아웃 상태 확인
kubectl rollout status deployment/aicc-ops-backend -n aicc-ops-platform
```

### 14. 유용한 팁

```bash
# Minikube 대시보드 실행
minikube dashboard

# Minikube 터널 (LoadBalancer 타입 서비스 사용 시)
minikube tunnel

# 현재 컨텍스트 확인
kubectl config current-context

# Minikube 프로파일 관리
minikube profile list
minikube profile <profile-name>
```
