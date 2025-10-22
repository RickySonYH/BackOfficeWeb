import React, { useState } from 'react';
import Button from '../common/Button';
import { DatabaseType } from '../../types/dataInit';
import { dataInitService } from '../../services/dataInitService';

interface TenantDatabaseInitProps {
  tenantId: string;
  onInitializationComplete: () => void;
}

const TenantDatabaseInit: React.FC<TenantDatabaseInitProps> = ({ 
  tenantId, 
  onInitializationComplete 
}) => {
  const [selectedDatabases, setSelectedDatabases] = useState<DatabaseType[]>(['postgresql', 'mongodb']);
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState<any>(null);

  const databaseOptions = [
    {
      type: 'postgresql' as DatabaseType,
      name: 'PostgreSQL',
      description: '관계형 데이터베이스 - call_history, call_scripts, knowledge_base 테이블 생성',
      icon: '🐘'
    },
    {
      type: 'mongodb' as DatabaseType,
      name: 'MongoDB',
      description: '문서형 데이터베이스 - kms_documents, kms_categories, advisor_templates 컬렉션 생성',
      icon: '🍃'
    }
  ];

  // 데이터베이스 선택 토글
  const toggleDatabase = (dbType: DatabaseType) => {
    setSelectedDatabases(prev => 
      prev.includes(dbType) 
        ? prev.filter(db => db !== dbType)
        : [...prev, dbType]
    );
  };

  // 데이터베이스 초기화 실행
  const handleInitialize = async () => {
    if (selectedDatabases.length === 0) {
      alert('최소 1개의 데이터베이스를 선택해야 합니다.');
      return;
    }

    const confirmed = window.confirm(
      `선택한 데이터베이스를 초기화하시겠습니까?\n\n` +
      `대상: ${selectedDatabases.map(db => dataInitService.getDatabaseTypeDisplayName(db)).join(', ')}\n\n` +
      `⚠️ 이 작업은 되돌릴 수 없습니다!`
    );

    if (!confirmed) return;

    try {
      setInitializing(true);
      setInitResult(null);
      
      const result = await dataInitService.initializeTenantDatabase(tenantId, selectedDatabases);
      setInitResult(result);
      
      if (result.success) {
        alert('데이터베이스 초기화가 완료되었습니다!');
        onInitializationComplete();
      } else {
        alert(`데이터베이스 초기화 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      alert('데이터베이스 초기화 중 오류가 발생했습니다.');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 데이터베이스 선택 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">초기화할 데이터베이스 선택</h3>
        <div className="space-y-3">
          {databaseOptions.map((db) => (
            <div
              key={db.type}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedDatabases.includes(db.type)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleDatabase(db.type)}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedDatabases.includes(db.type)}
                  onChange={() => toggleDatabase(db.type)}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{db.icon}</span>
                    <h4 className="font-medium text-gray-900">{db.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{db.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 초기화 작업 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 초기화 작업 내용</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {selectedDatabases.includes('postgresql') && (
            <div>
              <strong>PostgreSQL:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>call_history - 상담 이력 테이블</li>
                <li>call_scripts - 상담 스크립트 테이블</li>
                <li>knowledge_base - 지식 베이스 테이블</li>
                <li>인덱스 및 제약조건 생성</li>
              </ul>
            </div>
          )}
          {selectedDatabases.includes('mongodb') && (
            <div className="mt-3">
              <strong>MongoDB:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>kms_documents - KMS 문서 컬렉션</li>
                <li>kms_categories - 카테고리 컬렉션</li>
                <li>advisor_templates - 어드바이저 템플릿 컬렉션</li>
                <li>인덱스 및 스키마 검증 규칙 생성</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 초기화 결과 */}
      {initResult && (
        <div className={`border rounded-lg p-4 ${
          initResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <h4 className={`font-medium mb-2 ${
            initResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {initResult.success ? '✅ 초기화 완료' : '❌ 초기화 실패'}
          </h4>
          
          {initResult.success && initResult.data && (
            <div className="text-sm text-green-800">
              <p>초기화된 데이터베이스: {initResult.data.initialized_databases.join(', ')}</p>
              {initResult.data.logs && initResult.data.logs.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">로그:</p>
                  <ul className="list-disc list-inside ml-4">
                    {initResult.data.logs.slice(0, 3).map((log: any, index: number) => (
                      <li key={index}>{dataInitService.formatLogMessage(log)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {!initResult.success && (
            <p className="text-sm text-red-800">{initResult.error}</p>
          )}
        </div>
      )}

      {/* 초기화 버튼 */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleInitialize}
          disabled={initializing || selectedDatabases.length === 0}
          className="bg-red-500 hover:bg-red-600"
        >
          {initializing ? '초기화 중...' : '🗄️ 데이터베이스 초기화 실행'}
        </Button>
      </div>

      {/* 진행 상태 */}
      {initializing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
            <div>
              <p className="font-medium text-yellow-900">데이터베이스 초기화 진행 중...</p>
              <p className="text-sm text-yellow-800">
                선택한 데이터베이스에 스키마와 인덱스를 생성하고 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDatabaseInit;
