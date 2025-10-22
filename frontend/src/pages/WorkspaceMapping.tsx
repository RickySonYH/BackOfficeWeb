import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import TenantMappingComponent from '../components/features/TenantMappingComponent';
import { TenantWorkspaceMapping } from '../types/workspace';
import { Company } from '../types/company';
import { workspaceService } from '../services/workspaceService';
import { companyService } from '../services/companyService';

const WorkspaceMapping: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantMapping, setTenantMapping] = useState<TenantWorkspaceMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);

  // 회사 목록 로드
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyService.getCompanies(1, 50);
      if (response.success && response.data) {
        setCompanies(response.data.data);
      } else {
        console.error('Failed to load companies:', response.error);
        setCompanies([]);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // 테넌트 워크스페이스 맵핑 로드
  const loadTenantMapping = async (tenantId: string) => {
    if (!tenantId) {
      setTenantMapping(null);
      return;
    }

    try {
      setMappingLoading(true);
      const response = await workspaceService.getTenantWorkspaceMapping(tenantId);
      if (response.success && response.data) {
        setTenantMapping(response.data);
      } else {
        console.error('Failed to load tenant mapping:', response.error);
        setTenantMapping(null);
      }
    } catch (error) {
      console.error('Failed to load tenant mapping:', error);
      setTenantMapping(null);
    } finally {
      setMappingLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // 테넌트 선택 변경
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    loadTenantMapping(tenantId);
  };

  // 맵핑 저장 완료 핸들러
  const handleMappingSaved = () => {
    if (selectedTenantId) {
      loadTenantMapping(selectedTenantId);
    }
  };

  // 테넌트 옵션 생성
  const tenantOptions = [
    { value: '', label: '테넌트를 선택하세요' },
    ...companies.map(company => ({
      value: company.id,
      label: company.name
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">워크스페이스 맵핑 설정</h1>
          <p className="text-gray-600 mt-1">테넌트별 워크스페이스 우선순위 및 기본 설정을 관리합니다</p>
        </div>
      </div>

      {/* 설정 안내 */}
      <Card title="설정 안내">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">중요 안내사항</h3>
              <div className="mt-2 text-sm text-orange-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>각 테넌트마다 KMS와 어드바이저 타입별로 기본 워크스페이스를 지정할 수 있습니다</li>
                  <li>우선순위 번호가 낮을수록 높은 우선순위를 가집니다 (1이 최고 우선순위)</li>
                  <li>기본 설정으로 지정된 워크스페이스는 자동으로 우선순위 1번이 됩니다</li>
                  <li>설정 변경 사항은 즉시 시스템에 반영됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 테넌트 선택 */}
      <Card title="테넌트 선택">
        <div className="max-w-md">
          <Select
            label="테넌트"
            value={selectedTenantId}
            onChange={handleTenantChange}
            options={tenantOptions}
            fullWidth
            disabled={loading}
          />
        </div>
      </Card>

      {/* 테넌트별 맵핑 설정 */}
      {selectedTenantId && (
        <Card title={`${companies.find(c => c.id === selectedTenantId)?.name || '선택된 테넌트'}의 워크스페이스 맵핑`}>
          {mappingLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">맵핑 정보를 로드 중입니다...</div>
            </div>
          ) : (
            <TenantMappingComponent
              tenantId={selectedTenantId}
              mapping={tenantMapping}
              onMappingSaved={handleMappingSaved}
            />
          )}
        </Card>
      )}

      {!selectedTenantId && (
        <Card title="시작하기">
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              위에서 테넌트를 선택하여 워크스페이스 맵핑을 설정하세요.
            </div>
            <div className="text-sm text-gray-400">
              각 테넌트별로 워크스페이스 우선순위와 기본 설정을 관리할 수 있습니다.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WorkspaceMapping;
