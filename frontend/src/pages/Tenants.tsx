// frontend/src/pages/Tenants.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Select from '../components/common/Select';
import TenantModal from '../components/features/TenantModal';
import { Tenant } from '../types/tenant';
import { Company } from '../types/company';
import { tenantService } from '../services/tenantService';
import { companyService } from '../services/companyService';

const Tenants: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const limit = 10;

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 테넌트 목록 로드
  const loadTenants = async (page: number = currentPage, companyId?: string) => {
    try {
      setLoading(true);
      const response = await tenantService.getTenants(page, limit, companyId);
      
      if (response.success && response.data) {
        setTenants(response.data.tenants);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        console.error('Failed to load tenants:', response.error);
        setTenants([]);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  // 회사 목록 로드
  const loadCompanies = async () => {
    try {
      const response = await companyService.getCompanies(1, 100); // 모든 회사 조회
      if (response.success && response.data) {
        setCompanies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadTenants(1);
  }, []);

  // 회사 필터 변경
  const handleCompanyFilterChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    loadTenants(1, companyId || undefined);
  };

  // 테넌트 생성 모달 열기
  const handleCreateTenant = () => {
    setIsModalOpen(true);
  };

  // 테넌트 상세 페이지로 이동
  const handleViewTenant = (tenant: Tenant) => {
    navigate(`/tenants/${tenant.id}`);
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadTenants(page, selectedCompanyId || undefined);
    }
  };

  // 배포 상태 표시 함수
  const getDeploymentStatusDisplay = (status: string) => {
    const statusInfo = tenantService.getDeploymentStatusDisplay(status);
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return tenantService.formatDate(dateString);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      key: 'tenant_key' as keyof Tenant,
      label: '테넌트 키',
      render: (value: string) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{value}</span>
      )
    },
    {
      key: 'company_name' as keyof Tenant,
      label: '회사명',
      render: (value: string) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'kubernetes_namespace' as keyof Tenant,
      label: 'Namespace',
      render: (value: string) => (
        <span className="font-mono text-xs text-gray-600">{value}</span>
      )
    },
    {
      key: 'deployment_status' as keyof Tenant,
      label: '배포 상태',
      render: (value: string) => getDeploymentStatusDisplay(value)
    },
    {
      key: 'created_at' as keyof Tenant,
      label: '생성일',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'id' as keyof Tenant,
      label: '액션',
      render: (value: string, tenant: Tenant) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewTenant(tenant)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            상세보기
          </button>
        </div>
      )
    }
  ];

  // 회사 선택 옵션 생성
  const companyOptions = [
    { value: '', label: '전체 회사' },
    ...companies.map(company => ({
      value: company.id,
      label: company.name,
      disabled: company.status === 'inactive'
    }))
  ];

  // 페이지네이션 버튼 생성
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);

    // 이전 버튼
    buttons.push(
      <Button
        key="prev"
        variant="light"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
      >
        이전
      </Button>
    );

    // 페이지 번호 버튼들
    for (let page = startPage; page <= endPage; page++) {
      buttons.push(
        <Button
          key={page}
          variant={page === currentPage ? "primary" : "light"}
          size="sm"
          onClick={() => handlePageChange(page)}
          disabled={loading}
        >
          {page}
        </Button>
      );
    }

    // 다음 버튼
    buttons.push(
      <Button
        key="next"
        variant="light"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
      >
        다음
      </Button>
    );

    return buttons;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text">테넌트 관리</h1>
        <div className="text-sm text-gray-600">
          총 {total}개의 테넌트
        </div>
      </div>
      
      <Card>
        {/* 필터 및 액션 버튼 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <Select
                label="회사 필터"
                value={selectedCompanyId}
                onChange={handleCompanyFilterChange}
                options={companyOptions}
                placeholder="전체 회사"
                disabled={loading}
              />
            </div>
          </div>
          
          <Button 
            variant="primary" 
            onClick={handleCreateTenant}
            disabled={loading}
          >
            테넌트 생성
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <p className="text-gray-500 mb-4">
                {selectedCompanyId ? '해당 회사의 테넌트가 없습니다.' : '등록된 테넌트가 없습니다.'}
              </p>
              <Button variant="primary" onClick={handleCreateTenant}>
                첫 번째 테넌트 생성
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Table 
              data={tenants} 
              columns={columns}
              isLoading={loading}
              emptyMessage="등록된 테넌트가 없습니다."
            />
            
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                {renderPaginationButtons()}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 테넌트 생성 모달 */}
      <TenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          loadTenants(currentPage, selectedCompanyId || undefined);
          setIsModalOpen(false);
        }}
        companies={companies}
      />
    </div>
  );
};

export default Tenants;
