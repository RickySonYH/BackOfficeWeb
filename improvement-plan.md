# AICC Operations Platform 개선 계획

## Phase 1: 원자적 회사 생성 프로세스 (1-2주)

### 1.1 새로운 회사 생성 서비스 구현
```typescript
// backend/src/services/company-lifecycle.service.ts
export class CompanyLifecycleService {
  async createCompleteCompany(data: CreateCompanyRequest): Promise<CompleteCompanyResponse> {
    const transaction = await pool.connect();
    try {
      await transaction.query('BEGIN');
      
      // 1. 회사 생성
      const company = await this.createCompany(transaction, data);
      
      // 2. 기본 테넌트 자동 생성
      const tenant = await this.createDefaultTenant(transaction, company);
      
      // 3. 기본 워크스페이스 생성 (KMS + Advisor)
      const workspaces = await this.createDefaultWorkspaces(transaction, tenant);
      
      // 4. 기본 관리자 계정 생성
      const adminUser = await this.createDefaultAdmin(transaction, tenant, data.adminEmail);
      
      // 5. Kubernetes 네임스페이스 생성
      await this.createKubernetesResources(tenant);
      
      await transaction.query('COMMIT');
      
      return {
        company,
        tenant,
        workspaces,
        adminUser
      };
    } catch (error) {
      await transaction.query('ROLLBACK');
      throw error;
    }
  }
}
```

### 1.2 데이터베이스 스키마 개선
```sql
-- 기본 워크스페이스 템플릿 테이블
CREATE TABLE workspace_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    default_config JSONB NOT NULL,
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 회사 생성 시 자동 적용되는 기본 템플릿
INSERT INTO workspace_templates VALUES
('00000000-0000-0000-0000-000000000001', 'Default KMS', 'KMS', 
 '{"knowledge_sources": [], "indexing_enabled": true, "auto_learning": false}', true),
('00000000-0000-0000-0000-000000000002', 'Default Advisor', 'ADVISOR', 
 '{"response_templates": [], "escalation_rules": [], "sentiment_analysis": true}', true);
```

## Phase 2: 배포 솔루션 관리 시스템 (2-3주)

### 2.1 배포 솔루션 추적 시스템
```typescript
// backend/src/services/solution-deployment.service.ts
export class SolutionDeploymentService {
  async registerDeployedSolution(data: DeployedSolutionData): Promise<DeployedSolution> {
    // 배포된 솔루션 등록
    // 하드웨어 스펙 및 리소스 제한 설정
    // 테넌트 할당 가능 여부 체크
  }
  
  async assignTenantToSolution(tenantId: string, solutionId: string): Promise<void> {
    // 테넌트를 특정 솔루션에 할당
    // 리소스 할당량 계산 및 적용
    // Kubernetes 리소스 쿼터 업데이트
  }
  
  async getOptimalSolutionForTenant(tenantRequirements: TenantRequirements): Promise<string> {
    // 테넌트 요구사항에 맞는 최적 솔루션 찾기
    // 리소스 사용률 기반 추천
  }
}
```

### 2.2 리소스 모니터링 및 할당
```typescript
// backend/src/services/resource-monitor.service.ts
export class ResourceMonitorService {
  async getResourceUsage(solutionId: string): Promise<ResourceUsage> {
    // Kubernetes 메트릭 수집
    // 실시간 리소스 사용률 조회
  }
  
  async predictResourceNeeds(tenantId: string): Promise<ResourcePrediction> {
    // 테넌트별 리소스 사용 패턴 분석
    // 미래 리소스 요구량 예측
  }
}
```

## Phase 3: 고급 설정 관리 시스템 (2-3주)

### 3.1 구조화된 설정 관리
```typescript
// backend/src/services/configuration-management.service.ts
export class ConfigurationManagementService {
  async applyConfiguration(workspaceId: string, configType: string, config: any): Promise<void> {
    // 설정 검증
    // 버전 관리
    // 롤백 기능
    // 배포된 솔루션에 실시간 적용
  }
  
  async getConfigurationHistory(workspaceId: string): Promise<ConfigHistory[]> {
    // 설정 변경 히스토리 조회
    // 변경 사유 및 담당자 추적
  }
  
  async rollbackConfiguration(workspaceId: string, version: number): Promise<void> {
    // 이전 설정으로 롤백
    // 영향도 분석
  }
}
```

### 3.2 지식 정보 및 학습 데이터 관리
```typescript
// backend/src/services/knowledge-management.service.ts
export class KnowledgeManagementService {
  async uploadKnowledgeData(workspaceId: string, files: File[]): Promise<UploadResult> {
    // 파일 검증 및 파싱
    // 중복 데이터 체크
    // 벡터 DB 인덱싱
    // 배포된 솔루션에 실시간 반영
  }
  
  async syncKnowledgeToSolution(workspaceId: string, solutionId: string): Promise<void> {
    // 지식 데이터를 배포된 솔루션에 동기화
    // 인크리멘탈 업데이트 지원
  }
}
```

## Phase 4: ECP 연동 및 권한 관리 강화 (1-2주)

### 4.1 세밀한 권한 제어
```typescript
// backend/src/services/permission-management.service.ts
export class PermissionManagementService {
  async assignWorkspacePermission(userId: string, workspaceId: string, permissions: Permission[]): Promise<void> {
    // 워크스페이스별 세밀한 권한 할당
    // ECP 역할과 내부 권한 매핑
  }
  
  async syncECPUserPermissions(ecpUserId: string): Promise<void> {
    // ECP에서 변경된 사용자 정보 동기화
    // 권한 변경사항 실시간 반영
  }
}
```

## Phase 5: 통합 대시보드 및 모니터링 (1주)

### 5.1 실시간 모니터링 대시보드
```typescript
// frontend/src/pages/IntegratedDashboard.tsx
- 배포된 솔루션별 상태 모니터링
- 테넌트별 리소스 사용률 시각화
- 설정 변경 및 배포 현황 추적
- 사용자 활동 및 권한 변경 로그
```

## 예상 일정 및 우선순위

| Phase | 기간 | 우선순위 | 담당 |
|-------|------|----------|------|
| Phase 1 | 1-2주 | CRITICAL | Backend + Frontend |
| Phase 2 | 2-3주 | HIGH | Backend + DevOps |
| Phase 3 | 2-3주 | HIGH | Backend + Frontend |
| Phase 4 | 1-2주 | MEDIUM | Backend |
| Phase 5 | 1주 | LOW | Frontend |

**총 예상 기간: 7-11주**

## 즉시 시작 가능한 개선사항

1. **회사 생성 프로세스 개선** (즉시 시작 가능)
2. **기본 워크스페이스 자동 생성** (즉시 시작 가능)
3. **배포 솔루션 테이블 추가** (즉시 시작 가능)
4. **설정 히스토리 테이블 추가** (즉시 시작 가능)

## 성공 지표

- 회사 등록 시 테넌트+워크스페이스 자동 생성률: 100%
- 배포된 솔루션 리소스 사용률 가시성: 실시간
- 설정 변경 추적률: 100%
- ECP 사용자 권한 동기화 지연시간: < 5분
