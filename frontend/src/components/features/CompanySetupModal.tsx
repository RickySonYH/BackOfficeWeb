// [advice from AI] 개선된 회사 설정 모달 - 원자적 생성 프로세스
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import Checkbox from '../common/Checkbox';
import { 
  CreateCompleteCompanyRequest, 
  CompanySetupFormData, 
  CompanySetupStep,
  ValidationErrors,
  DeployedSolution,
  CompleteCompanyResponse
} from '../../types/company-setup';

interface CompanySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CompleteCompanyResponse) => void;
}

const CompanySetupModal: React.FC<CompanySetupModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  // 스텝 관리
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<CompanySetupStep[]>([
    { id: 1, title: '회사 정보', description: '기본 회사 정보를 입력하세요', isCompleted: false, isActive: true },
    { id: 2, title: '관리자 계정', description: '관리자 계정 정보를 설정하세요', isCompleted: false, isActive: false },
    { id: 3, title: '워크스페이스', description: '기본 워크스페이스를 선택하세요', isCompleted: false, isActive: false },
    { id: 4, title: '솔루션 할당', description: '배포 솔루션을 선택하세요', isCompleted: false, isActive: false },
    { id: 5, title: '확인', description: '설정을 검토하고 생성하세요', isCompleted: false, isActive: false }
  ]);

  // 폼 데이터
  const [formData, setFormData] = useState<CompanySetupFormData>({
    companyName: '',
    businessNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    adminEmail: '',
    adminUsername: '',
    createKMS: true,
    createAdvisor: true,
    autoAssignSolution: true,
    preferredSolutionId: '',
    cpuCores: 0.5,
    memoryGb: 1.0,
    storageGb: 10.0
  });

  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [availableSolutions, setAvailableSolutions] = useState<DeployedSolution[]>([]);

  // 배포된 솔루션 목록 조회
  useEffect(() => {
    if (isOpen) {
      loadAvailableSolutions();
    }
  }, [isOpen]);

  const loadAvailableSolutions = async () => {
    try {
      // TODO: 실제 API 호출로 교체
      const mockSolutions: DeployedSolution[] = [
        {
          id: '1',
          solution_name: 'AICC Solution v1.2.3',
          solution_version: '1.2.3',
          deployment_url: 'https://solution1.aicc.co.kr',
          max_tenants: 10,
          current_tenants: 3,
          max_cpu_cores: 8,
          max_memory_gb: 16,
          current_cpu_usage: 2.5,
          current_memory_usage: 6.0,
          status: 'active',
          health_status: 'healthy'
        },
        {
          id: '2',
          solution_name: 'AICC Solution v1.3.0',
          solution_version: '1.3.0',
          deployment_url: 'https://solution2.aicc.co.kr',
          max_tenants: 15,
          current_tenants: 8,
          max_cpu_cores: 12,
          max_memory_gb: 24,
          current_cpu_usage: 4.2,
          current_memory_usage: 12.8,
          status: 'active',
          health_status: 'healthy'
        }
      ];
      setAvailableSolutions(mockSolutions);
      
      // 첫 번째 솔루션을 기본 선택
      if (mockSolutions.length > 0) {
        setFormData(prev => ({ ...prev, preferredSolutionId: mockSolutions[0].id }));
      }
    } catch (error) {
      console.error('Failed to load available solutions:', error);
    }
  };

  // 입력 값 변경 핸들러
  const handleInputChange = (field: keyof CompanySetupFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 단계별 검증
  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1: // 회사 정보
        if (!formData.companyName.trim()) {
          newErrors.companyName = '회사명을 입력하세요';
        }
        if (!formData.businessNumber.trim()) {
          newErrors.businessNumber = '사업자번호를 입력하세요';
        } else if (!/^\d{3}-\d{2}-\d{5}$/.test(formData.businessNumber)) {
          newErrors.businessNumber = '사업자번호 형식이 올바르지 않습니다 (예: 123-45-67890)';
        }
        if (!formData.contractDate) {
          newErrors.contractDate = '계약일을 선택하세요';
        }
        break;

      case 2: // 관리자 계정
        if (!formData.adminEmail.trim()) {
          newErrors.adminEmail = '관리자 이메일을 입력하세요';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          newErrors.adminEmail = '올바른 이메일 형식을 입력하세요';
        }
        if (!formData.adminUsername.trim()) {
          newErrors.adminUsername = '관리자 사용자명을 입력하세요';
        } else if (formData.adminUsername.length < 3) {
          newErrors.adminUsername = '사용자명은 최소 3자 이상이어야 합니다';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.adminUsername)) {
          newErrors.adminUsername = '사용자명은 영문, 숫자, _, -만 사용 가능합니다';
        }
        break;

      case 3: // 워크스페이스
        if (!formData.createKMS && !formData.createAdvisor) {
          newErrors.workspace = '최소 하나의 워크스페이스를 선택해야 합니다';
        }
        break;

      case 4: // 솔루션 할당
        if (formData.autoAssignSolution && !formData.preferredSolutionId) {
          newErrors.preferredSolutionId = '솔루션을 선택하세요';
        }
        if (formData.cpuCores <= 0) {
          newErrors.cpuCores = 'CPU 코어 수는 0보다 커야 합니다';
        }
        if (formData.memoryGb <= 0) {
          newErrors.memoryGb = '메모리는 0보다 커야 합니다';
        }
        if (formData.storageGb <= 0) {
          newErrors.storageGb = '스토리지는 0보다 커야 합니다';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 다음 단계
  const handleNext = () => {
    if (validateStep(currentStep)) {
      const newSteps = steps.map(step => ({
        ...step,
        isCompleted: step.id === currentStep,
        isActive: step.id === currentStep + 1
      }));
      setSteps(newSteps);
      setCurrentStep(currentStep + 1);
    }
  };

  // 이전 단계
  const handlePrevious = () => {
    const newSteps = steps.map(step => ({
      ...step,
      isCompleted: step.id < currentStep - 1,
      isActive: step.id === currentStep - 1
    }));
    setSteps(newSteps);
    setCurrentStep(currentStep - 1);
  };

  // 최종 제출
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const requestData: CreateCompleteCompanyRequest = {
        name: formData.companyName,
        businessNumber: formData.businessNumber,
        contractDate: formData.contractDate,
        status: 'active',
        adminEmail: formData.adminEmail,
        adminUsername: formData.adminUsername,
        defaultWorkspaces: {
          createKMS: formData.createKMS,
          createAdvisor: formData.createAdvisor
        },
        solutionAssignment: formData.autoAssignSolution ? {
          autoAssign: true,
          preferredSolutionId: formData.preferredSolutionId || undefined,
          resourceRequirements: {
            cpu_cores: formData.cpuCores,
            memory_gb: formData.memoryGb,
            storage_gb: formData.storageGb
          }
        } : {
          autoAssign: false
        }
      };

      // TODO: 실제 API 호출로 교체
      const response = await fetch('/api/companies/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to create company setup');
      }

      const result = await response.json();
      
      if (result.success) {
        onSuccess(result.data);
        onClose();
        
        // 성공 메시지 표시
        alert(`회사 설정이 성공적으로 완료되었습니다!\n\n` +
              `회사: ${result.data.company.name}\n` +
              `테넌트: ${result.data.tenant.tenantKey}\n` +
              `워크스페이스: ${result.data.workspaces.length}개\n` +
              `관리자: ${result.data.adminUser.email}`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to create company setup:', error);
      setErrors({ submit: error instanceof Error ? error.message : '회사 설정 생성에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기 시 초기화
  const handleClose = () => {
    setCurrentStep(1);
    setSteps(steps.map((step, index) => ({
      ...step,
      isCompleted: false,
      isActive: index === 0
    })));
    setFormData({
      companyName: '',
      businessNumber: '',
      contractDate: new Date().toISOString().split('T')[0],
      adminEmail: '',
      adminUsername: '',
      createKMS: true,
      createAdvisor: true,
      autoAssignSolution: true,
      preferredSolutionId: '',
      cpuCores: 0.5,
      memoryGb: 1.0,
      storageGb: 10.0
    });
    setErrors({});
    onClose();
  };

  // 솔루션 옵션 생성
  const solutionOptions = availableSolutions.map(solution => ({
    value: solution.id,
    label: `${solution.solution_name} (${solution.current_tenants}/${solution.max_tenants} 테넌트, ${solution.health_status})`
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="회사 설정 생성" size="lg">
      <div className="space-y-6">
        {/* 진행 단계 표시 */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step.isCompleted ? 'bg-green-500 text-white' : 
                  step.isActive ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}
              `}>
                {step.isCompleted ? '✓' : step.id}
              </div>
              <div className="ml-2 text-sm">
                <div className={`font-medium ${step.isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                  {step.title}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 mx-4 ${
                  step.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* 단계별 컨텐츠 */}
        <div className="min-h-96">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">회사 기본 정보</h3>
              <Input
                label="회사명 *"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                error={errors.companyName}
                placeholder="회사명을 입력하세요"
              />
              <Input
                label="사업자번호 *"
                value={formData.businessNumber}
                onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                error={errors.businessNumber}
                placeholder="123-45-67890"
              />
              <Input
                type="date"
                label="계약일 *"
                value={formData.contractDate}
                onChange={(e) => handleInputChange('contractDate', e.target.value)}
                error={errors.contractDate}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">관리자 계정 설정</h3>
              <p className="text-sm text-gray-600">
                회사의 최고 관리자 계정을 설정합니다. 이 계정으로 테넌트와 워크스페이스를 관리할 수 있습니다.
              </p>
              <Input
                type="email"
                label="관리자 이메일 *"
                value={formData.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                error={errors.adminEmail}
                placeholder="admin@company.com"
              />
              <Input
                label="관리자 사용자명 *"
                value={formData.adminUsername}
                onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                error={errors.adminUsername}
                placeholder="admin_user"
              />
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 임시 비밀번호가 관리자 이메일로 발송됩니다. 첫 로그인 후 비밀번호를 변경하세요.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">기본 워크스페이스 설정</h3>
              <p className="text-sm text-gray-600">
                회사에서 사용할 기본 워크스페이스를 선택하세요. 나중에 추가로 생성할 수 있습니다.
              </p>
              <div className="space-y-3">
                <Checkbox
                  id="createKMS"
                  label="KMS 워크스페이스 생성"
                  checked={formData.createKMS}
                  onChange={(e) => handleInputChange('createKMS', e.target.checked)}
                />
                <p className="text-sm text-gray-500 ml-6">
                  지식 관리 시스템 - 문서, FAQ, 매뉴얼 등을 관리합니다.
                </p>
                
                <Checkbox
                  id="createAdvisor"
                  label="Advisor 워크스페이스 생성"
                  checked={formData.createAdvisor}
                  onChange={(e) => handleInputChange('createAdvisor', e.target.checked)}
                />
                <p className="text-sm text-gray-500 ml-6">
                  상담 어드바이저 시스템 - 고객 상담 및 응답 템플릿을 관리합니다.
                </p>
              </div>
              {errors.workspace && (
                <p className="text-sm text-red-600">{errors.workspace}</p>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">솔루션 할당 설정</h3>
              <p className="text-sm text-gray-600">
                배포된 솔루션에 테넌트를 자동으로 할당하고 리소스를 설정합니다.
              </p>
              
              <Checkbox
                id="autoAssignSolution"
                label="솔루션 자동 할당"
                checked={formData.autoAssignSolution}
                onChange={(e) => handleInputChange('autoAssignSolution', e.target.checked)}
              />

              {formData.autoAssignSolution && (
                <div className="space-y-4 ml-6">
                  <Select
                    label="배포 솔루션 선택"
                    value={formData.preferredSolutionId}
                    onChange={(value) => handleInputChange('preferredSolutionId', value)}
                    options={solutionOptions}
                    error={errors.preferredSolutionId}
                    placeholder="솔루션을 선택하세요"
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      label="CPU 코어"
                      value={formData.cpuCores.toString()}
                      onChange={(e) => handleInputChange('cpuCores', parseFloat(e.target.value) || 0)}
                      error={errors.cpuCores}
                      step="0.1"
                      min="0.1"
                    />
                    <Input
                      type="number"
                      label="메모리 (GB)"
                      value={formData.memoryGb.toString()}
                      onChange={(e) => handleInputChange('memoryGb', parseFloat(e.target.value) || 0)}
                      error={errors.memoryGb}
                      step="0.1"
                      min="0.1"
                    />
                    <Input
                      type="number"
                      label="스토리지 (GB)"
                      value={formData.storageGb.toString()}
                      onChange={(e) => handleInputChange('storageGb', parseFloat(e.target.value) || 0)}
                      error={errors.storageGb}
                      step="1"
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">설정 확인</h3>
              <p className="text-sm text-gray-600">
                아래 설정을 확인하고 회사 설정을 생성하세요.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <strong>회사 정보:</strong>
                  <p>{formData.companyName} ({formData.businessNumber})</p>
                  <p>계약일: {formData.contractDate}</p>
                </div>
                
                <div>
                  <strong>관리자 계정:</strong>
                  <p>{formData.adminUsername} ({formData.adminEmail})</p>
                </div>
                
                <div>
                  <strong>워크스페이스:</strong>
                  <p>
                    {formData.createKMS && 'KMS '}
                    {formData.createAdvisor && 'Advisor '}
                    워크스페이스가 생성됩니다.
                  </p>
                </div>
                
                {formData.autoAssignSolution && (
                  <div>
                    <strong>솔루션 할당:</strong>
                    <p>자동 할당 활성화</p>
                    <p>리소스: CPU {formData.cpuCores} 코어, 메모리 {formData.memoryGb}GB, 스토리지 {formData.storageGb}GB</p>
                  </div>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep > 1 && (
              <Button
                variant="secondary"
                onClick={handlePrevious}
                disabled={loading}
              >
                이전
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            <Button
              variant="light"
              onClick={handleClose}
              disabled={loading}
            >
              취소
            </Button>
            
            {currentStep < 5 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
              >
                다음
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleSubmit}
                disabled={loading}
                isLoading={loading}
              >
                회사 설정 생성
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CompanySetupModal;
