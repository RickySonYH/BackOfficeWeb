import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import CompanyModal from '../components/features/CompanyModal';
import CompanySetupWizard from '../components/features/CompanySetupWizard';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Company } from '../types/company';
import { companyService } from '../services/companyService';

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // 완전한 회사 설정 마법사 상태
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // 삭제 확인 다이얼로그 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 회사 목록 로드
  const loadCompanies = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await companyService.getCompanies(page, limit);
      
      if (response.success && response.data) {
        setCompanies(response.data.data);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
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

  useEffect(() => {
    loadCompanies(1);
  }, []);

  // 회사 등록 모달 열기 (기본)
  const handleCreateCompany = () => {
    setModalMode('create');
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  // 완전한 회사 설정 생성 핸들러
  const handleCreateCompleteSetup = () => {
    setIsSetupWizardOpen(true);
  };

  // 완전한 회사 설정 성공 핸들러
  const handleSetupSuccess = (result: any) => {
    console.log('Complete company setup created:', result);
    // 회사 목록 새로고침
    loadCompanies(1);
    setCurrentPage(1);
  };

  // 회사 수정 모달 열기
  const handleEditCompany = (company: Company) => {
    setModalMode('edit');
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  // 회사 삭제 확인 다이얼로그 열기
  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  // 회사 삭제 실행
  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await companyService.deleteCompany(companyToDelete.id);
      
      if (response.success) {
        await loadCompanies(currentPage); // 현재 페이지 새로고침
        setIsDeleteDialogOpen(false);
        setCompanyToDelete(null);
      } else {
        console.error('Failed to delete company:', response.error);
        // 에러 처리
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
      // 에러 처리
    } finally {
      setDeleteLoading(false);
    }
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadCompanies(page);
    }
  };

  // 상태 표시 함수
  const getStatusDisplay = (status: string) => {
    return status === 'active' ? (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-success-100 text-success-800 rounded-full">
        활성
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
        비활성
      </span>
    );
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      key: 'name' as keyof Company,
      label: '회사명',
      render: (value: string) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'businessNumber' as keyof Company,
      label: '사업자번호'
    },
    {
      key: 'contractDate' as keyof Company,
      label: '계약일',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'status' as keyof Company,
      label: '상태',
      render: (value: string) => getStatusDisplay(value)
    },
    {
      key: 'createdAt' as keyof Company,
      label: '등록일',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'id' as keyof Company,
      label: '액션',
      render: (value: string, company: Company) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditCompany(company)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            수정
          </button>
          <button
            onClick={() => handleDeleteCompany(company)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            삭제
          </button>
        </div>
      )
    }
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
        <h1 className="text-3xl font-bold text-text">회사 관리</h1>
        <div className="text-sm text-gray-600">
          총 {total}개의 회사
        </div>
      </div>
      
      <Card>
        <div className="flex justify-end mb-6">
          <div className="flex space-x-3">
            <Button 
              variant="secondary" 
              onClick={handleCreateCompany}
              disabled={loading}
            >
              회사만 등록
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateCompleteSetup}
              disabled={loading}
            >
              완전한 설정 생성
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <p className="text-gray-500 mb-4">등록된 회사가 없습니다.</p>
              <Button variant="primary" onClick={handleCreateCompany}>
                첫 번째 회사 등록
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Table 
              data={companies} 
              columns={columns}
              isLoading={loading}
              emptyMessage="등록된 회사가 없습니다."
            />
            
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                {renderPaginationButtons()}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 회사 등록/수정 모달 */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => loadCompanies(currentPage)}
        company={selectedCompany}
        mode={modalMode}
      />

      {/* 완전한 회사 설정 생성 마법사 */}
      <CompanySetupWizard
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onSuccess={handleSetupSuccess}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={confirmDeleteCompany}
        title="회사 삭제 확인"
        message={`"${companyToDelete?.name}" 회사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

export default Companies;