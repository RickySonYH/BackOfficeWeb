import React, { useState, useRef } from 'react';
import Button from '../common/Button';
import Select from '../common/Select';
import { Workspace } from '../../types/workspace';
import { DataType } from '../../types/dataInit';
import { dataInitService } from '../../services/dataInitService';

interface WorkspaceDataSeedingProps {
  workspaces: Workspace[];
  onSeedingComplete: () => void;
}

const WorkspaceDataSeeding: React.FC<WorkspaceDataSeedingProps> = ({ 
  workspaces, 
  onSeedingComplete 
}) => {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedDataType, setSelectedDataType] = useState<DataType | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  // 데이터 타입 옵션
  const getDataTypeOptions = () => {
    if (!selectedWorkspace) return [];
    
    const recommendedTypes = dataInitService.getRecommendedDataTypes(selectedWorkspace.type);
    const allTypes: DataType[] = ['KNOWLEDGE', 'FAQ', 'SCENARIO', 'TEMPLATE'];
    
    return allTypes.map(type => ({
      value: type,
      label: `${type} ${recommendedTypes.includes(type) ? '(권장)' : ''}`,
      recommended: recommendedTypes.includes(type)
    }));
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setSeedResult(null);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
    setSeedResult(null);
  };

  // 파일 제거
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 데이터 시딩 실행
  const handleSeed = async () => {
    if (!selectedWorkspaceId || !selectedDataType || selectedFiles.length === 0) {
      alert('워크스페이스, 데이터 타입, 파일을 모두 선택해야 합니다.');
      return;
    }

    // 파일 검증
    const validation = dataInitService.validateFiles(selectedFiles);
    if (!validation.valid) {
      alert(`파일 검증 실패:\n${validation.errors.join('\n')}`);
      return;
    }

    const confirmed = window.confirm(
      `선택한 파일을 워크스페이스에 업로드하시겠습니까?\n\n` +
      `워크스페이스: ${selectedWorkspace?.name}\n` +
      `데이터 타입: ${selectedDataType}\n` +
      `파일 수: ${selectedFiles.length}개\n\n` +
      `⚠️ 기존 데이터와 중복될 수 있습니다!`
    );

    if (!confirmed) return;

    try {
      setSeeding(true);
      setSeedResult(null);
      
      const result = await dataInitService.seedWorkspaceData(
        selectedWorkspaceId,
        selectedDataType,
        selectedFiles,
        {
          batch_size: 100,
          overwrite_existing: false,
          auto_categorize: true
        }
      );
      
      setSeedResult(result);
      
      if (result.success) {
        alert('데이터 시딩이 완료되었습니다!');
        onSeedingComplete();
        // 파일 선택 초기화
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert(`데이터 시딩 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Data seeding failed:', error);
      alert('데이터 시딩 중 오류가 발생했습니다.');
    } finally {
      setSeeding(false);
    }
  };

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.id,
    label: `${workspace.name} (${workspace.type.toUpperCase()})`
  }));

  return (
    <div className="space-y-6">
      {/* 워크스페이스 및 데이터 타입 선택 */}
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
          disabled={seeding}
        />
        
        <Select
          label="데이터 타입"
          value={selectedDataType}
          onChange={(e) => setSelectedDataType(e.target.value as DataType)}
          options={[
            { value: '', label: '데이터 타입을 선택하세요' },
            ...getDataTypeOptions()
          ]}
          fullWidth
          disabled={seeding || !selectedWorkspaceId}
        />
      </div>

      {/* 데이터 타입 설명 */}
      {selectedDataType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📋 {selectedDataType} 데이터 타입 안내</h4>
          <p className="text-sm text-blue-800">
            {dataInitService.getDataTypeDescription(selectedDataType)}
          </p>
        </div>
      )}

      {/* 파일 업로드 영역 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">파일 업로드</h3>
        
        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                파일을 드래그하여 업로드하거나 클릭하여 선택하세요
              </p>
              <p className="text-sm text-gray-500 mt-2">
                CSV, JSON, XLSX, PDF, TXT 파일을 지원합니다 (최대 10MB, 10개 파일)
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={seeding}
            >
              파일 선택
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.xlsx,.xls,.pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 선택된 파일 목록 */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-3">
              선택된 파일 ({selectedFiles.length}개)
            </h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {file.name.endsWith('.pdf') ? '📄' :
                       file.name.endsWith('.csv') ? '📊' :
                       file.name.endsWith('.json') ? '📋' :
                       file.name.includes('.xls') ? '📈' : '📝'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {dataInitService.formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={seeding}
                  >
                    제거
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 시딩 결과 */}
      {seedResult && (
        <div className={`border rounded-lg p-4 ${
          seedResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <h4 className={`font-medium mb-2 ${
            seedResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {seedResult.success ? '✅ 데이터 시딩 완료' : '❌ 데이터 시딩 실패'}
          </h4>
          
          {seedResult.success && seedResult.data && (
            <div className="text-sm text-green-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="font-medium">처리된 파일</p>
                  <p>{seedResult.data.processed_files}개</p>
                </div>
                <div>
                  <p className="font-medium">총 레코드</p>
                  <p>{seedResult.data.total_records}개</p>
                </div>
                <div>
                  <p className="font-medium">실패 레코드</p>
                  <p>{seedResult.data.failed_records}개</p>
                </div>
                <div>
                  <p className="font-medium">처리 시간</p>
                  <p>{dataInitService.formatProcessingTime(seedResult.data.processing_time)}</p>
                </div>
              </div>
            </div>
          )}
          
          {!seedResult.success && (
            <p className="text-sm text-red-800">{seedResult.error}</p>
          )}
        </div>
      )}

      {/* 시딩 버튼 */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSeed}
          disabled={
            seeding || 
            !selectedWorkspaceId || 
            !selectedDataType || 
            selectedFiles.length === 0
          }
          className="bg-green-500 hover:bg-green-600"
        >
          {seeding ? '시딩 중...' : '📤 데이터 시딩 실행'}
        </Button>
      </div>

      {/* 진행 상태 */}
      {seeding && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
            <div>
              <p className="font-medium text-yellow-900">데이터 시딩 진행 중...</p>
              <p className="text-sm text-yellow-800">
                파일을 파싱하고 데이터를 워크스페이스에 저장하고 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDataSeeding;
