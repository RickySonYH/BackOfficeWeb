// [advice from AI] Kubernetes 클라이언트 설정
import * as k8s from '@kubernetes/client-node';
import { logger } from './logger';

// [advice from AI] Kubernetes 설정 인터페이스
interface KubernetesConfig {
  clusterUrl?: string | undefined;
  token?: string | undefined;
  kubeconfigPath?: string | undefined;
  inCluster: boolean;
  useServiceAccount: boolean;
  namespacePrefix: string;
}

// [advice from AI] 환경변수에서 K8s 설정 로드
const getKubernetesConfig = (): KubernetesConfig => {
  return {
    clusterUrl: process.env.K8S_CLUSTER_URL || undefined,
    token: process.env.K8S_TOKEN || undefined,
    kubeconfigPath: process.env.KUBECONFIG_PATH || undefined,
    inCluster: process.env.K8S_IN_CLUSTER === 'true',
    useServiceAccount: process.env.K8S_USE_SERVICE_ACCOUNT === 'true',
    namespacePrefix: process.env.K8S_NAMESPACE_PREFIX || 'aicc-'
  };
};

// [advice from AI] Kubernetes 클라이언트 클래스
export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private k8sAppsApi: k8s.AppsV1Api;
  private k8sNetworkingApi: k8s.NetworkingV1Api;
  private config: KubernetesConfig;

  constructor() {
    this.config = getKubernetesConfig();
    this.kc = new k8s.KubeConfig();
    this.initializeKubeConfig();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sNetworkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
  }

  // [advice from AI] KubeConfig 초기화
  private initializeKubeConfig(): void {
    try {
      if (this.config.inCluster) {
        // [advice from AI] 클러스터 내부에서 실행 시 (Pod 내부)
        this.kc.loadFromCluster();
        logger.info('Kubernetes client initialized from in-cluster config');
      } else if (this.config.useServiceAccount && this.config.clusterUrl && this.config.token) {
        // [advice from AI] 서비스 어카운트 토큰 사용
        this.kc.loadFromOptions({
          clusters: [{
            name: 'aicc-cluster',
            server: this.config.clusterUrl,
            skipTLSVerify: false
          }],
          users: [{
            name: 'aicc-service-account',
            token: this.config.token
          }],
          contexts: [{
            name: 'aicc-context',
            cluster: 'aicc-cluster',
            user: 'aicc-service-account'
          }],
          currentContext: 'aicc-context'
        });
        logger.info('Kubernetes client initialized with service account token');
      } else if (this.config.kubeconfigPath) {
        // [advice from AI] kubeconfig 파일 사용
        this.kc.loadFromFile(this.config.kubeconfigPath);
        logger.info(`Kubernetes client initialized from kubeconfig: ${this.config.kubeconfigPath}`);
      } else {
        // [advice from AI] 기본 kubeconfig 사용 (~/.kube/config)
        this.kc.loadFromDefault();
        logger.info('Kubernetes client initialized from default kubeconfig');
      }
    } catch (error) {
      logger.error('Failed to initialize Kubernetes client:', error);
      throw new Error(`Kubernetes client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // [advice from AI] 클러스터 연결 테스트
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.k8sApi.listNamespace();
      logger.info(`Kubernetes connection test successful. Found ${response.body.items.length} namespaces`);
      return true;
    } catch (error) {
      logger.error('Kubernetes connection test failed:', error);
      return false;
    }
  }

  // [advice from AI] 네임스페이스 존재 확인
  async namespaceExists(namespaceName: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespace(namespaceName);
      return true;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // [advice from AI] 네임스페이스 생성
  async createNamespace(namespaceName: string, labels?: Record<string, string>): Promise<boolean> {
    try {
      const namespace: k8s.V1Namespace = {
        metadata: {
          name: namespaceName,
          labels: {
            'app.kubernetes.io/managed-by': 'aicc-ops-platform',
            'aicc.io/tenant': namespaceName.replace(this.config.namespacePrefix, ''),
            ...labels
          }
        }
      };

      await this.k8sApi.createNamespace(namespace);
      logger.info(`Namespace created successfully: ${namespaceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create namespace ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네임스페이스 삭제
  async deleteNamespace(namespaceName: string): Promise<boolean> {
    try {
      await this.k8sApi.deleteNamespace(namespaceName);
      logger.info(`Namespace deletion initiated: ${namespaceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete namespace ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 네임스페이스 상태 조회
  async getNamespaceStatus(namespaceName: string): Promise<{
    phase: string;
    podCount: number;
    serviceCount: number;
    deploymentCount: number;
  } | null> {
    try {
      // 네임스페이스 정보
      const nsResponse = await this.k8sApi.readNamespace(namespaceName);
      const phase = nsResponse.body.status?.phase || 'Unknown';

      // Pod 개수
      const podsResponse = await this.k8sApi.listNamespacedPod(namespaceName);
      const podCount = podsResponse.body.items.length;

      // Service 개수
      const servicesResponse = await this.k8sApi.listNamespacedService(namespaceName);
      const serviceCount = servicesResponse.body.items.length;

      // Deployment 개수
      const deploymentsResponse = await this.k8sAppsApi.listNamespacedDeployment(namespaceName);
      const deploymentCount = deploymentsResponse.body.items.length;

      return {
        phase,
        podCount,
        serviceCount,
        deploymentCount
      };
    } catch (error) {
      logger.error(`Failed to get namespace status ${namespaceName}:`, error);
      return null;
    }
  }

  // [advice from AI] 리소스 쿼터 설정
  async createResourceQuota(namespaceName: string, cpuLimit: string = '2', memoryLimit: string = '4Gi'): Promise<boolean> {
    try {
      const resourceQuota: k8s.V1ResourceQuota = {
        metadata: {
          name: 'aicc-resource-quota',
          namespace: namespaceName
        },
        spec: {
          hard: {
            'requests.cpu': '500m',
            'requests.memory': '1Gi',
            'limits.cpu': cpuLimit,
            'limits.memory': memoryLimit,
            'persistentvolumeclaims': '4',
            'services': '10',
            'secrets': '10',
            'configmaps': '10'
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
  async createNetworkPolicy(namespaceName: string): Promise<boolean> {
    try {
      const networkPolicy: k8s.V1NetworkPolicy = {
        metadata: {
          name: 'aicc-tenant-isolation',
          namespace: namespaceName
        },
        spec: {
          podSelector: {},
          policyTypes: ['Ingress', 'Egress'],
          ingress: [
            {
              from: [
                { namespaceSelector: { matchLabels: { name: namespaceName } } },
                { namespaceSelector: { matchLabels: { name: 'kube-system' } } },
                { namespaceSelector: { matchLabels: { name: 'aicc-ops-platform' } } }
              ]
            }
          ],
          egress: [
            {
              to: [
                { namespaceSelector: { matchLabels: { name: namespaceName } } },
                { namespaceSelector: { matchLabels: { name: 'kube-system' } } }
              ]
            },
            {
              to: [],
              ports: [
                { protocol: 'TCP', port: 53 },
                { protocol: 'UDP', port: 53 }
              ]
            }
          ]
        }
      };

      await this.k8sNetworkingApi.createNamespacedNetworkPolicy(namespaceName, networkPolicy);
      logger.info(`Network policy created for namespace: ${namespaceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create network policy for ${namespaceName}:`, error);
      return false;
    }
  }

  // [advice from AI] 테넌트 키로 네임스페이스 이름 생성
  generateNamespaceName(tenantKey: string): string {
    return `${this.config.namespacePrefix}${tenantKey.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  }
}

// [advice from AI] 싱글톤 Kubernetes 클라이언트 인스턴스
export const kubernetesClient = new KubernetesClient();
