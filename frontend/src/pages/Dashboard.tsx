// [advice from AI] 대시보드 페이지 컴포넌트
import { useState, useEffect, useRef } from 'react';
import { DashboardData, SystemStatus } from '../types/dashboard';
import { dashboardService } from '../services/dashboardService';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const refreshIntervalRef = useRef<number | null>(null);

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      const response = await dashboardService.getDashboardData();
      if (response.success) {
        setDashboardData(response.data);
        setError(null);
      } else {
        setError(response.error || '데이터를 불러올 수 없습니다.');
        setDashboardData(dashboardService.getEmptyDashboardData());
      }
    } catch (err) {
      setError('데이터 로드 중 오류가 발생했습니다.');
      setDashboardData(dashboardService.getEmptyDashboardData());
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    }
  };

  // 시스템 상태만 업데이트 (더 빠른 갱신용)
  const updateSystemStatus = async () => {
    if (!dashboardData) return;
    
    try {
      const response = await dashboardService.getSystemStatus();
      if (response.success && response.data) {
        setDashboardData(prev => prev ? { ...prev, system_status: response.data! } : null);
      }
    } catch (err) {
      console.error('Failed to update system status:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // 30초마다 전체 데이터 새로고침
    const dataInterval = setInterval(loadDashboardData, 30000);
    
    // 10초마다 시스템 상태만 업데이트
    const statusInterval = setInterval(updateSystemStatus, 10000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(statusInterval);
    };
  }, []);

  // 수동 새로고침
  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">대시보드 로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-2">AICC Operations Management Platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdated}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="text-red-600">
                <span className="font-medium">오류:</span> {error}
              </div>
            </div>
          </div>
        )}

        {dashboardData && (
          <div className="space-y-8">
            {/* 1. 전체 통계 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">전체 통계</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {dashboardData?.stats?.companies?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-700">등록된 회사 수</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {dashboardData?.stats?.tenants?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-700">활성 테넌트 수</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {dashboardData?.stats?.users?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-purple-700">전체 사용자 수</div>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {dashboardData?.stats?.workspaces?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-orange-700">워크스페이스 수</div>
                </div>
              </div>
            </section>

            {/* 2. 테넌트별 초기화 현황 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">테넌트 초기화 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {dashboardData?.tenant_init_stats?.completed?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-700">초기화 완료</div>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {dashboardData?.tenant_init_stats?.in_progress?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-700">초기화 진행 중</div>
                </div>
                <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {dashboardData?.tenant_init_stats?.failed?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-700">초기화 실패</div>
                </div>
              </div>
            </section>

            {/* 3. 최근 활동 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 활동</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 최근 등록된 회사 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">최근 등록된 회사</h3>
                  <div className="space-y-3">
                    {dashboardData?.recent_companies?.length > 0 ? (
                      dashboardData.recent_companies.map((company) => (
                        <div key={company.id} className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{company.company_name}</div>
                            <div className="text-sm text-gray-500">{company.business_number}</div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {dashboardService.formatDate(company.created_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm">최근 등록된 회사가 없습니다.</div>
                    )}
                  </div>
                </div>

                {/* 최근 생성된 테넌트 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">최근 생성된 테넌트</h3>
                  <div className="space-y-3">
                    {dashboardData?.recent_tenants?.length > 0 ? (
                      dashboardData.recent_tenants.map((tenant) => (
                        <div key={tenant.id} className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{tenant.tenant_key}</div>
                            <div className="text-sm text-gray-500">{tenant.company_name}</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${dashboardService.getDeploymentStatusColor(tenant.deployment_status)}`}>
                              {tenant.deployment_status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {dashboardService.formatDate(tenant.created_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm">최근 생성된 테넌트가 없습니다.</div>
                    )}
                  </div>
                </div>

                {/* 최근 데이터 초기화 로그 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">최근 데이터 초기화 로그</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {dashboardData?.recent_init_logs?.length > 0 ? (
                      dashboardData.recent_init_logs.map((log) => (
                        <div key={log.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium text-gray-900 text-sm">{log.tenant_key}</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${dashboardService.getInitStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{log.action}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {dashboardService.formatDateTime(log.timestamp)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm">최근 초기화 로그가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 4. 시스템 상태 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">시스템 상태</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">관리 DB</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${dashboardService.getStatusColorClass(dashboardData?.system_status?.management_db?.status || 'unknown')}`}>
                      {dashboardService.getStatusDisplayText(dashboardData?.system_status?.management_db?.status || 'unknown')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    포트: {dashboardData?.system_status?.management_db?.port || 'N/A'}
                  </div>
                  {dashboardData?.system_status?.management_db?.message && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.system_status.management_db.message}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">백엔드 서비스</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${dashboardService.getStatusColorClass(dashboardData?.system_status?.backend_service?.status || 'unknown')}`}>
                      {dashboardService.getStatusDisplayText(dashboardData?.system_status?.backend_service?.status || 'unknown')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    포트: {dashboardData?.system_status?.backend_service?.port || 'N/A'}
                  </div>
                  {dashboardData?.system_status?.backend_service?.message && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.system_status.backend_service.message}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Kubernetes</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${dashboardService.getStatusColorClass(dashboardData?.system_status?.kubernetes?.status || 'unknown')}`}>
                      {dashboardService.getStatusDisplayText(dashboardData?.system_status?.kubernetes?.status || 'unknown')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">클러스터 연결</div>
                  {dashboardData?.system_status?.kubernetes?.message && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.system_status.kubernetes.message}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">ECP 인증</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${dashboardService.getStatusColorClass(dashboardData?.system_status?.ecp_auth?.status || 'unknown')}`}>
                      {dashboardService.getStatusDisplayText(dashboardData?.system_status?.ecp_auth?.status || 'unknown')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    포트: {dashboardData?.system_status?.ecp_auth?.port || 'N/A'}
                  </div>
                  {dashboardData?.system_status?.ecp_auth?.message && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.system_status.ecp_auth.message}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;