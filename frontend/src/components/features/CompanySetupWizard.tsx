// [advice from AI] 회사 완전 설정 마법사 컴포넌트

import React, { useState, useEffect } from 'react';
import { 
  CompanySetupStep, 
  CompanySetupFormData, 
  CreateCompanyWithSetupRequest,
  FormValidationErrors 
} from '../../types/company-setup';
import { companySetupService } from '../../services/companySetupService';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Checkbox from '../common/Checkbox';
import Modal from '../common/Modal';

interface CompanySetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

const CompanySetupWizard: React.FC<CompanySetupWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<CompanySetupStep>('company-info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSolutions, setAvailableSolutions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<CompanySetupFormData>({
    companyInfo: {
      name: '',
      businessNumber: '',
      contractDate: '',
      status: 'active'
    },
    adminAccount: {
      email: '',
      username: ''
    },
    workspaceConfig: {
      createKMS: true,
      createAdvisor: true,
      kmsSettings: {
        autoLearning: false,
        semanticSearch: true,
        maxResults: 10,
        similarityThreshold: 0.7
      },
      advisorSettings: {
        autoResponse: false,
        confidenceThreshold: 0.8,
        sentimentAnalysis: true,
        contextMemory: true
      }
    },
    solutionAssignment: {
      autoAssign: true,
      preferredSolutionId: '',
      resourceRequirements: {
        cpu_cores: 0.5,
        memory_gb: 1.0,
        storage_gb: 10.0
      }
    }
  });

  const [errors, setErrors] = useState<FormValidationErrors>({});

  const steps: Array<{ id: CompanySetupStep; title: string; description: string }> = [
    { id: 'company-info', title: '회사 정보', description: '기본 회사 정보를 입력합니다' },
    { id: 'admin-account', title: '관리자 계정', description: '관리자 계정 정보를 설정합니다' },
    { id: 'workspace-config', title: '워크스페이스 설정', description: '기본 워크스페이스를 구성합니다' },
    { id: 'solution-assignment', title: '솔루션 할당', description: '배포 솔루션을 선택합니다' },
    { id: 'review', title: '검토 및 완료', description: '설정 내용을 검토하고 생성합니다' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  useEffect(() => {
    if (isOpen) {
      loadAvailableSolutions();
    }
  }, [isOpen]);

  const loadAvailableSolutions = async () => {
    try {
      const solutions = await companySetupService.getAvailableSolutions();
      setAvailableSolutions(solutions);
      if (solutions.length > 0 && !formData.solutionAssignment.preferredSolutionId) {
        setFormData(prev => ({
          ...prev,
          solutionAssignment: {
            ...prev.solutionAssignment,
            preferredSolutionId: solutions[0].id
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load available solutions:', error);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    setErrors({});

    switch (currentStep) {
      case 'company-info': {
        const validation = companySetupService.validateCompanyInfo(formData.companyInfo);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return false;
        }

        // 사업자번호 중복 확인
        try {
          const { isDuplicate } = await companySetupService.checkBusinessNumberDuplicate(formData.companyInfo.businessNumber);
          if (isDuplicate) {
            setErrors({ businessNumber: '이미 등록된 사업자번호입니다.' });
            return false;
          }
        } catch (error) {
          console.warn('Business number duplicate check failed:', error);
        }
        
        return true;
      }

      case 'admin-account': {
        const validation = companySetupService.validateAdminAccount(formData.adminAccount);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return false;
        }

        // 이메일 중복 확인
        try {
          const { isDuplicate: emailDuplicate } = await companySetupService.checkEmailDuplicate(formData.adminAccount.email);
          const { isDuplicate: usernameDuplicate } = await companySetupService.checkUsernameDuplicate(formData.adminAccount.username);
          
          const duplicateErrors: FormValidationErrors = {};
          if (emailDuplicate) {
            duplicateErrors.email = '이미 사용 중인 이메일입니다.';
          }
          if (usernameDuplicate) {
            duplicateErrors.username = '이미 사용 중인 사용자명입니다.';
          }
          
          if (Object.keys(duplicateErrors).length > 0) {
            setErrors(duplicateErrors);
            return false;
          }
        } catch (error) {
          console.warn('Email/username duplicate check failed:', error);
        }
        
        return true;
      }

      case 'workspace-config': {
        const validation = companySetupService.validateWorkspaceConfig(formData.workspaceConfig);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return false;
        }
        return true;
      }

      case 'solution-assignment': {
        const validation = companySetupService.validateSolutionAssignment(formData.solutionAssignment);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return false;
        }
        return true;
      }

      case 'review':
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const requestData: CreateCompanyWithSetupRequest = {
        name: formData.companyInfo.name,
        businessNumber: formData.companyInfo.businessNumber,
        contractDate: formData.companyInfo.contractDate,
        status: formData.companyInfo.status,
        adminEmail: formData.adminAccount.email,
        adminUsername: formData.adminAccount.username,
        defaultWorkspaces: {
          createKMS: formData.workspaceConfig.createKMS,
          createAdvisor: formData.workspaceConfig.createAdvisor,
          kmsConfig: formData.workspaceConfig.createKMS ? {
            knowledge_sources: [],
            indexing_enabled: true,
            auto_learning: formData.workspaceConfig.kmsSettings.autoLearning,
            vector_db_config: {
              dimension: 1536,
              similarity_metric: 'cosine' as const,
              index_type: 'hnsw' as const
            },
            search_config: {
              max_results: formData.workspaceConfig.kmsSettings.maxResults,
              similarity_threshold: formData.workspaceConfig.kmsSettings.similarityThreshold,
              enable_semantic_search: formData.workspaceConfig.kmsSettings.semanticSearch
            },
            data_processing: {
              chunk_size: 1000,
              chunk_overlap: 200,
              enable_preprocessing: true,
              supported_formats: ['pdf', 'docx', 'txt', 'html', 'md']
            },
            ui_settings: {
              theme: 'light' as const,
              language: 'ko',
              show_confidence_scores: true
            }
          } : undefined,
          advisorConfig: formData.workspaceConfig.createAdvisor ? {
            response_templates: [
              {
                id: 'greeting',
                name: '인사말',
                template: '안녕하세요! 무엇을 도와드릴까요?',
                category: 'greeting'
              }
            ],
            escalation_rules: [
              {
                condition: `confidence < ${formData.workspaceConfig.advisorSettings.confidenceThreshold}`,
                action: 'human_handoff' as const,
                message: '전문 상담원에게 연결해드리겠습니다.'
              }
            ],
            sentiment_analysis: {
              enabled: formData.workspaceConfig.advisorSettings.sentimentAnalysis,
              threshold_positive: 0.3,
              threshold_negative: -0.3,
              language: 'ko'
            },
            conversation_config: {
              max_context_length: 10,
              enable_context_memory: formData.workspaceConfig.advisorSettings.contextMemory,
              session_timeout: 1800
            },
            auto_response_settings: {
              enabled: formData.workspaceConfig.advisorSettings.autoResponse,
              confidence_threshold: formData.workspaceConfig.advisorSettings.confidenceThreshold,
              max_auto_responses: 3
            },
            ui_settings: {
              theme: 'light' as const,
              language: 'ko',
              show_confidence_scores: false,
              enable_quick_replies: true
            }
          } : undefined
        },
        solutionAssignment: formData.solutionAssignment.autoAssign ? {
          autoAssign: true,
          preferredSolutionId: formData.solutionAssignment.preferredSolutionId,
          resourceRequirements: formData.solutionAssignment.resourceRequirements
        } : undefined
      };

      const result = await companySetupService.createCompleteCompanySetup(requestData);
      onSuccess(result);
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || '회사 생성에 실패했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (section: keyof CompanySetupFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateNestedFormData = (section: keyof CompanySetupFormData, subSection: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...(prev[section] as any)[subSection],
          [field]: value
        }
      }
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'company-info':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">회사 정보</h3>
            
            <Input
              label="회사명 *"
              value={formData.companyInfo.name}
              onChange={(e) => updateFormData('companyInfo', 'name', e.target.value)}
              error={errors.name}
              placeholder="회사명을 입력하세요"
              fullWidth
            />

            <Input
              label="사업자번호 *"
              value={formData.companyInfo.businessNumber}
              onChange={(e) => updateFormData('companyInfo', 'businessNumber', e.target.value)}
              error={errors.businessNumber}
              placeholder="123-45-67890"
              fullWidth
            />

            <Input
              label="계약일 *"
              type="date"
              value={formData.companyInfo.contractDate}
              onChange={(e) => updateFormData('companyInfo', 'contractDate', e.target.value)}
              error={errors.contractDate}
              fullWidth
            />

            <Select
              label="상태 *"
              value={formData.companyInfo.status}
              onChange={(value) => updateFormData('companyInfo', 'status', value)}
              options={[
                { value: 'active', label: '활성' },
                { value: 'inactive', label: '비활성' },
                { value: 'suspended', label: '일시중단' }
              ]}
              error={errors.status}
              fullWidth
            />
          </div>
        );

      case 'admin-account':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">관리자 계정</h3>
            
            <Input
              label="이메일 *"
              type="email"
              value={formData.adminAccount.email}
              onChange={(e) => updateFormData('adminAccount', 'email', e.target.value)}
              error={errors.email}
              placeholder="admin@company.com"
              fullWidth
            />

            <Input
              label="사용자명 *"
              value={formData.adminAccount.username}
              onChange={(e) => updateFormData('adminAccount', 'username', e.target.value)}
              error={errors.username}
              placeholder="admin_user"
              fullWidth
            />

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>참고:</strong> 임시 비밀번호가 생성되어 등록된 이메일로 발송됩니다.
              </p>
            </div>
          </div>
        );

      case 'workspace-config':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">워크스페이스 설정</h3>
            
            {errors.workspaces && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-700">{errors.workspaces}</p>
              </div>
            )}

            {/* KMS 워크스페이스 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <Checkbox
                id="createKMS"
                label="KMS (지식 관리 시스템) 워크스페이스 생성"
                checked={formData.workspaceConfig.createKMS}
                onChange={(e) => updateFormData('workspaceConfig', 'createKMS', e.target.checked)}
              />
              
              {formData.workspaceConfig.createKMS && (
                <div className="mt-4 space-y-3 pl-6 border-l-2 border-blue-200">
                  <Checkbox
                    id="kmsAutoLearning"
                    label="자동 학습 활성화"
                    checked={formData.workspaceConfig.kmsSettings.autoLearning}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'kmsSettings', 'autoLearning', e.target.checked)}
                  />
                  
                  <Checkbox
                    id="kmsSemanticSearch"
                    label="의미 검색 활성화"
                    checked={formData.workspaceConfig.kmsSettings.semanticSearch}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'kmsSettings', 'semanticSearch', e.target.checked)}
                  />
                  
                  <Input
                    label="최대 검색 결과 수"
                    type="number"
                    value={formData.workspaceConfig.kmsSettings.maxResults}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'kmsSettings', 'maxResults', parseInt(e.target.value))}
                    error={errors.kmsMaxResults}
                    min="1"
                    max="50"
                  />
                  
                  <Input
                    label="유사도 임계값"
                    type="number"
                    step="0.1"
                    value={formData.workspaceConfig.kmsSettings.similarityThreshold}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'kmsSettings', 'similarityThreshold', parseFloat(e.target.value))}
                    error={errors.kmsSimilarityThreshold}
                    min="0"
                    max="1"
                  />
                </div>
              )}
            </div>

            {/* Advisor 워크스페이스 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <Checkbox
                id="createAdvisor"
                label="Advisor (상담 어드바이저) 워크스페이스 생성"
                checked={formData.workspaceConfig.createAdvisor}
                onChange={(e) => updateFormData('workspaceConfig', 'createAdvisor', e.target.checked)}
              />
              
              {formData.workspaceConfig.createAdvisor && (
                <div className="mt-4 space-y-3 pl-6 border-l-2 border-green-200">
                  <Checkbox
                    id="advisorAutoResponse"
                    label="자동 응답 활성화"
                    checked={formData.workspaceConfig.advisorSettings.autoResponse}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'advisorSettings', 'autoResponse', e.target.checked)}
                  />
                  
                  <Checkbox
                    id="advisorSentimentAnalysis"
                    label="감정 분석 활성화"
                    checked={formData.workspaceConfig.advisorSettings.sentimentAnalysis}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'advisorSettings', 'sentimentAnalysis', e.target.checked)}
                  />
                  
                  <Checkbox
                    id="advisorContextMemory"
                    label="대화 맥락 기억 활성화"
                    checked={formData.workspaceConfig.advisorSettings.contextMemory}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'advisorSettings', 'contextMemory', e.target.checked)}
                  />
                  
                  <Input
                    label="신뢰도 임계값"
                    type="number"
                    step="0.1"
                    value={formData.workspaceConfig.advisorSettings.confidenceThreshold}
                    onChange={(e) => updateNestedFormData('workspaceConfig', 'advisorSettings', 'confidenceThreshold', parseFloat(e.target.value))}
                    error={errors.advisorConfidenceThreshold}
                    min="0"
                    max="1"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'solution-assignment':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">솔루션 할당</h3>
            
            <Checkbox
              id="autoAssign"
              label="자동으로 최적 솔루션에 할당"
              checked={formData.solutionAssignment.autoAssign}
              onChange={(e) => updateFormData('solutionAssignment', 'autoAssign', e.target.checked)}
            />

            {formData.solutionAssignment.autoAssign && (
              <div className="space-y-4 pl-6 border-l-2 border-purple-200">
                {availableSolutions.length > 0 && (
                  <Select
                    label="선호 솔루션"
                    value={formData.solutionAssignment.preferredSolutionId}
                    onChange={(value) => updateFormData('solutionAssignment', 'preferredSolutionId', value)}
                    options={availableSolutions.map(solution => ({
                      value: solution.id,
                      label: `${solution.name} (${solution.availableSlots}/${solution.maxTenants} 사용 가능)`
                    }))}
                    fullWidth
                  />
                )}

                <h4 className="font-medium text-gray-700">리소스 요구사항</h4>
                
                <Input
                  label="CPU 코어 수"
                  type="number"
                  step="0.1"
                  value={formData.solutionAssignment.resourceRequirements.cpu_cores}
                  onChange={(e) => updateNestedFormData('solutionAssignment', 'resourceRequirements', 'cpu_cores', parseFloat(e.target.value))}
                  error={errors.cpuCores}
                  min="0.1"
                />

                <Input
                  label="메모리 (GB)"
                  type="number"
                  step="0.1"
                  value={formData.solutionAssignment.resourceRequirements.memory_gb}
                  onChange={(e) => updateNestedFormData('solutionAssignment', 'resourceRequirements', 'memory_gb', parseFloat(e.target.value))}
                  error={errors.memoryGb}
                  min="0.1"
                />

                <Input
                  label="스토리지 (GB)"
                  type="number"
                  step="0.1"
                  value={formData.solutionAssignment.resourceRequirements.storage_gb}
                  onChange={(e) => updateNestedFormData('solutionAssignment', 'resourceRequirements', 'storage_gb', parseFloat(e.target.value))}
                  error={errors.storageGb}
                  min="0.1"
                />
              </div>
            )}

            {!formData.solutionAssignment.autoAssign && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">
                  솔루션 할당을 건너뛰면 나중에 수동으로 할당해야 합니다.
                </p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">설정 검토</h3>
            
            {/* 회사 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">회사 정보</h4>
              <div className="space-y-1 text-sm">
                <p><strong>회사명:</strong> {formData.companyInfo.name}</p>
                <p><strong>사업자번호:</strong> {formData.companyInfo.businessNumber}</p>
                <p><strong>계약일:</strong> {formData.companyInfo.contractDate}</p>
                <p><strong>상태:</strong> {formData.companyInfo.status}</p>
              </div>
            </div>

            {/* 관리자 계정 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">관리자 계정</h4>
              <div className="space-y-1 text-sm">
                <p><strong>이메일:</strong> {formData.adminAccount.email}</p>
                <p><strong>사용자명:</strong> {formData.adminAccount.username}</p>
              </div>
            </div>

            {/* 워크스페이스 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">워크스페이스</h4>
              <div className="space-y-1 text-sm">
                <p><strong>KMS:</strong> {formData.workspaceConfig.createKMS ? '생성' : '생성하지 않음'}</p>
                <p><strong>Advisor:</strong> {formData.workspaceConfig.createAdvisor ? '생성' : '생성하지 않음'}</p>
              </div>
            </div>

            {/* 솔루션 할당 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">솔루션 할당</h4>
              <div className="space-y-1 text-sm">
                <p><strong>자동 할당:</strong> {formData.solutionAssignment.autoAssign ? '예' : '아니오'}</p>
                {formData.solutionAssignment.autoAssign && (
                  <>
                    <p><strong>CPU:</strong> {formData.solutionAssignment.resourceRequirements.cpu_cores} 코어</p>
                    <p><strong>메모리:</strong> {formData.solutionAssignment.resourceRequirements.memory_gb} GB</p>
                    <p><strong>스토리지:</strong> {formData.solutionAssignment.resourceRequirements.storage_gb} GB</p>
                  </>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="회사 완전 설정" size="lg">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              <div className="mt-2 text-xs text-center">
                <div className="font-medium">{step.title}</div>
                <div className="text-gray-500">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="secondary"
            onClick={currentStepIndex === 0 ? onClose : handlePrevious}
          >
            {currentStepIndex === 0 ? '취소' : '이전'}
          </Button>

          <div className="flex space-x-2">
            {currentStep !== 'review' ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                다음
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? '생성 중...' : '회사 생성'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CompanySetupWizard;
