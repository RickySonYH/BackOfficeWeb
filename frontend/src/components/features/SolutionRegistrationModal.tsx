// [advice from AI] 솔루션 등록 모달 컴포넌트
import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import TextArea from '../common/TextArea';
import { solutionDeploymentService } from '../../services/solutionDeploymentService';
import { SolutionDeploymentFormData } from '../../types/solution-deployment';

interface SolutionRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  solution_name?: string;
  solution_version?: string;
  deployment_url?: string;
  deployment_type?: string;
  cpu_cores?: string;
  memory_gb?: string;
  storage_gb?: string;
  max_tenants?: string;
  max_cpu_cores?: string;
  max_memory_gb?: string;
  health_check_url?: string;
}

const SolutionRegistrationModal: React.FC<SolutionRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<SolutionDeploymentFormData>({
    solution_name: '',
    solution_version: '1.0.0',
    deployment_url: '',
    deployment_type: 'kubernetes',
    cpu_cores: 4,
    memory_gb: 8,
    storage_gb: 100,
    gpu_count: 0,
    max_tenants: 10,
    max_cpu_cores: 3.0,
    max_memory_gb: 6.0,
    kubernetes_cluster: '',
    kubernetes_namespace: '',
    internal_ip: '',
    external_ip: '',
    health_check_url: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 다단계 폼

  const deploymentTypeOptions = [
    { value: 'kubernetes', label: 'Kubernetes' },
    { value: 'docker', label: 'Docker' },
    { value: 'vm', label: 'Virtual Machine' },
    { value: 'cloud', label: 'Cloud Service' }
  ];

  const handleChange = (field: keyof SolutionDeploymentFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 메시지 제거
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof SolutionDeploymentFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 메시지 제거
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.solution_name.trim()) {
      newErrors.solution_name = '솔루션 이름을 입력하세요';
    }

    if (!formData.solution_version.trim()) {
      newErrors.solution_version = '솔루션 버전을 입력하세요';
    }

    if (!formData.deployment_url.trim()) {
      newErrors.deployment_url = '배포 URL을 입력하세요';
    } else {
      try {
        new URL(formData.deployment_url);
      } catch {
        newErrors.deployment_url = '유효한 URL을 입력하세요';
      }
    }

    if (!formData.deployment_type) {
      newErrors.deployment_type = '배포 타입을 선택하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.cpu_cores <= 0) {
      newErrors.cpu_cores = 'CPU 코어 수는 0보다 커야 합니다';
    }

    if (formData.memory_gb <= 0) {
      newErrors.memory_gb = '메모리 크기는 0보다 커야 합니다';
    }

    if (formData.storage_gb <= 0) {
      newErrors.storage_gb = '스토리지 크기는 0보다 커야 합니다';
    }

    if (formData.max_tenants <= 0) {
      newErrors.max_tenants = '최대 테넌트 수는 0보다 커야 합니다';
    }

    if (formData.max_cpu_cores <= 0) {
      newErrors.max_cpu_cores = '최대 CPU는 0보다 커야 합니다';
    }

    if (formData.max_memory_gb <= 0) {
      newErrors.max_memory_gb = '최대 메모리는 0보다 커야 합니다';
    }

    if (formData.max_cpu_cores > formData.cpu_cores) {
      newErrors.max_cpu_cores = '최대 CPU는 하드웨어 CPU보다 클 수 없습니다';
    }

    if (formData.max_memory_gb > formData.memory_gb) {
      newErrors.max_memory_gb = '최대 메모리는 하드웨어 메모리보다 클 수 없습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.health_check_url && formData.health_check_url.trim()) {
      try {
        new URL(formData.health_check_url);
      } catch {
        newErrors.health_check_url = '유효한 헬스 체크 URL을 입력하세요';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    switch (step) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }

    if (isValid && step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep3()) {
      return;
    }

    setLoading(true);

    try {
      const result = await solutionDeploymentService.registerSolution(formData);
      
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ solution_name: result.error || 'Failed to register solution' });
      }
    } catch (error) {
      console.error('Failed to register solution:', error);
      setErrors({ solution_name: 'Failed to register solution' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        solution_name: '',
        solution_version: '1.0.0',
        deployment_url: '',
        deployment_type: 'kubernetes',
        cpu_cores: 4,
        memory_gb: 8,
        storage_gb: 100,
        gpu_count: 0,
        max_tenants: 10,
        max_cpu_cores: 3.0,
        max_memory_gb: 6.0,
        kubernetes_cluster: '',
        kubernetes_namespace: '',
        internal_ip: '',
        external_ip: '',
        health_check_url: ''
      });
      setErrors({});
      setStep(1);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="새 솔루션 등록"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 진행 표시기 */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 1 ? 'bg-[#A8D5E2] border-[#A8D5E2] text-white' : 'border-gray-300 text-gray-300'
            }`}>
              1
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-[#A8D5E2]' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 2 ? 'bg-[#A8D5E2] border-[#A8D5E2] text-white' : 'border-gray-300 text-gray-300'
            }`}>
              2
            </div>
            <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-[#A8D5E2]' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 3 ? 'bg-[#A8D5E2] border-[#A8D5E2] text-white' : 'border-gray-300 text-gray-300'
            }`}>
              3
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 mb-4">
          {step === 1 && '기본 정보'}
          {step === 2 && '리소스 설정'}
          {step === 3 && '네트워크 및 모니터링'}
        </div>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="솔루션 이름 *"
              value={formData.solution_name}
              onChange={handleChange('solution_name')}
              error={errors.solution_name}
              placeholder="예: Production Cluster A"
              fullWidth
              disabled={loading}
            />

            <Input
              label="솔루션 버전 *"
              value={formData.solution_version}
              onChange={handleChange('solution_version')}
              error={errors.solution_version}
              placeholder="예: 1.0.0"
              fullWidth
              disabled={loading}
            />

            <Input
              label="배포 URL *"
              value={formData.deployment_url}
              onChange={handleChange('deployment_url')}
              error={errors.deployment_url}
              placeholder="https://solution.example.com"
              fullWidth
              disabled={loading}
            />

            <Select
              label="배포 타입 *"
              value={formData.deployment_type}
              onChange={handleSelectChange('deployment_type')}
              options={deploymentTypeOptions}
              error={errors.deployment_type}
              fullWidth
              disabled={loading}
            />
          </div>
        )}

        {/* Step 2: 리소스 설정 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CPU 코어 수 *"
                type="number"
                value={formData.cpu_cores.toString()}
                onChange={handleChange('cpu_cores')}
                error={errors.cpu_cores}
                min="1"
                step="1"
                fullWidth
                disabled={loading}
              />

              <Input
                label="메모리 (GB) *"
                type="number"
                value={formData.memory_gb.toString()}
                onChange={handleChange('memory_gb')}
                error={errors.memory_gb}
                min="1"
                step="1"
                fullWidth
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="스토리지 (GB) *"
                type="number"
                value={formData.storage_gb.toString()}
                onChange={handleChange('storage_gb')}
                error={errors.storage_gb}
                min="1"
                step="1"
                fullWidth
                disabled={loading}
              />

              <Input
                label="GPU 개수"
                type="number"
                value={formData.gpu_count.toString()}
                onChange={handleChange('gpu_count')}
                min="0"
                step="1"
                fullWidth
                disabled={loading}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">리소스 제한 설정</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="최대 테넌트 수 *"
                  type="number"
                  value={formData.max_tenants.toString()}
                  onChange={handleChange('max_tenants')}
                  error={errors.max_tenants}
                  min="1"
                  step="1"
                  fullWidth
                  disabled={loading}
                />

                <Input
                  label="최대 CPU 할당 *"
                  type="number"
                  value={formData.max_cpu_cores.toString()}
                  onChange={handleChange('max_cpu_cores')}
                  error={errors.max_cpu_cores}
                  min="0.1"
                  step="0.1"
                  fullWidth
                  disabled={loading}
                />

                <Input
                  label="최대 메모리 할당 (GB) *"
                  type="number"
                  value={formData.max_memory_gb.toString()}
                  onChange={handleChange('max_memory_gb')}
                  error={errors.max_memory_gb}
                  min="0.1"
                  step="0.1"
                  fullWidth
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 네트워크 및 모니터링 */}
        {step === 3 && (
          <div className="space-y-4">
            {formData.deployment_type === 'kubernetes' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Kubernetes 클러스터"
                  value={formData.kubernetes_cluster || ''}
                  onChange={handleChange('kubernetes_cluster')}
                  placeholder="예: production-cluster"
                  fullWidth
                  disabled={loading}
                />

                <Input
                  label="Kubernetes 네임스페이스"
                  value={formData.kubernetes_namespace || ''}
                  onChange={handleChange('kubernetes_namespace')}
                  placeholder="예: aicc-solutions"
                  fullWidth
                  disabled={loading}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="내부 IP"
                value={formData.internal_ip || ''}
                onChange={handleChange('internal_ip')}
                placeholder="10.0.0.100"
                fullWidth
                disabled={loading}
              />

              <Input
                label="외부 IP"
                value={formData.external_ip || ''}
                onChange={handleChange('external_ip')}
                placeholder="203.0.113.100"
                fullWidth
                disabled={loading}
              />
            </div>

            <Input
              label="헬스 체크 URL"
              value={formData.health_check_url || ''}
              onChange={handleChange('health_check_url')}
              error={errors.health_check_url}
              placeholder="https://solution.example.com/health"
              fullWidth
              disabled={loading}
            />
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-between pt-4">
          <div>
            {step > 1 && (
              <Button
                type="button"
                onClick={handlePrevious}
                variant="light"
                disabled={loading}
              >
                이전
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              onClick={handleClose}
              variant="light"
              disabled={loading}
            >
              취소
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                variant="primary"
                disabled={loading}
              >
                다음
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                isLoading={loading}
              >
                등록
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default SolutionRegistrationModal;
