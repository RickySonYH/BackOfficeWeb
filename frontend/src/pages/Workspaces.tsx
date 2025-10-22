import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Select from '../components/common/Select';
import WorkspaceModal from '../components/features/WorkspaceModal';
import { Workspace, WorkspaceType } from '../types/workspace';
import { Company } from '../types/company';
import { workspaceService } from '../services/workspaceService';
import { companyService } from '../services/companyService';

const Workspaces: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // 모달 상태
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // 워크스페이스 목록 로드
  const loadWorkspaces = async (tenantId?: string) => {
    try {
      setLoading(true);
      const response = await workspaceService.getWorkspaces(1, 50, tenantId);
      if (response.success && response.data) {
        setWorkspaces(response.data.workspaces);
      } else {
        console.error('Failed to load workspaces:', response.error);
        setWorkspaces([]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  // 회사 목록 로드
  const loadCompanies = async () => {
    try {
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
    }
  };

  useEffect(() => {
    loadWorkspaces();
    loadCompanies();
  }, []);

  // 테넌트 필터 변경
  const handleTenantFilterChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    loadWorkspaces(tenantId || undefined);
  };

  // 워크스페이스 상세 페이지로 이동
  const handleWorkspaceClick = (workspaceId: string) => {
    navigate(`/workspaces/${workspaceId}`);
  };

  // 테넌트 옵션 생성
  const tenantOptions = [
    { value: '', label: '전체 테넌트' },
    ...companies.map(company => ({
      value: company.id,
      label: company.name
    }))
  ];

  // 워크스페이스 테이블 컬럼 정의
  const workspaceColumns = [
    { 
      key: 'name' as keyof Workspace, 
      label: '워크스페이스명',
      render: (value: string, workspace: Workspace) => (
        <div>
          <button
            onClick={() => handleWorkspaceClick(workspace.id)}
            className="font-medium text-primary hover:text-primary-dark hover:underline text-left"
          >
            {value}
          </button>
          {workspace.description && (
            <div className="text-sm text-gray-500 mt-1">{workspace.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'type' as keyof Workspace,
      label: '타입',
      render: (value: WorkspaceType) => {
        const typeDisplay = workspaceService.getWorkspaceTypeDisplay(value);
        return (
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${typeDisplay.color}`}>
            <span className="mr-1">{typeDisplay.icon}</span>
            {typeDisplay.text}
          </span>
        );
      }
    },
    {
      key: 'status' as keyof Workspace,
      label: '상태',
      render: (value: string) => {
        const statusDisplay = workspaceService.getWorkspaceStatusDisplay(value as any);
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
        );
      }
    },
    { 
      key: 'tenant_name' as keyof Workspace, 
      label: '소속 테넌트',
      render: (value: string | undefined) => value || '-'
    },
    {
      key: 'created_at' as keyof Workspace,
      label: '생성일',
      render: (value: string) => workspaceService.formatDate(value)
    },
    {
      key: 'updated_at' as keyof Workspace,
      label: '최종 수정일',
      render: (value: string) => workspaceService.formatDate(value)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">워크스페이스 관리</h1>
          <p className="text-gray-600 mt-1">KMS 및 상담 어드바이저 워크스페이스를 관리합니다</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsWorkspaceModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600"
        >
          워크스페이스 생성
        </Button>
      </div>

      {/* 워크스페이스 타입 설명 */}
      <Card title="워크스페이스 타입">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspaceService.getWorkspaceTypeDescriptions().map((type) => (
            <div key={type.type} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50">
              <div className="text-2xl">{type.icon}</div>
              <div>
                <h3 className="font-medium text-gray-900">{type.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 워크스페이스 목록 */}
      <Card title="워크스페이스 목록">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Select
              label="테넌트 필터"
              value={selectedTenantId}
              onChange={handleTenantFilterChange}
              options={tenantOptions}
              className="min-w-48"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {workspaces.length}개의 워크스페이스
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">워크스페이스 목록을 로드 중입니다...</div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">등록된 워크스페이스가 없습니다.</div>
            <Button 
              variant="primary" 
              onClick={() => setIsWorkspaceModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              첫 번째 워크스페이스 생성
            </Button>
          </div>
        ) : (
          <Table
            data={workspaces}
            columns={workspaceColumns}
            emptyMessage="워크스페이스가 없습니다."
          />
        )}
      </Card>

      {/* 워크스페이스 생성 모달 */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSave={() => {
          loadWorkspaces(selectedTenantId || undefined);
          setIsWorkspaceModalOpen(false);
        }}
        companies={companies}
      />
    </div>
  );
};

export default Workspaces;