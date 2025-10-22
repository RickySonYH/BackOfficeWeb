// [advice from AI] 솔루션 배포 관리 페이지
import React, { useState, useEffect, useCallback } from 'react';
import { solutionDeploymentService } from '../services/solutionDeploymentService';
import {
  DeployedSolution,
  SolutionResourceSummary,
  TenantResourceAllocation,
  SolutionFilter,
  SolutionSortOptions
} from '../types/solution-deployment';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import SolutionRegistrationModal from '../components/features/SolutionRegistrationModal';
import TenantAssignmentModal from '../components/features/TenantAssignmentModal';

const SolutionDeployment: React.FC = () => {
  // 상태 관리
  const [solutions, setSolutions] = useState<DeployedSolution[]>([]);
  const [resourceSummary, setResourceSummary] = useState<SolutionResourceSummary[]>([]);
  const [tenantAllocations, setTenantAllocations] = useState<TenantResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 페이징 및 필터링
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSolutions, setTotalSolutions] = useState(0);
  const [pageSize] = useState(10);

  // 필터 및 정렬
  const [filter, setFilter] = useState<SolutionFilter>({});
  const [sort, setSort] = useState<SolutionSortOptions>({
    field: 'created_at',
    direction: 'desc'
  });

  // 모달 상태
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<DeployedSolution | null>(null);

  // 활성 탭
  const [activeTab, setActiveTab] = useState<'solutions' | 'resource-summary' | 'tenant-allocations'>('solutions');

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 병렬로 데이터 로드
      const [solutionsResult, resourceResult, tenantsResult] = await Promise.all([
        solutionDeploymentService.getSolutions(currentPage, pageSize, filter, sort),
        solutionDeploymentService.getResourceSummary(),
        solutionDeploymentService.getTenantAllocations()
      ]);

      if (solutionsResult.success) {
        setSolutions(solutionsResult.data);
        setTotalPages(solutionsResult.totalPages);
        setTotalSolutions(solutionsResult.total);
      } else {
        setError(solutionsResult.error || 'Failed to load solutions');
      }

      if (resourceResult.success) {
        setResourceSummary(resourceResult.data);
      }

      if (tenantsResult.success) {
        setTenantAllocations(tenantsResult.data);
      }

    } catch (err) {
      setError('Failed to load data');
      console.error('Failed to load solution deployment data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filter, sort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 헬스 체크 수행
  const handleHealthCheck = async (solutionId: string) => {
    try {
      const result = await solutionDeploymentService.performHealthCheck(solutionId);
      if (result.success) {
        // 솔루션 목록 새로고침
        await loadData();
      } else {
        setError(result.error || 'Failed to perform health check');
      }
    } catch (err) {
      setError('Failed to perform health check');
      console.error('Health check failed:', err);
    }
  };

  // 모든 헬스 체크 수행
  const handleAllHealthChecks = async () => {
    try {
      setLoading(true);
      const result = await solutionDeploymentService.performAllHealthChecks();
      if (result.success) {
        // 솔루션 목록 새로고침
        await loadData();
      } else {
        setError(result.error || 'Failed to perform health checks');
      }
    } catch (err) {
      setError('Failed to perform health checks');
      console.error('All health checks failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 솔루션 삭제
  const handleDeleteSolution = async (solutionId: string, force: boolean = false) => {
    if (!confirm('정말로 이 솔루션을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await solutionDeploymentService.deleteSolution(solutionId, force);
      if (result.success) {
        await loadData();
      } else {
        setError(result.error || 'Failed to delete solution');
      }
    } catch (err) {
      setError('Failed to delete solution');
      console.error('Solution deletion failed:', err);
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof SolutionFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로
  };

  // 정렬 변경 핸들러
  const handleSortChange = (field: SolutionSortOptions['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 솔루션 등록 성공 핸들러
  const handleRegistrationSuccess = () => {
    setShowRegistrationModal(false);
    loadData();
  };

  // 테넌트 할당 성공 핸들러
  const handleAssignmentSuccess = () => {
    setShowAssignmentModal(false);
    loadData();
  };

  if (loading && solutions.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-600">솔루션 배포 데이터를 로드 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">솔루션 배포 관리</h1>
          <p className="text-gray-600 mt-1">배포된 솔루션 인스턴스와 리소스 할당을 관리합니다</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleAllHealthChecks}
            variant="info"
            size="sm"
            disabled={loading}
          >
            전체 헬스 체크
          </Button>
          <Button
            onClick={() => setShowRegistrationModal(true)}
            variant="primary"
            size="sm"
          >
            솔루션 등록
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            닫기
          </button>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('solutions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'solutions'
                  ? 'border-[#A8D5E2] text-[#A8D5E2]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              솔루션 목록 ({totalSolutions})
            </button>
            <button
              onClick={() => setActiveTab('resource-summary')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'resource-summary'
                  ? 'border-[#A8D5E2] text-[#A8D5E2]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              리소스 요약 ({resourceSummary.length})
            </button>
            <button
              onClick={() => setActiveTab('tenant-allocations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tenant-allocations'
                  ? 'border-[#A8D5E2] text-[#A8D5E2]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              테넌트 할당 ({tenantAllocations.length})
            </button>
          </nav>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'solutions' && (
        <div>
          {/* 필터 및 검색 */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="상태"
                value={filter.status?.[0] || ''}
                onChange={(value) => handleFilterChange('status', value ? [value] : undefined)}
                options={[
                  { value: '', label: '전체' },
                  { value: 'active', label: '활성' },
                  { value: 'pending', label: '대기중' },
                  { value: 'deploying', label: '배포중' },
                  { value: 'maintenance', label: '유지보수' },
                  { value: 'failed', label: '실패' },
                  { value: 'retired', label: '폐기' }
                ]}
              />
              <Select
                label="배포 타입"
                value={filter.deployment_type?.[0] || ''}
                onChange={(value) => handleFilterChange('deployment_type', value ? [value] : undefined)}
                options={[
                  { value: '', label: '전체' },
                  { value: 'kubernetes', label: 'Kubernetes' },
                  { value: 'docker', label: 'Docker' },
                  { value: 'vm', label: 'VM' },
                  { value: 'cloud', label: 'Cloud' }
                ]}
              />
              <Select
                label="헬스 상태"
                value={filter.health_status?.[0] || ''}
                onChange={(value) => handleFilterChange('health_status', value ? [value] : undefined)}
                options={[
                  { value: '', label: '전체' },
                  { value: 'healthy', label: '정상' },
                  { value: 'unhealthy', label: '비정상' },
                  { value: 'unknown', label: '알 수 없음' }
                ]}
              />
              <Input
                label="클러스터"
                value={filter.kubernetes_cluster || ''}
                onChange={(e) => handleFilterChange('kubernetes_cluster', e.target.value || undefined)}
                placeholder="클러스터 이름"
              />
            </div>
          </div>

          {/* 솔루션 목록 테이블 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortChange('solution_name')}
                    >
                      솔루션 이름
                      {sort.field === 'solution_name' && (
                        <span className="ml-1">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      배포 타입
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      헬스 상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      테넌트 사용률
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPU 사용률
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메모리 사용률
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {solutions.map((solution) => {
                    const cpuPercent = (solution.current_cpu_usage / solution.max_cpu_cores) * 100;
                    const memoryPercent = (solution.current_memory_usage / solution.max_memory_gb) * 100;
                    const tenantPercent = (solution.current_tenants / solution.max_tenants) * 100;

                    return (
                      <tr key={solution.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {solution.solution_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              v{solution.solution_version}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {solution.deployment_type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            solutionDeploymentService.getStatusBgColor(solution.status)
                          } ${solutionDeploymentService.getStatusColor(solution.status)}`}>
                            {solution.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            solutionDeploymentService.getStatusBgColor(solution.health_status)
                          } ${solutionDeploymentService.getStatusColor(solution.health_status)}`}>
                            {solution.health_status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${solutionDeploymentService.getUsageColor(tenantPercent)}`}>
                                {solution.current_tenants}/{solution.max_tenants}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    tenantPercent >= 90 ? 'bg-red-500' :
                                    tenantPercent >= 75 ? 'bg-orange-500' :
                                    tenantPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(tenantPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${solutionDeploymentService.getUsageColor(cpuPercent)}`}>
                                {solutionDeploymentService.formatCpuCores(solution.current_cpu_usage)}/
                                {solutionDeploymentService.formatCpuCores(solution.max_cpu_cores)}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    cpuPercent >= 90 ? 'bg-red-500' :
                                    cpuPercent >= 75 ? 'bg-orange-500' :
                                    cpuPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${solutionDeploymentService.getUsageColor(memoryPercent)}`}>
                                {solutionDeploymentService.formatMemory(solution.current_memory_usage)}/
                                {solutionDeploymentService.formatMemory(solution.max_memory_gb)}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    memoryPercent >= 90 ? 'bg-red-500' :
                                    memoryPercent >= 75 ? 'bg-orange-500' :
                                    memoryPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(memoryPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleHealthCheck(solution.id)}
                              variant="light"
                              size="sm"
                            >
                              헬스 체크
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedSolution(solution);
                                setShowAssignmentModal(true);
                              }}
                              variant="info"
                              size="sm"
                            >
                              테넌트 할당
                            </Button>
                            <Button
                              onClick={() => handleDeleteSolution(solution.id)}
                              variant="danger"
                              size="sm"
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이징 */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <span>총 {totalSolutions}개 중 </span>
                    <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                    <span> - </span>
                    <span className="font-medium">{Math.min(currentPage * pageSize, totalSolutions)}</span>
                    <span> 표시</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="light"
                      size="sm"
                    >
                      이전
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <Button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          variant={currentPage === page ? "primary" : "light"}
                          size="sm"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="light"
                      size="sm"
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resource-summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {resourceSummary.map((summary) => (
            <div key={summary.solution_id} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{summary.solution_name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  solutionDeploymentService.getStatusBgColor(summary.status)
                } ${solutionDeploymentService.getStatusColor(summary.status)}`}>
                  {summary.status}
                </span>
              </div>
              
              <div className="space-y-4">
                {/* 테넌트 사용률 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">테넌트</span>
                    <span className="text-sm text-gray-500">
                      {summary.current_tenants}/{summary.max_tenants} ({summary.tenant_usage_percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        summary.tenant_usage_percent >= 90 ? 'bg-red-500' :
                        summary.tenant_usage_percent >= 75 ? 'bg-orange-500' :
                        summary.tenant_usage_percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(summary.tenant_usage_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* CPU 사용률 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">CPU</span>
                    <span className="text-sm text-gray-500">
                      {solutionDeploymentService.formatCpuCores(summary.current_cpu_usage)}/
                      {solutionDeploymentService.formatCpuCores(summary.max_cpu_cores)} ({summary.cpu_usage_percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        summary.cpu_usage_percent >= 90 ? 'bg-red-500' :
                        summary.cpu_usage_percent >= 75 ? 'bg-orange-500' :
                        summary.cpu_usage_percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(summary.cpu_usage_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 메모리 사용률 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">메모리</span>
                    <span className="text-sm text-gray-500">
                      {solutionDeploymentService.formatMemory(summary.current_memory_usage)}/
                      {solutionDeploymentService.formatMemory(summary.max_memory_gb)} ({summary.memory_usage_percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        summary.memory_usage_percent >= 90 ? 'bg-red-500' :
                        summary.memory_usage_percent >= 75 ? 'bg-orange-500' :
                        summary.memory_usage_percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(summary.memory_usage_percent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tenant-allocations' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    테넌트
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회사
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    솔루션
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    할당 CPU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    할당 메모리
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    실제 사용량
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    할당 일시
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenantAllocations.map((allocation) => (
                  <tr key={allocation.tenant_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.tenant_key}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {allocation.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {allocation.solution_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {allocation.allocated_cpu_cores ? 
                          solutionDeploymentService.formatCpuCores(allocation.allocated_cpu_cores) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {allocation.allocated_memory_gb ? 
                          solutionDeploymentService.formatMemory(allocation.allocated_memory_gb) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {allocation.actual_cpu_usage && allocation.actual_memory_usage ? (
                          <div>
                            <div>CPU: {solutionDeploymentService.formatCpuCores(allocation.actual_cpu_usage)}</div>
                            <div>MEM: {solutionDeploymentService.formatMemory(allocation.actual_memory_usage)}</div>
                          </div>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {allocation.mapping_status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          solutionDeploymentService.getStatusBgColor(allocation.mapping_status)
                        } ${solutionDeploymentService.getStatusColor(allocation.mapping_status)}`}>
                          {allocation.mapping_status}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">미할당</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500">
                        {allocation.assigned_at ? 
                          solutionDeploymentService.formatDateTime(allocation.assigned_at) : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 솔루션 등록 모달 */}
      {showRegistrationModal && (
        <SolutionRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* 테넌트 할당 모달 */}
      {showAssignmentModal && selectedSolution && (
        <TenantAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          onSuccess={handleAssignmentSuccess}
          solution={selectedSolution}
        />
      )}
    </div>
  );
};

export default SolutionDeployment;
