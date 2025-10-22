import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import DbConnectionModal from '../components/features/DbConnectionModal';
import { Tenant, TenantDbConnection } from '../types/tenant';
import { tenantService } from '../services/tenantService';
import api from '../services/api';

interface KubernetesStatus {
  exists: boolean;
  phase?: string;
  podCount: number;
  serviceCount: number;
  deploymentCount: number;
  resourceQuotaExists: boolean;
  networkPolicyExists: boolean;
}

interface KubernetesPod {
  name: string;
  phase: string;
  restarts: number;
  age: string;
  ready: boolean;
}

const TenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [dbConnections, setDbConnections] = useState<TenantDbConnection[]>([]);
  const [kubernetesStatus, setKubernetesStatus] = useState<KubernetesStatus | null>(null);
  const [kubernetesPods, setKubernetesPods] = useState<KubernetesPod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnectionsLoading, setDbConnectionsLoading] = useState(false);
  const [kubernetesLoading, setKubernetesLoading] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string>('');
  const [creatingNamespace, setCreatingNamespace] = useState(false);
  const [deletingNamespace, setDeletingNamespace] = useState(false);

  // 모달 상태
  const [isDbConnectionModalOpen, setIsDbConnectionModalOpen] = useState(false);

  // 테넌트 정보 로드
  const loadTenant = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await tenantService.getTenantById(id);
      if (response.success && response.data) {
        setTenant(response.data);
      } else {
        console.error('Failed to load tenant:', response.error);
        navigate('/tenants'); // 테넌트가 없으면 목록으로 리다이렉트
      }
    } catch (error) {
      console.error('Failed to load tenant:', error);
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  // DB 연결 목록 로드
  const loadDbConnections = async () => {
    if (!id) return;
    
    try {
      setDbConnectionsLoading(true);
      const response = await tenantService.getTenantDbConnections(id);
      if (response.success && response.data) {
        setDbConnections(response.data);
      } else {
        console.error('Failed to load DB connections:', response.error);
        setDbConnections([]);
      }
    } catch (error) {
      console.error('Failed to load DB connections:', error);
      setDbConnections([]);
    } finally {
      setDbConnectionsLoading(false);
    }
  };

  // Kubernetes 상태 로드
  const loadKubernetesStatus = async () => {
    if (!id) return;
    
    try {
      setKubernetesLoading(true);
      const response = await api.get(`/api/tenants/${id}/kubernetes`);
      
      if (response.data.success && response.data.data) {
        setKubernetesStatus(response.data.data.status);
      } else {
        console.error('Failed to load Kubernetes status:', response.data.error);
        setKubernetesStatus(null);
      }
    } catch (error) {
      console.error('Failed to load Kubernetes status:', error);
      setKubernetesStatus(null);
    } finally {
      setKubernetesLoading(false);
    }
  };

  // Kubernetes Pod 목록 로드
  const loadKubernetesPods = async () => {
    if (!id) return;
    
    try {
      const response = await api.get(`/api/tenants/${id}/kubernetes/pods`);
      
      if (response.data.success && response.data.data) {
        setKubernetesPods(response.data.data.pods || []);
      } else {
        console.error('Failed to load Kubernetes pods:', response.data.error);
        setKubernetesPods([]);
      }
    } catch (error) {
      console.error('Failed to load Kubernetes pods:', error);
      setKubernetesPods([]);
    }
  };

  // Kubernetes 네임스페이스 생성
  const handleCreateNamespace = async () => {
    if (!id) return;
    
    try {
      setCreatingNamespace(true);
      const response = await api.post(`/api/tenants/${id}/kubernetes/create`);
      
      if (response.data.success) {
        await Promise.all([
          loadTenant(),
          loadKubernetesStatus(),
          loadKubernetesPods()
        ]);
        alert('Kubernetes 네임스페이스가 성공적으로 생성되었습니다.');
      } else {
        alert(`네임스페이스 생성 실패: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Namespace creation failed:', error);
      alert('네임스페이스 생성 중 오류가 발생했습니다.');
    } finally {
      setCreatingNamespace(false);
    }
  };

  // Kubernetes 네임스페이스 삭제
  const handleDeleteNamespace = async () => {
    if (!id || !tenant) return;
    
    const confirmed = window.confirm(
      `"${tenant.kubernetes_namespace}" 네임스페이스를 삭제하시겠습니까?\n\n⚠️ 주의: 네임스페이스 내의 모든 리소스가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
    );
    
    if (!confirmed) return;
    
    try {
      setDeletingNamespace(true);
      const response = await api.delete(`/api/tenants/${id}/kubernetes`);
      
      if (response.data.success) {
        await Promise.all([
          loadTenant(),
          loadKubernetesStatus(),
          loadKubernetesPods()
        ]);
        alert('Kubernetes 네임스페이스가 성공적으로 삭제되었습니다.');
      } else {
        alert(`네임스페이스 삭제 실패: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Namespace deletion failed:', error);
      alert('네임스페이스 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingNamespace(false);
    }
  };

  useEffect(() => {
    loadTenant();
    loadDbConnections();
    loadKubernetesStatus();
    loadKubernetesPods();
  }, [id]);

  // DB 연결 테스트
  const handleTestConnection = async (connectionId: string) => {
    if (!id) return;
    
    setTestingConnectionId(connectionId);
    try {
      const response = await tenantService.testTenantDbConnection(id, connectionId);
      if (response.success) {
        alert(`연결 테스트 성공: ${response.data?.message}`);
        loadDbConnections(); // 상태 업데이트를 위해 다시 로드
      } else {
        alert(`연결 테스트 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('DB connection test failed:', error);
      alert('DB 연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setTestingConnectionId('');
    }
  };

  // DB 연결 상태 표시 함수
  const getConnectionStatusDisplay = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex px-2 py-1 text-xs font-medium bg-success-100 text-success-800 rounded-full">연결됨</span>;
      case 'failed':
        return <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">실패</span>;
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">대기중</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">알 수 없음</span>;
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return tenantService.formatDate(dateString);
  };

  // DB 연결 테이블 컬럼 정의
  const dbConnectionColumns = [
    { key: 'connection_type' as keyof TenantDbConnection, label: '타입' },
    { key: 'host' as keyof TenantDbConnection, label: '호스트' },
    { key: 'port' as keyof TenantDbConnection, label: '포트' },
    { key: 'database_name' as keyof TenantDbConnection, label: 'DB 이름' },
    { key: 'username' as keyof TenantDbConnection, label: '사용자명' },
    { 
      key: 'connection_status' as keyof TenantDbConnection, 
      label: '상태',
      render: (value: string) => getConnectionStatusDisplay(value)
    },
    { 
      key: 'last_tested_at' as keyof TenantDbConnection, 
      label: '최근 테스트',
      render: (value: string | null) => value ? formatDate(value) : '-'
    },
    {
      key: 'id' as keyof TenantDbConnection,
      label: '액션',
      render: (value: string, connection: TenantDbConnection) => (
        <Button 
          variant="info" 
          size="sm" 
          onClick={() => handleTestConnection(connection.id)}
          disabled={testingConnectionId === connection.id}
        >
          {testingConnectionId === connection.id ? '테스트 중...' : '연결 테스트'}
        </Button>
      )
    }
  ];

  if (loading || !tenant) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">테넌트 정보를 로드 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text">테넌트 상세: {tenant.tenant_key}</h1>
        <Button variant="secondary" onClick={() => navigate('/tenants')}>
          목록으로 돌아가기
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card title="기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text">
          <div>
            <p className="text-sm font-medium text-gray-500">회사명</p>
            <p className="mt-1 text-lg">{tenant.company_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">테넌트 키</p>
            <p className="mt-1 text-lg font-mono bg-gray-100 px-2 py-1 rounded inline-block">{tenant.tenant_key}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Kubernetes Namespace</p>
            <p className="mt-1 text-lg font-mono bg-gray-100 px-2 py-1 rounded inline-block">{tenant.kubernetes_namespace}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">배포 상태</p>
            <p className="mt-1 text-lg">{tenantService.getDeploymentStatusDisplay(tenant.deployment_status).text}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">생성일</p>
            <p className="mt-1 text-lg">{formatDate(tenant.created_at)}</p>
          </div>
        </div>
      </Card>

      {/* Kubernetes 상태 */}
      <Card title="Kubernetes 상태">
        <div className="flex justify-end mb-6">
          <div className="flex space-x-3">
            {kubernetesStatus?.exists ? (
              <Button 
                variant="danger" 
                onClick={handleDeleteNamespace}
                disabled={deletingNamespace || tenant.deployment_status !== 'active'}
              >
                {deletingNamespace ? '네임스페이스 삭제 중...' : '네임스페이스 삭제'}
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleCreateNamespace}
                disabled={creatingNamespace}
              >
                {creatingNamespace ? '네임스페이스 생성 중...' : '네임스페이스 생성'}
              </Button>
            )}
          </div>
        </div>

        {kubernetesLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Kubernetes 상태 로딩 중...</div>
          </div>
        ) : kubernetesStatus?.exists ? (
          <div className="space-y-6">
            {/* 네임스페이스 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-700 mb-1">Phase</div>
                <div className="text-lg font-bold text-blue-900">{kubernetesStatus.phase || 'Unknown'}</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-700 mb-1">Pods</div>
                <div className="text-lg font-bold text-green-900">{kubernetesStatus.podCount}</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-700 mb-1">Services</div>
                <div className="text-lg font-bold text-purple-900">{kubernetesStatus.serviceCount}</div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-700 mb-1">Deployments</div>
                <div className="text-lg font-bold text-orange-900">{kubernetesStatus.deploymentCount}</div>
              </div>
            </div>

            {/* 리소스 상태 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">리소스 쿼터</div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  kubernetesStatus.resourceQuotaExists 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {kubernetesStatus.resourceQuotaExists ? '설정됨' : '미설정'}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">네트워크 정책</div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  kubernetesStatus.networkPolicyExists 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {kubernetesStatus.networkPolicyExists ? '설정됨' : '미설정'}
                </span>
              </div>
            </div>

            {/* Pod 목록 */}
            {kubernetesPods.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pod 목록</h3>
                <Table 
                  data={kubernetesPods} 
                  columns={[
                    {
                      key: 'name' as keyof KubernetesPod,
                      label: 'Pod 이름',
                      render: (value: string) => (
                        <span className="font-mono text-sm">{value}</span>
                      )
                    },
                    {
                      key: 'phase' as keyof KubernetesPod,
                      label: '상태',
                      render: (value: string) => {
                        const colorMap: Record<string, string> = {
                          'Running': 'bg-success-100 text-success-800',
                          'Pending': 'bg-yellow-100 text-yellow-800',
                          'Failed': 'bg-red-100 text-red-800',
                          'Succeeded': 'bg-blue-100 text-blue-800'
                        };
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorMap[value] || 'bg-gray-100 text-gray-800'}`}>
                            {value}
                          </span>
                        );
                      }
                    },
                    {
                      key: 'ready' as keyof KubernetesPod,
                      label: 'Ready',
                      render: (value: boolean) => (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          value ? 'bg-success-100 text-success-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {value ? 'Ready' : 'Not Ready'}
                        </span>
                      )
                    },
                    {
                      key: 'restarts' as keyof KubernetesPod,
                      label: 'Restarts'
                    },
                    {
                      key: 'age' as keyof KubernetesPod,
                      label: 'Age'
                    }
                  ]}
                  emptyMessage="실행 중인 Pod가 없습니다."
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="text-gray-500 mb-4">
                Kubernetes 네임스페이스가 생성되지 않았습니다.
              </div>
              <p className="text-sm text-gray-400 mb-4">
                네임스페이스를 생성하여 테넌트 리소스를 배포하세요.
              </p>
              <Button variant="primary" onClick={handleCreateNamespace} disabled={creatingNamespace}>
                {creatingNamespace ? '네임스페이스 생성 중...' : '네임스페이스 생성'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* DB 연결 정보 */}
      <Card title="DB 연결 정보">
        <div className="flex justify-end mb-4">
          <Button variant="primary" onClick={() => setIsDbConnectionModalOpen(true)}>
            DB 연결 추가
          </Button>
        </div>
        {dbConnectionsLoading ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-500">DB 연결 정보를 로드 중입니다...</p>
          </div>
        ) : dbConnections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">등록된 DB 연결 정보가 없습니다.</p>
          </div>
        ) : (
          <Table 
            data={dbConnections} 
            columns={dbConnectionColumns} 
            isLoading={dbConnectionsLoading}
            emptyMessage="등록된 DB 연결 정보가 없습니다."
          />
        )}
      </Card>

      {/* DB 연결 추가 모달 */}
      <DbConnectionModal
        isOpen={isDbConnectionModalOpen}
        onClose={() => setIsDbConnectionModalOpen(false)}
        onSave={() => {
          loadDbConnections();
          setIsDbConnectionModalOpen(false);
        }}
        tenantId={id || ''}
      />
    </div>
  );
};

export default TenantDetail;