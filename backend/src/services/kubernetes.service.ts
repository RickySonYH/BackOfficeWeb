// [advice from AI] Kubernetes 관리 서비스
import { kubernetesClient } from '../config/kubernetes';
import { logger } from '../config/logger';
import * as k8s from '@kubernetes/client-node';

// [advice from AI] 네임스페이스 생성 옵션 인터페이스
interface CreateNamespaceOptions {
  tenantKey: string;
  companyName?: string;
  resourceLimits?: {
    cpu: string;
    memory: string;
  };
  enableNetworkPolicy?: boolean;
}

// [advice from AI] 네임스페이스 상태 인터페이스
interface NamespaceStatus {
  exists: boolean;
  phase?: string;
  podCount: number;
  serviceCount: number;
  deploymentCount: number;
  resourceQuotaExists: boolean;
  networkPolicyExists: boolean;
}

// [advice from AI] Kubernetes 서비스 클래스
export class KubernetesService {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private networkingApi: k8s.NetworkingV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      // [advice from AI] Kubernetes 설정 로드 (클러스터 내부 또는 kubeconfig)
      if (process.env.KUBERNETES_SERVICE_HOST) {
        // 클러스터 내부에서 실행 중
        this.kc.loadFromCluster();
        logger.info('Loaded Kubernetes config from cluster');
      } else {
        // 로컬 환경에서 kubeconfig 사용
        this.kc.loadFromDefault();
        logger.info('Loaded Kubernetes config from default kubeconfig');
      }
      
      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    } catch (error) {
      logger.error('Failed to initialize Kubernetes client:', error);
    }
  }

  // [advice from AI] 네임스페이스 생성
  async createNamespace(tenantKey: string): Promise<{
    success: boolean;
    namespaceName?: string;
    error?: string;
  }> {
    try {
      const namespaceName = this.generateNamespaceName(tenantKey);
      
      logger.info(`Creating namespace for tenant: ${tenantKey}`, { namespaceName });

      // [advice from AI] 네임스페이스 이미 존재 확인
      const exists = await this.namespaceExists(namespaceName);
      if (exists) {
        logger.warn(`Namespace already exists: ${namespaceName}`);
        return {
          success: true, // 이미 존재하는 경우도 성공으로 처리
          namespaceName
        };
      }

      // [advice from AI] 네임스페이스 생성
      const namespace: k8s.V1Namespace = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: namespaceName,
          labels: {
            'aicc.io/tenant-key': tenantKey,
            'aicc.io/managed-by': 'aicc-ops-platform',
            'aicc.io/created-at': new Date().toISOString()
          },
          annotations: {
            'aicc.io/tenant-key': tenantKey,
            'aicc.io/description': `Namespace for tenant ${tenantKey}`
          }
        }
      };

      await this.k8sApi.createNamespace(namespace);
      logger.info(`Namespace created successfully: ${namespaceName}`);

      // [advice from AI] 기본 리소스 쿼터 생성
      await this.createResourceQuota(namespaceName);

      // [advice from AI] 네트워크 정책 생성 (테넌트 격리)
      await this.createNetworkPolicy(namespaceName);

      return {
        success: true,
        namespaceName
      };

    } catch (error) {
      logger.error('Failed to create namespace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] 리소스 쿼터 생성
  private async createResourceQuota(namespaceName: string): Promise<boolean> {
    try {
      const resourceQuota: k8s.V1ResourceQuota = {
        apiVersion: 'v1',
        kind: 'ResourceQuota',
        metadata: {
          name: 'tenant-resource-quota',
          namespace: namespaceName,
          labels: {
            'aicc.io/managed-by': 'aicc-ops-platform'
          }
        },
        spec: {
          hard: {
            'requests.cpu': '2',
            'requests.memory': '4Gi',
            'limits.cpu': '4',
            'limits.memory': '8Gi',
            'persistentvolumeclaims': '10',
            'services': '20',
            'secrets': '20',
            'configmaps': '20',
            'pods': '50'
          }
        }
      };

      await this.k8sApi.createNamespacedResourceQuota(namespaceName, resourceQuota);
      logger.info(`Resource quota created for namespace: ${namespaceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create resource quota for ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네트워크 정책 생성 (테넌트 격리)
  private async createNetworkPolicy(namespaceName: string): Promise<boolean> {
    try {
      const networkPolicy: k8s.V1NetworkPolicy = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'NetworkPolicy',
        metadata: {
          name: 'tenant-isolation-policy',
          namespace: namespaceName,
          labels: {
            'aicc.io/managed-by': 'aicc-ops-platform'
          }
        },
        spec: {
          podSelector: {}, // 모든 Pod에 적용
          policyTypes: ['Ingress', 'Egress'],
          ingress: [
            {
              // 같은 네임스페이스 내에서의 통신 허용
              from: [
                {
                  namespaceSelector: {
                    matchLabels: {
                      name: namespaceName
                    }
                  }
                }
              ]
            },
            {
              // 시스템 네임스페이스에서의 접근 허용 (모니터링 등)
              from: [
                {
                  namespaceSelector: {
                    matchLabels: {
                      name: 'kube-system'
                    }
                  }
                }
              ]
            }
          ],
          egress: [
            {
              // DNS 조회 허용
              to: [
                {
                  namespaceSelector: {
                    matchLabels: {
                      name: 'kube-system'
                    }
                  }
                }
              ],
              ports: [
                {
                  protocol: 'UDP',
                  port: 53 as any
                }
              ]
            },
            {
              // 외부 인터넷 접근 허용
              to: []
            }
          ]
        }
      };

      await this.networkingApi.createNamespacedNetworkPolicy(namespaceName, networkPolicy);
      logger.info(`Network policy created for namespace: ${namespaceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create network policy for ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네임스페이스 상태 조회
  async getNamespaceStatus(namespaceName: string): Promise<NamespaceStatus> {
    try {
      // [advice from AI] 네임스페이스 존재 확인
      const exists = await this.namespaceExists(namespaceName);
      
      if (!exists) {
        return {
          exists: false,
          podCount: 0,
          serviceCount: 0,
          deploymentCount: 0,
          resourceQuotaExists: false,
          networkPolicyExists: false
        };
      }

      // [advice from AI] 네임스페이스 정보 조회
      const namespaceResponse = await this.k8sApi.readNamespace(namespaceName);
      const phase = namespaceResponse.body.status?.phase || 'Unknown';

      // [advice from AI] Pod 개수 조회
      const podsResponse = await this.k8sApi.listNamespacedPod(namespaceName);
      const podCount = podsResponse.body.items.length;

      // [advice from AI] Service 개수 조회
      const servicesResponse = await this.k8sApi.listNamespacedService(namespaceName);
      const serviceCount = servicesResponse.body.items.length;

      // [advice from AI] Deployment 개수 조회
      const appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
      const deploymentsResponse = await appsApi.listNamespacedDeployment(namespaceName);
      const deploymentCount = deploymentsResponse.body.items.length;

      // [advice from AI] 리소스 쿼터 존재 확인
      const resourceQuotaExists = await this.checkResourceQuotaExists(namespaceName);
      
      // [advice from AI] 네트워크 정책 존재 확인
      const networkPolicyExists = await this.checkNetworkPolicyExists(namespaceName);

      return {
        exists: true,
        phase,
        podCount,
        serviceCount,
        deploymentCount,
        resourceQuotaExists,
        networkPolicyExists
      };

    } catch (error) {
      logger.error(`Failed to get namespace status for ${namespaceName}:`, error);
      return {
        exists: false,
        podCount: 0,
        serviceCount: 0,
        deploymentCount: 0,
        resourceQuotaExists: false,
        networkPolicyExists: false
      };
    }
  }

  // [advice from AI] 네임스페이스 삭제
  async deleteNamespace(namespaceName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info(`Deleting namespace: ${namespaceName}`);

      const exists = await this.namespaceExists(namespaceName);
      if (!exists) {
        return {
          success: false,
          error: 'Namespace does not exist'
        };
      }

      // [advice from AI] 네임스페이스 삭제 (Graceful deletion)
      await this.k8sApi.deleteNamespace(namespaceName, undefined, undefined, 30); // 30초 grace period
      
      logger.info(`Namespace deletion initiated: ${namespaceName}`);
      return { success: true };

    } catch (error) {
      logger.error(`Failed to delete namespace ${namespaceName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] 네임스페이스 존재 확인
  private async namespaceExists(namespaceName: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespace(namespaceName);
      return true;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // [advice from AI] 클러스터 연결 테스트
  async testClusterConnection(): Promise<{
    connected: boolean;
    error?: string;
    clusterInfo?: any;
  }> {
    try {
      // [advice from AI] 간단한 API 호출로 연결 테스트
      const response = await this.k8sApi.listNamespace();
      
      return {
        connected: true,
        clusterInfo: {
          timestamp: new Date().toISOString(),
          status: 'Connected',
          namespaceCount: response.body.items.length,
          serverVersion: response.response.headers['server'] || 'unknown'
        }
      };

    } catch (error) {
      logger.error('Cluster connection test failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] 테넌트 키에서 네임스페이스 이름 생성
  generateNamespaceName(tenantKey: string): string {
    // [advice from AI] 테넌트 키를 Kubernetes 네임스페이스 이름 규칙에 맞게 변환
    return `aicc-${tenantKey.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50)}`;
  }

  // [advice from AI] 리소스 쿼터 존재 확인
  private async checkResourceQuotaExists(namespaceName: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespacedResourceQuota('tenant-resource-quota', namespaceName);
      return true;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        return false;
      }
      logger.debug(`Resource quota check failed for ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네트워크 정책 존재 확인
  private async checkNetworkPolicyExists(namespaceName: string): Promise<boolean> {
    try {
      await this.networkingApi.readNamespacedNetworkPolicy('tenant-isolation-policy', namespaceName);
      return true;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        return false;
      }
      logger.debug(`Network policy check failed for ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네임스페이스 목록 조회 (테넌트 관련만)
  async listTenantNamespaces(): Promise<{
    success: boolean;
    namespaces?: Array<{
      name: string;
      tenantKey?: string;
      companyName?: string;
      phase: string;
      createdAt: Date;
    }>;
    error?: string;
  }> {
    try {
      logger.info('Listing tenant namespaces');
      
      // [advice from AI] 모든 네임스페이스 조회
      const response = await this.k8sApi.listNamespace();
      
      // [advice from AI] AICC 관리 네임스페이스만 필터링
      const tenantNamespaces = response.body.items
        .filter(ns => 
          ns.metadata?.name?.startsWith('aicc-') && 
          ns.metadata?.labels?.['aicc.io/managed-by'] === 'aicc-ops-platform'
        )
        .map(ns => ({
          name: ns.metadata?.name || '',
          tenantKey: ns.metadata?.labels?.['aicc.io/tenant-key'],
          companyName: ns.metadata?.labels?.['aicc.io/company'],
          phase: ns.status?.phase || 'Unknown',
          createdAt: ns.metadata?.creationTimestamp ? new Date(ns.metadata.creationTimestamp) : new Date()
        }));

      return {
        success: true,
        namespaces: tenantNamespaces
      };

    } catch (error) {
      logger.error('Failed to list tenant namespaces:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] Pod 목록 조회 (특정 네임스페이스)
  async getNamespacePods(namespaceName: string): Promise<{
    success: boolean;
    pods?: Array<{
      name: string;
      phase: string;
      restarts: number;
      age: string;
      ready: boolean;
    }>;
    error?: string;
  }> {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespaceName);
      
      const pods = response.body.items.map(pod => {
        const restarts = pod.status?.containerStatuses?.reduce((sum, status) => sum + (status.restartCount || 0), 0) || 0;
        const createdAt = pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp) : new Date();
        const age = this.calculateAge(createdAt);
        const ready = pod.status?.conditions?.some(cond => cond.type === 'Ready' && cond.status === 'True') || false;

        return {
          name: pod.metadata?.name || '',
          phase: pod.status?.phase || 'Unknown',
          restarts,
          age,
          ready
        };
      });

      return {
        success: true,
        pods
      };

    } catch (error) {
      logger.error(`Failed to get pods for namespace ${namespaceName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // [advice from AI] 시간 차이 계산 헬퍼 함수
  private calculateAge(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return `${diffMinutes}m`;
    }
  }
}

// [advice from AI] 싱글톤 Kubernetes 서비스 인스턴스
export const kubernetesService = new KubernetesService();
