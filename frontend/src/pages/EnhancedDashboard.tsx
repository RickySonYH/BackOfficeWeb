// [advice from AI] 향상된 모니터링 대시보드 페이지

import React, { useState, useEffect, useCallback } from 'react';
import { monitoringService } from '../services/monitoringService';
import { 
  SystemStatus, 
  RealTimeMetrics, 
  Alert, 
  OptimizationSuggestion,
  TenantMetrics,
  WorkspaceMetrics,
  SolutionMetrics 
} from '../types/monitoring';
import Button from '../components/common/Button';

const EnhancedDashboard: React.FC = () => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'resources' | 'alerts' | 'optimization'>('overview');

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        metricsResponse,
        statusResponse,
        alertsResponse,
        suggestionsResponse
      ] = await Promise.all([
        monitoringService.getRealTimeMetrics(),
        monitoringService.getSystemStatus(),
        monitoringService.getActiveAlerts(),
        monitoringService.getOptimizationSuggestions()
      ]);

      if (metricsResponse.success && metricsResponse.data) {
        setRealTimeMetrics(metricsResponse.data);
      }

      if (statusResponse.success && statusResponse.data) {
        setSystemStatus(statusResponse.data);
      }

      if (alertsResponse.success && alertsResponse.data) {
        setActiveAlerts(alertsResponse.data.alerts);
      }

      if (suggestionsResponse.success && suggestionsResponse.data) {
        setOptimizationSuggestions(suggestionsResponse.data);
      }

      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // 30초마다 자동 새로고침
    const interval = setInterval(loadAllData, 30000);

    return () => clearInterval(interval);
  }, [loadAllData]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'error':
        return 'text-red-500 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !realTimeMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">모니터링 데이터 로딩 중...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">실시간 모니터링 대시보드</h1>
            <p className="text-gray-600 mt-2">시스템 상태 및 성능 모니터링</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdated}
            </span>
            <Button onClick={loadAllData} variant="primary" size="sm" disabled={loading}>
              {loading ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: '전체 현황' },
              { key: 'resources', label: '리소스 현황' },
              { key: 'alerts', label: '알림' },
              { key: 'optimization', label: '최적화 제안' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.key === 'alerts' && activeAlerts?.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {activeAlerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* 전체 현황 탭 */}
        {selectedTab === 'overview' && systemStatus && (
          <div className="space-y-8">
            {/* 시스템 전체 상태 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">시스템 전체 상태</h2>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${
                      systemStatus.overall_health === 'healthy' ? 'bg-green-500' :
                      systemStatus.overall_health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-2xl font-bold">
                      {systemStatus.overall_health === 'healthy' ? '정상' :
                       systemStatus.overall_health === 'warning' ? '주의' : '위험'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {systemStatus.last_updated && new Date(systemStatus.last_updated).toLocaleString('ko-KR')}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {systemStatus?.system?.cpu_usage?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-gray-600">CPU 사용률</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(systemStatus?.system?.cpu_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {systemStatus?.system?.memory_usage?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-gray-600">메모리 사용률</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(systemStatus?.system?.memory_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {systemStatus?.system?.disk_usage?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-gray-600">디스크 사용률</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(systemStatus?.system?.disk_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 애플리케이션 성능 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">애플리케이션 성능</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {systemStatus?.application?.response_time?.toFixed(0) || '0'}ms
                  </div>
                  <div className="text-sm text-gray-600">평균 응답시간</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {systemStatus?.application?.success_rate?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-gray-600">성공률</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-2">
                    {systemStatus?.application?.error_rate?.toFixed(2) || '0'}
                  </div>
                  <div className="text-sm text-gray-600">에러율 (분당)</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {systemStatus?.database?.active_connections || '0'}
                  </div>
                  <div className="text-sm text-gray-600">활성 DB 연결</div>
                </div>
              </div>
            </section>

            {/* 테넌트 및 솔루션 현황 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">테넌트 및 솔루션 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">테넌트 현황</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">전체 테넌트</span>
                      <span className="font-semibold">{systemStatus?.tenants?.total || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">활성 테넌트</span>
                      <span className="font-semibold text-green-600">{systemStatus?.tenants?.active || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">높은 사용률</span>
                      <span className="font-semibold text-orange-600">{systemStatus?.tenants?.high_usage || '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">솔루션 현황</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">전체 솔루션</span>
                      <span className="font-semibold">{systemStatus?.solutions?.total || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">정상 상태</span>
                      <span className="font-semibold text-green-600">{systemStatus?.solutions?.healthy || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">주의 상태</span>
                      <span className="font-semibold text-yellow-600">{systemStatus?.solutions?.warning || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">위험 상태</span>
                      <span className="font-semibold text-red-600">{systemStatus?.solutions?.critical || '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 리소스 현황 탭 */}
        {selectedTab === 'resources' && realTimeMetrics && (
          <div className="space-y-8">
            {/* 테넌트별 리소스 사용량 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">테넌트별 리소스 사용량</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">테넌트</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">활성 사용자</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">메모리</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">스토리지</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">응답시간</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가동률</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {realTimeMetrics?.tenants?.length > 0 ? realTimeMetrics.tenants.map((tenant) => (
                        <tr key={tenant.tenant_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{tenant.company_name}</div>
                              <div className="text-sm text-gray-500">{tenant.tenant_key}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tenant.metrics?.active_users || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{tenant.resource_usage?.cpu_percent?.toFixed(1) || '0'}%</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  (tenant.resource_usage?.cpu_percent || 0) > 80 ? 'bg-red-600' :
                                  (tenant.resource_usage?.cpu_percent || 0) > 60 ? 'bg-yellow-600' : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(tenant.resource_usage?.cpu_percent || 0, 100)}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{tenant.resource_usage?.memory_mb?.toFixed(0) || '0'}MB</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{tenant.resource_usage?.storage_gb?.toFixed(1) || '0'}GB</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{tenant.performance?.avg_response_time?.toFixed(0) || '0'}ms</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (tenant.performance?.uptime_percent || 0) > 99 ? 'bg-green-100 text-green-800' :
                              (tenant.performance?.uptime_percent || 0) > 95 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {tenant.performance?.uptime_percent?.toFixed(1) || '0'}%
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            테넌트 데이터를 로딩 중입니다...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 워크스페이스 성능 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">워크스페이스 성능</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {realTimeMetrics?.workspaces?.length > 0 ? realTimeMetrics.workspaces.map((workspace) => (
                  <div key={workspace.workspace_id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{workspace.workspace_name}</h3>
                        <p className="text-sm text-gray-500">{(workspace.workspace_type || '').toUpperCase() || 'UNKNOWN'}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workspace.usage_patterns?.user_activity_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                        workspace.usage_patterns?.user_activity_trend === 'stable' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workspace.usage_patterns?.user_activity_trend === 'increasing' ? '증가' :
                         workspace.usage_patterns?.user_activity_trend === 'stable' ? '안정' : '감소'}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">활성 세션</span>
                        <span className="font-semibold">{workspace.metrics?.active_sessions || '0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">처리된 문서</span>
                        <span className="font-semibold">{workspace.metrics?.documents_processed || '0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">쿼리 응답시간</span>
                        <span className="font-semibold">{workspace.performance?.query_response_time?.toFixed(0) || '0'}ms</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">검색 정확도</span>
                        <span className="font-semibold">{workspace.performance?.search_accuracy?.toFixed(1) || '0'}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">사용자 만족도</span>
                        <span className="font-semibold">{workspace.performance?.user_satisfaction?.toFixed(1) || '0'}%</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <p className="text-gray-500">워크스페이스 데이터를 로딩 중입니다...</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* 알림 탭 */}
        {selectedTab === 'alerts' && (
          <div className="space-y-6">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">활성 알림</h2>
                <div className="text-sm text-gray-500">
                  총 {activeAlerts?.length || 0}개의 활성 알림
                </div>
              </div>
              
              {activeAlerts?.length > 0 ? (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mr-3 ${getSeverityColor(alert.severity)}`}>
                            {(alert.severity || '').toUpperCase() || 'UNKNOWN'}
                          </span>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{alert.rule_name || 'Unknown Rule'}</h3>
                            <p className="text-gray-600 mt-1">{alert.message || 'No message available'}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {alert.triggered_at ? new Date(alert.triggered_at).toLocaleString('ko-KR') : 'Unknown time'}
                        </div>
                      </div>
                      
                      {alert.details && Object.keys(alert.details).length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">세부 정보</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(alert.details || {}).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {alert.affected_resources.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">영향받는 리소스</h4>
                          <div className="flex flex-wrap gap-2">
                            {alert.affected_resources.map((resource, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {resource.type}: {resource.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                  <div className="text-gray-500">현재 활성 알림이 없습니다.</div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* 최적화 제안 탭 */}
        {selectedTab === 'optimization' && (
          <div className="space-y-6">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">최적화 제안</h2>
                <div className="text-sm text-gray-500">
                  {optimizationSuggestions.length}개의 제안사항
                </div>
              </div>
              
              {optimizationSuggestions.length > 0 ? (
                <div className="space-y-6">
                  {optimizationSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mr-3 ${getPriorityColor(suggestion.priority)}`}>
                            {(suggestion.priority || '').toUpperCase() || 'UNKNOWN'}
                          </span>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{suggestion.title || 'Unknown Suggestion'}</h3>
                            <p className="text-gray-600 mt-1">{suggestion.description || 'No description available'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (suggestion.risk_level || 'unknown') === 'low' ? 'bg-green-100 text-green-800' :
                          (suggestion.risk_level || 'unknown') === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          위험도: {(suggestion.risk_level || '').toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">현재 영향</h4>
                          <p className="text-sm text-gray-600">{suggestion.current_impact || 'No impact information'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">예상 개선 효과</h4>
                          <p className="text-sm text-gray-600">{suggestion.potential_improvement || 'No improvement information'}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">구현 단계</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                          {(suggestion.implementation_steps || []).map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-600">예상 작업량: </span>
                          <span className="font-medium">{suggestion.estimated_effort}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.affected_components.map((component, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                  <div className="text-gray-500">현재 최적화 제안사항이 없습니다.</div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDashboard;
