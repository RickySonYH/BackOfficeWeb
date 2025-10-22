// frontend/src/components/features/TenantModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { Company } from '../../types/company';
import { TenantFormData, TenantFormErrors } from '../../types/tenant';
import { tenantService } from '../../services/tenantService';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  companies: Company[];
}

const TenantModal: React.FC<TenantModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  companies 
}) => {
  const [formData, setFormData] = useState<TenantFormData>({
    company_id: '',
    tenant_key: '',
    kubernetes_namespace: ''
  });
  const [errors, setErrors] = useState<TenantFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [previewTenantKey, setPreviewTenantKey] = useState('');
  const [previewNamespace, setPreviewNamespace] = useState('');

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        company_id: '',
        tenant_key: '',
        kubernetes_namespace: ''
      });
      setErrors({});
      setPreviewTenantKey('');
      setPreviewNamespace('');
    }
  }, [isOpen]);

  // 회사 선택 시 테넌트 키 및 네임스페이스 미리보기 생성
  useEffect(() => {
    if (formData.company_id) {
      const selectedCompany = companies.find(c => c.id === formData.company_id);
      if (selectedCompany) {
        const generatedTenantKey = tenantService.generateTenantKeyPreview(selectedCompany.name);
        const generatedNamespace = tenantService.generateNamespacePreview(generatedTenantKey);
        
        setPreviewTenantKey(generatedTenantKey);
        setPreviewNamespace(generatedNamespace);
        
        // 자동 생성된 값으로 폼 업데이트
        setFormData(prev => ({
          ...prev,
          tenant_key: generatedTenantKey,
          kubernetes_namespace: generatedNamespace
        }));
      }
    } else {
      setPreviewTenantKey('');
      setPreviewNamespace('');
      setFormData(prev => ({
        ...prev,
        tenant_key: '',
        kubernetes_namespace: ''
      }));
    }
  }, [formData.company_id, companies]);

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field: keyof TenantFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // 폼 유효성 검증
  const validateForm = (): boolean => {
    const newErrors: TenantFormErrors = {};

    if (!formData.company_id) {
      newErrors.company_id = '회사를 선택해주세요.';
    }

    if (!formData.tenant_key) {
      newErrors.tenant_key = '테넌트 키를 입력해주세요.';
    } else if (formData.tenant_key.length < 3) {
      newErrors.tenant_key = '테넌트 키는 최소 3자 이상이어야 합니다.';
    } else if (!/^[a-z0-9-]+$/.test(formData.tenant_key)) {
      newErrors.tenant_key = '테넌트 키는 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
    }

    if (!formData.kubernetes_namespace) {
      newErrors.kubernetes_namespace = 'Kubernetes 네임스페이스를 입력해주세요.';
    } else if (formData.kubernetes_namespace.length < 3) {
      newErrors.kubernetes_namespace = '네임스페이스는 최소 3자 이상이어야 합니다.';
    } else if (!/^[a-z0-9-]+$/.test(formData.kubernetes_namespace)) {
      newErrors.kubernetes_namespace = '네임스페이스는 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await tenantService.createTenant({
        company_id: formData.company_id,
        tenant_key: formData.tenant_key,
        kubernetes_namespace: formData.kubernetes_namespace
      });

      if (response.success) {
        onSave();
        onClose();
      } else {
        // API 에러 처리
        if (response.error?.includes('already exists')) {
          setErrors({ tenant_key: '이미 존재하는 테넌트 키입니다.' });
        } else {
          setErrors({ company_id: response.error || '테넌트 생성에 실패했습니다.' });
        }
      }
    } catch (error) {
      console.error('테넌트 생성 오류:', error);
      setErrors({ company_id: '테넌트 생성 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 회사 선택 옵션 생성
  const companyOptions = [
    { value: '', label: '회사를 선택하세요' },
    ...companies
      .filter(company => company.status === 'active') // 활성 회사만 표시
      .map(company => ({
        value: company.id,
        label: `${company.name} (${company.businessNumber})`
      }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="테넌트 생성"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 회사 선택 */}
        <Select
          label="회사 선택 *"
          value={formData.company_id}
          onChange={(value) => handleInputChange('company_id', value)}
          options={companyOptions}
          error={errors.company_id}
          fullWidth
          disabled={loading}
        />

        {/* 테넌트 키 미리보기 */}
        {previewTenantKey && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-success-800 mb-2">
              자동 생성된 정보 미리보기
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-success-700">테넌트 키:</span>
                <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                  {previewTenantKey}
                </span>
              </div>
              <div>
                <span className="font-medium text-success-700">Kubernetes 네임스페이스:</span>
                <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                  {previewNamespace}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 테넌트 키 입력 */}
        <Input
          label="테넌트 키 *"
          type="text"
          value={formData.tenant_key}
          onChange={(e) => handleInputChange('tenant_key', e.target.value)}
          placeholder="예: aicc-solutions-20241021-abc1"
          error={errors.tenant_key}
          fullWidth
          disabled={loading}
        />

        {/* Kubernetes 네임스페이스 입력 */}
        <Input
          label="Kubernetes 네임스페이스 *"
          type="text"
          value={formData.kubernetes_namespace}
          onChange={(e) => handleInputChange('kubernetes_namespace', e.target.value)}
          placeholder="예: tenant-aicc-solutions-20241021-abc1"
          error={errors.kubernetes_namespace}
          fullWidth
          disabled={loading}
        />

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                테넌트 생성 안내
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>테넌트 생성 시 Kubernetes 클러스터에 네임스페이스가 자동으로 생성됩니다.</li>
                  <li>배포 상태는 실시간으로 업데이트되며, 완료까지 수 분이 소요될 수 있습니다.</li>
                  <li>테넌트 키와 네임스페이스는 생성 후 변경할 수 없습니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="light"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.company_id}
          >
            {loading ? '생성 중...' : '테넌트 생성'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TenantModal;
