// [advice from AI] 데이터 초기화 UI 페이지 구현
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import { useAuth } from '../hooks/useAuth';
import { tenantService } from '../services/tenantService';
import { workspaceService } from '../services/workspaceService';
import { dataInitService } from '../services/dataInitService';
import {
  TenantInitStatus,
  InitializationLog,
  DataType,
  InitializationStatus
} from '../types/dataInit';
import { Tenant } from '../types/tenant';
import { Workspace } from '../types/workspace';

const DataInitialization: React.FC = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedDataType, setSelectedDataType] = useState<DataType | ''>('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // 상태 관리
  const [initStatus, setInitStatus] = useState<TenantInitStatus | null>(null);
  const [logs, setLogs] = useState<InitializationLog[]>([]);
  const [allLogs, setAllLogs] = useState<InitializationLog[]>([]);
  
  // 로딩 상태
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  
  // 로그 필터
  const [logFilter, setLogFilter] = useState<InitializationStatus | 'all'>('all');
  
  // 실시간 업데이트용
  const statusIntervalRef = useRef<number | null>(null);

  // 테넌트 목록 로드
  const loadTenants = useCallback(async () => {
    try {
      const response = await tenantService.getTenants(1, 50);
      if (response.success && response.data) {
        const filteredTenants = user?.role === 'admin' 
          ? response.data.tenants 
          : response.data.tenants.filter(t => t.id === user?.tenantId);
        setTenants(filteredTenants);
        
        if (filteredTenants.length > 0 && !selectedTenantId) {
          setSelectedTenantId(filteredTenants[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  }, [user, selectedTenantId]);

  // 워크스페이스 목록 로드
  const loadWorkspaces = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    
    try {
      const response = await workspaceService.getWorkspaces(1, 50, tenantId);
      if (response.success && response.data) {
        setWorkspaces(response.data.workspaces);
        if (response.data.workspaces.length > 0) {
          setSelectedWorkspaceId(response.data.workspaces[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  }, []);

  // 초기화 상태 조회
  const loadInitStatus = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    
    setStatusLoading(true);
    try {
      const response = await dataInitService.getInitializationStatus(tenantId);
      if (response.success) {
        setInitStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load init status:', error);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // 전체 로그 조회
  const loadAllLogs = useCallback(async () => {
    try {
      const response = await dataInitService.getLogs(1, 100);
      if (response.success) {
        setAllLogs(response.data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, []);

  // 파일 드롭 핸들러
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      dataInitService.isValidFileType(file.name)
    );
    
    if (validFiles.length !== acceptedFiles.length) {
      alert(`지원하지 않는 파일 형식이 포함되어 있습니다. 지원 형식: ${dataInitService.getFileTypeText()}`);
    }
    
    setUploadFiles(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf']
    }
  });

  // 스키마 초기화
  const handleSchemaInit = async () => {
    if (!selectedTenantId) return;
    
    setSchemaLoading(true);
    try {
      const response = await dataInitService.initializeSchema(selectedTenantId);
      if (response.success) {
        setLogs(prev => [...response.logs, ...prev]);
        await loadInitStatus(selectedTenantId);
        alert('스키마 초기화가 시작되었습니다.');
      } else {
        alert(`스키마 초기화 실패: ${response.error}`);
      }
    } catch (error) {
      alert('스키마 초기화 중 오류가 발생했습니다.');
    } finally {
      setSchemaLoading(false);
    }
  };

  // 데이터 업로드
  const handleDataUpload = async () => {
    if (!selectedWorkspaceId || !selectedDataType || uploadFiles.length === 0) {
      alert('워크스페이스, 데이터 타입, 파일을 모두 선택해주세요.');
      return;
    }
    
    setUploadLoading(true);
    try {
      const response = await dataInitService.uploadWorkspaceData(
        selectedWorkspaceId,
        selectedDataType as DataType,
        uploadFiles
      );
      
      if (response.success) {
        setLogs(prev => [...response.logs, ...prev]);
        setUploadFiles([]);
        await loadInitStatus(selectedTenantId);
        alert(`데이터 업로드 완료: ${response.processed_files}개 파일, ${response.total_records}개 레코드`);
      } else {
        alert(`데이터 업로드 실패: ${response.error}`);
      }
    } catch (error) {
      alert('데이터 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadLoading(false);
    }
  };

  // 설정 적용
  const handleConfigApply = async () => {
    if (!selectedWorkspaceId) return;
    
    setConfigLoading(true);
    try {
      const response = await dataInitService.applyWorkspaceConfig(selectedWorkspaceId);
      if (response.success) {
        setLogs(prev => [...response.logs, ...prev]);
        await loadInitStatus(selectedTenantId);
        alert(`설정 적용 완료: ${response.applied_configs.join(', ')}`);
      } else {
        alert(`설정 적용 실패: ${response.error}`);
      }
    } catch (error) {
      alert('설정 적용 중 오류가 발생했습니다.');
    } finally {
      setConfigLoading(false);
    }
  };

  // 파일 제거
  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 필터링된 로그
  const filteredAllLogs = allLogs.filter(log => 
    logFilter === 'all' || log.status === logFilter
  );

  // 로딩 애니메이션 컴포넌트
  const LoadingText: React.FC<{ text: string }> = ({ text }) => {
    const [dots, setDots] = useState('');
    
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      
      return () => clearInterval(interval);
    }, []);
    
    return <span>{text}{dots}</span>;
  };

  // 초기 로드
  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (selectedTenantId) {
      loadWorkspaces(selectedTenantId);
      loadInitStatus(selectedTenantId);
      
      // 실시간 상태 업데이트 (5초마다)
      statusIntervalRef.current = setInterval(() => {
        loadInitStatus(selectedTenantId);
      }, 5000);
    }
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, [selectedTenantId, loadWorkspaces, loadInitStatus]);

  useEffect(() => {
    loadAllLogs();
  }, [loadAllLogs]);

  const tenantOptions = tenants.map(tenant => ({
    value: tenant.id,
    label: tenant.company_name || `Tenant ${tenant.id}`
  }));

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.id,
    label: `${workspace.name} (${workspace.type.toUpperCase()})`
  }));

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
  const dataTypeOptions = selectedWorkspace?.type === 'kms' 
    ? [
        { value: 'KNOWLEDGE', label: '지식문서' },
        { value: 'FAQ', label: 'FAQ' }
      ]
    : [
        { value: 'SCENARIO', label: '시나리오' },
        { value: 'TEMPLATE', label: '템플릿' }
      ];

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">데이터 초기화</h1>
        <p className="text-gray-600">테넌트 스키마 초기화 및 워크스페이스 데이터 업로드</p>
      </div>

      {/* 1. 테넌트 선택 */}
      <Card title="테넌트 선택" className="bg-blue-50">
        <div className="max-w-md">
          <Select
            label="테넌트"
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            options={[
              { value: '', label: '테넌트를 선택하세요' },
              ...tenantOptions
            ]}
            fullWidth
          />
        </div>
      </Card>

      {/* 2. 초기화 진행 상태 */}
      {selectedTenantId && (
        <Card title="초기화 진행 상태" className="bg-green-50">
          {statusLoading ? (
            <div className="text-center py-4">
              <LoadingText text="상태 조회 중" />
            </div>
          ) : initStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">전체 진행률:</span>
                <span className="text-lg font-bold text-green-600">
                  {initStatus.overall_progress?.completed || 0}/{initStatus.overall_progress?.total || 0} 완료
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="font-semibold text-gray-700">스키마 초기화</div>
                  <div className={`mt-1 px-2 py-1 rounded-full text-sm ${
                    initStatus.schema_initialized 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {initStatus.schema_initialized ? '완료' : '대기'}
                  </div>
                </div>
                
                {(initStatus.workspaces || []).map((workspace) => (
                  <div key={workspace.workspace_id} className="text-center p-3 bg-white rounded-lg shadow-sm">
                    <div className="font-semibold text-gray-700 text-sm">{workspace.workspace_name}</div>
                    <div className="mt-1 space-y-1">
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        workspace.data_uploaded 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        데이터: {workspace.data_uploaded ? '완료' : '대기'}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        workspace.config_applied 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        설정: {workspace.config_applied ? '완료' : '대기'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">상태 정보를 불러올 수 없습니다.</div>
          )}
        </Card>
      )}

      {selectedTenantId && (
        <>
          {/* 3. 스키마 초기화 */}
          <Card title="스키마 초기화" className="bg-blue-50">
            <div className="space-y-4">
              <p className="text-gray-600">
                선택된 테넌트의 데이터베이스에 필요한 테이블과 스키마를 생성합니다.
              </p>
              
              <Button
                variant="primary"
                onClick={handleSchemaInit}
                disabled={schemaLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {schemaLoading ? <LoadingText text="DB 스키마 초기화 중" /> : 'DB 스키마 초기화'}
              </Button>
              
              {/* 실시간 로그 */}
              {logs && logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">초기화 로그</h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-60 overflow-y-auto font-mono text-sm">
                    {(logs || []).slice(0, 10).map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-400">[{dataInitService.formatTimestamp(log.timestamp)}]</span>
                        <span className={`ml-2 ${
                          log.status === 'failed' ? 'text-red-400' : 
                          log.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 4. 워크스페이스별 데이터 업로드 */}
          <Card title="워크스페이스별 데이터 업로드" className="bg-green-50">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="워크스페이스"
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  options={[
                    { value: '', label: '워크스페이스를 선택하세요' },
                    ...workspaceOptions
                  ]}
                  fullWidth
                />
                
                <Select
                  label="데이터 타입"
                  value={selectedDataType}
                  onChange={(e) => setSelectedDataType(e.target.value as DataType)}
                  options={[
                    { value: '', label: '데이터 타입을 선택하세요' },
                    ...dataTypeOptions
                  ]}
                  fullWidth
                  disabled={!selectedWorkspaceId}
                />
              </div>
              
              {/* 파일 업로드 영역 */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-green-500 bg-green-100' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  {isDragActive ? (
                    <p className="text-green-600">파일을 여기에 놓으세요...</p>
                  ) : (
                    <>
                      <p className="text-gray-600">파일을 드래그하거나 클릭하여 업로드</p>
                      <p className="text-sm text-gray-500">
                        지원 형식: {dataInitService.getFileTypeText()}
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              {/* 업로드된 파일 목록 */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">업로드할 파일 ({uploadFiles.length}개)</h4>
                  <div className="space-y-1">
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">{file.name} ({Math.round(file.size / 1024)} KB)</span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          제거
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                variant="primary"
                onClick={handleDataUpload}
                disabled={uploadLoading || !selectedWorkspaceId || !selectedDataType || uploadFiles.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploadLoading ? <LoadingText text="데이터 업로드 중" /> : '데이터 업로드'}
              </Button>
            </div>
          </Card>

          {/* 5. 워크스페이스 설정 적용 */}
          <Card title="워크스페이스 설정 적용" className="bg-pink-50">
            <div className="space-y-4">
              <p className="text-gray-600">
                워크스페이스의 설정을 데이터베이스에 적용합니다. (벡터 인덱스, 트리거 규칙 등)
              </p>
              
              <Select
                label="워크스페이스"
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                options={[
                  { value: '', label: '워크스페이스를 선택하세요' },
                  ...workspaceOptions
                ]}
                fullWidth
              />
              
              <Button
                variant="primary"
                onClick={handleConfigApply}
                disabled={configLoading || !selectedWorkspaceId}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {configLoading ? <LoadingText text="설정 적용 중" /> : '설정 적용'}
              </Button>
            </div>
          </Card>

          {/* 6. 초기화 로그 */}
          <Card title="초기화 로그" className="bg-yellow-50">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Select
                  label="필터"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as InitializationStatus | 'all')}
                  options={[
                    { value: 'all', label: '전체' },
                    { value: 'completed', label: '성공' },
                    { value: 'failed', label: '실패' },
                    { value: 'in_progress', label: '진행중' },
                    { value: 'pending', label: '대기' }
                  ]}
                />
                <Button
                  variant="secondary"
                  onClick={loadAllLogs}
                  size="sm"
                >
                  새로고침
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAllLogs && filteredAllLogs.length > 0 ? (
                      (filteredAllLogs || []).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {dataInitService.formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{log.action}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${dataInitService.getStatusColor(log.status)}`}>
                              {dataInitService.getStatusText(log.status)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {log.message}
                            {log.error && (
                              <div className="text-red-600 text-xs mt-1">오류: {log.error}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          로그가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DataInitialization;