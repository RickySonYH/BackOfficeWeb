import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import { dataInitService } from '../../services/dataInitService';

interface InitializationStatusProps {
  tenantId: string;
  refreshKey: number;
}

const InitializationStatus: React.FC<InitializationStatusProps> = ({ 
  tenantId, 
  refreshKey 
}) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 상태 조회
  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await dataInitService.getInitializationStatus(tenantId);
      setStatus(result);
    } catch (error) {
      console.error('Failed to load initialization status:', error);
      setStatus({ success: false, error: 'Failed to load status' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadStatus();
    }
  }, [tenantId, refreshKey]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh || !tenantId) return;

    const interval = setInterval(() => {
      loadStatus();
    }, 5000); // 5초마다 새로고침

    return () => clearInterval(interval);
  }, [autoRefresh, tenantId]);

  // 워크스페이스 설정 적용
  const applyWorkspaceConfig = async (workspaceId: string, workspaceType: 'kms' | 'advisor') => {
    const confirmed = window.confirm(
      `워크스페이스 설정을 적용하시겠습니까?\n\n` +
      `워크스페이스 ID: ${workspaceId}\n` +
      `타입: ${workspaceType.toUpperCase()}`
    );

    if (!confirmed) return;

    try {
      const operations = workspaceType === 'kms' 
        ? {
            create_vector_index: true,
            sync_categories: true
          }
        : {
            register_trigger_rules: true,
            sync_categories: true
          };

      const result = await dataInitService.applyWorkspaceConfig(workspaceId, operations);
      
      if (result.success) {
        alert('워크스페이스 설정이 적용되었습니다!');
        loadStatus(); // 상태 새로고침
      } else {
        alert(`설정 적용 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Config application failed:', error);
      alert('설정 적용 중 오류가 발생했습니다.');
    }
  };

  if (loading && !status) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">상태를 로드 중입니다...</span>
      </div>
    );
  }

  if (!status || !status.success) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">❌ 상태 조회 실패</div>
        <div className="text-sm text-gray-500 mb-4">
          {status?.error || '알 수 없는 오류가 발생했습니다.'}
        </div>
        <Button variant="secondary" onClick={loadStatus}>
          다시 시도
        </Button>
      </div>
    );
  }

  const { data } = status;
  const overallProgress = dataInitService.calculateOverallProgress(status);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">초기화 상태 모니터링</h3>
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">자동 새로고침 (5초)</span>
          </label>
          <Button variant="secondary" size="sm" onClick={loadStatus} disabled={loading}>
            {loading ? '새로고침 중...' : '🔄 새로고침'}
          </Button>
        </div>
      </div>

      {/* 전체 상태 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">전체 진행 상태</h4>
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            dataInitService.getStatusColorClass(data.overall_status)
          }`}>
            {dataInitService.getStatusDisplayText(data.overall_status)}
          </span>
        </div>
        
        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">{overallProgress}% 완료</p>
      </div>

      {/* 데이터베이스 상태 */}
      {Object.keys(data.database_status || {}).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">🗄️ 데이터베이스 초기화 상태</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data.database_status).map(([dbType, status]: [string, any]) => (
              <div key={dbType} className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {dbType === 'postgresql' ? '🐘' : '🍃'}
                    </span>
                    <span className="font-medium">
                      {dataInitService.getDatabaseTypeDisplayName(dbType as any)}
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    dataInitService.getStatusColorClass(status)
                  }`}>
                    {dataInitService.getStatusDisplayText(status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 워크스페이스 상태 */}
      {Object.keys(data.workspace_status || {}).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">📤 워크스페이스 상태</h4>
          <div className="space-y-3">
            {Object.entries(data.workspace_status).map(([workspaceId, wsStatus]: [string, any]) => (
              <div key={workspaceId} className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">워크스페이스 {workspaceId}</h5>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => applyWorkspaceConfig(workspaceId, 'kms')} // 임시로 kms 타입
                    disabled={wsStatus.config_applied === 'completed'}
                  >
                    {wsStatus.config_applied === 'completed' ? '설정 완료' : '설정 적용'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">데이터 시딩</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      dataInitService.getStatusColorClass(wsStatus.data_seeding || 'pending')
                    }`}>
                      {dataInitService.getStatusDisplayText(wsStatus.data_seeding || 'pending')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">설정 적용</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      dataInitService.getStatusColorClass(wsStatus.config_applied || 'pending')
                    }`}>
                      {dataInitService.getStatusDisplayText(wsStatus.config_applied || 'pending')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로그 */}
      {data.logs && data.logs.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">📋 초기화 로그</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.logs.slice(0, 20).map((log: any, index: number) => (
              <div 
                key={index}
                className={`p-3 rounded-lg text-sm border ${
                  log.status === 'completed' ? 'bg-green-50 border-green-200' :
                  log.status === 'failed' ? 'bg-red-50 border-red-200' :
                  log.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        dataInitService.getStatusColorClass(log.status)
                      }`}>
                        {dataInitService.getOperationTypeDisplayName(log.operation_type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.started_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-gray-800">{log.message}</p>
                    {log.error_message && (
                      <p className="text-red-600 text-xs mt-1">오류: {log.error_message}</p>
                    )}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    dataInitService.getStatusColorClass(log.status)
                  }`}>
                    {dataInitService.getStatusDisplayText(log.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상태가 없는 경우 */}
      {(!data.database_status || Object.keys(data.database_status).length === 0) &&
       (!data.workspace_status || Object.keys(data.workspace_status).length === 0) &&
       (!data.logs || data.logs.length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">📊 초기화 작업 내역이 없습니다</div>
          <div className="text-sm text-gray-400">
            데이터베이스 초기화나 데이터 시딩을 실행하면 상태가 표시됩니다.
          </div>
        </div>
      )}

      {/* 마지막 업데이트 시간 */}
      <div className="text-center text-xs text-gray-500">
        마지막 업데이트: {new Date(data.last_updated).toLocaleString('ko-KR')}
      </div>
    </div>
  );
};

export default InitializationStatus;
