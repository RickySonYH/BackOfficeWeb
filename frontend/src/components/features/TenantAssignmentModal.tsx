// [advice from AI] 테넌트 할당 모달 컴포넌트
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { solutionDeploymentService } from '../../services/solutionDeploymentService';
import { tenantService } from '../../services/tenantService';
import { DeployedSolution, TenantAssignmentFormData } from '../../types/solution-deployment';
import { Tenant } from '../../types/tenant';

interface TenantAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  solution: DeployedSolution;
}

interface FormErrors {
  tenant_id?: string;
  allocated_cpu_cores?: string;
  allocated_memory_gb?: string;
  allocated_storage_gb?: string;
  assigned_subdomain?: string;
}

const TenantAssignmentModal: React.FC<TenantAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  solution
}) => {
  const [formData, setFormData] = useState<TenantAssignmentFormData>({
    tenant_id: '',
    solution_id: solution.id,
    allocated_cpu_cores: 0.5,
    allocated_memory_gb: 1.0,
    allocated_storage_gb: 10.0,
    assigned_subdomain: '',
    priority: 0
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // 사용 가능한 리소스 계산
  const availableCpu = solution.max_cpu_cores - solution.current_cpu_usage;
  const availableMemory = solution.max_memory_gb - solution.current_memory_usage;
  const availableTenants = solution.max_tenants - solution.current_tenants;

  // 테넌트 목록 로드
  useEffect(() => {
    const loadTenants = async () => {
      setTenantsLoading(true);
      try {
        const result = await tenantService.getTenants(1, 100); // 최대 100개 테넌트 로드
        if (result.success) {
          // 이미 할당된 테넌트는 제외 (실제로는 백엔드에서 필터링해야 함)
          setTenants(result.data);
        }
      } catch (error) {
        console.error('Failed to load tenants:', error);
      } finally {
        setTenantsLoading(false);
      }
    };

    if (isOpen) {
      loadTenants();
    }
  }, [isOpen]);

  const tenantOptions = tenants.map(tenant => ({
    value: tenant.id,
    label: `${tenant.tenant_key} (${tenant.company?.name || 'Unknown Company'})`
  }));

  const handleChange = (field: keyof TenantAssignmentFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 메시지 제거
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof TenantAssignmentFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 메시지 제거
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tenant_id) {
      newErrors.tenant_id = '테넌트를 선택하세요';
    }

    if (formData.allocated_cpu_cores <= 0) {
      newErrors.allocated_cpu_cores = 'CPU 할당량은 0보다 커야 합니다';
    } else if (formData.allocated_cpu_cores > availableCpu) {
      newErrors.allocated_cpu_cores = `사용 가능한 CPU는 ${availableCpu.toFixed(2)} cores입니다`;
    }

    if (formData.allocated_memory_gb <= 0) {
      newErrors.allocated_memory_gb = '메모리 할당량은 0보다 커야 합니다';
    } else if (formData.allocated_memory_gb > availableMemory) {
      newErrors.allocated_memory_gb = `사용 가능한 메모리는 ${availableMemory.toFixed(2)} GB입니다`;
    }

    if (formData.allocated_storage_gb <= 0) {
      newErrors.allocated_storage_gb = '스토리지 할당량은 0보다 커야 합니다';
    }

    if (availableTenants <= 0) {
      newErrors.tenant_id = '이 솔루션은 최대 테넌트 수에 도달했습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await solutionDeploymentService.assignTenantToSolution(formData);
      
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ tenant_id: result.error || 'Failed to assign tenant' });
      }
    } catch (error) {
      console.error('Failed to assign tenant:', error);
      setErrors({ tenant_id: 'Failed to assign tenant' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        tenant_id: '',
        solution_id: solution.id,
        allocated_cpu_cores: 0.5,
        allocated_memory_gb: 1.0,
        allocated_storage_gb: 10.0,
        assigned_subdomain: '',
        priority: 0
      });
      setErrors({});
      onClose();
    }
  };

  // 권장 리소스 할당량 계산
  const getRecommendedAllocation = () => {
    const remainingTenants = Math.max(1, availableTenants);
    return {
      cpu: Math.min(1.0, availableCpu / remainingTenants),
      memory: Math.min(2.0, availableMemory / remainingTenants)
    };
  };

  const recommended = getRecommendedAllocation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`테넌트 할당 - ${solution.solution_name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 솔루션 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">솔루션 리소스 현황</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">테넌트</div>
              <div className="font-medium">
                {solution.current_tenants}/{solution.max_tenants} 
                <span className="text-green-600 ml-1">(+{availableTenants})</span>
              </div>
            </div>
            <div>
              <div className="text-gray-500">CPU</div>
              <div className="font-medium">
                {solutionDeploymentService.formatCpuCores(solution.current_cpu_usage)}/
                {solutionDeploymentService.formatCpuCores(solution.max_cpu_cores)}
                <span className="text-green-600 ml-1">
                  (+{solutionDeploymentService.formatCpuCores(availableCpu)})
                </span>
              </div>
            </div>
            <div>
              <div className="text-gray-500">메모리</div>
              <div className="font-medium">
                {solutionDeploymentService.formatMemory(solution.current_memory_usage)}/
                {solutionDeploymentService.formatMemory(solution.max_memory_gb)}
                <span className="text-green-600 ml-1">
                  (+{solutionDeploymentService.formatMemory(availableMemory)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 테넌트 선택 */}
        <Select
          label="할당할 테넌트 *"
          value={formData.tenant_id}
          onChange={handleSelectChange('tenant_id')}
          options={tenantOptions}
          error={errors.tenant_id}
          fullWidth
          placeholder={tenantsLoading ? "테넌트 로딩 중..." : "테넌트를 선택하세요"}
          disabled={loading || tenantsLoading}
        />

        {/* 리소스 할당 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">리소스 할당</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="CPU 할당량 (cores) *"
                type="number"
                value={formData.allocated_cpu_cores.toString()}
                onChange={handleChange('allocated_cpu_cores')}
                error={errors.allocated_cpu_cores}
                min="0.1"
                max={availableCpu}
                step="0.1"
                fullWidth
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                권장: {recommended.cpu.toFixed(1)} cores
              </div>
            </div>

            <div>
              <Input
                label="메모리 할당량 (GB) *"
                type="number"
                value={formData.allocated_memory_gb.toString()}
                onChange={handleChange('allocated_memory_gb')}
                error={errors.allocated_memory_gb}
                min="0.1"
                max={availableMemory}
                step="0.1"
                fullWidth
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                권장: {recommended.memory.toFixed(1)} GB
              </div>
            </div>
          </div>

          <Input
            label="스토리지 할당량 (GB) *"
            type="number"
            value={formData.allocated_storage_gb.toString()}
            onChange={handleChange('allocated_storage_gb')}
            error={errors.allocated_storage_gb}
            min="1"
            step="1"
            fullWidth
            disabled={loading}
          />
        </div>

        {/* 네트워크 설정 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">네트워크 설정 (선택사항)</h4>
          
          <Input
            label="할당 서브도메인"
            value={formData.assigned_subdomain || ''}
            onChange={handleChange('assigned_subdomain')}
            error={errors.assigned_subdomain}
            placeholder="tenant-name"
            fullWidth
            disabled={loading}
          />

          <Input
            label="우선순위"
            type="number"
            value={formData.priority.toString()}
            onChange={handleChange('priority')}
            min="0"
            step="1"
            fullWidth
            disabled={loading}
            help="높은 숫자일수록 높은 우선순위"
          />
        </div>

        {/* 권장 설정 버튼 */}
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                allocated_cpu_cores: recommended.cpu,
                allocated_memory_gb: recommended.memory
              }));
            }}
            variant="light"
            size="sm"
            disabled={loading}
          >
            권장 설정 적용
          </Button>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="light"
            disabled={loading}
          >
            취소
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || tenantsLoading || availableTenants <= 0}
            isLoading={loading}
          >
            할당
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TenantAssignmentModal;
