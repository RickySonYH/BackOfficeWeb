import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { WorkspaceFormData, WorkspaceFormErrors, WorkspaceType } from '../../types/workspace';
import { Company } from '../../types/company';
import { workspaceService } from '../../services/workspaceService';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  companies: Company[];
}

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose, onSave, companies }) => {
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    type: 'kms',
    tenant_id: '',
    description: ''
  });
  const [errors, setErrors] = useState<WorkspaceFormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        type: 'kms',
        tenant_id: '',
        description: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: WorkspaceFormErrors = {};

    if (!formData.name) {
      newErrors.name = '워크스페이스명을 입력해주세요.';
    } else if (formData.name.length < 2) {
      newErrors.name = '워크스페이스명은 2자 이상이어야 합니다.';
    }

    if (!formData.type) {
      newErrors.type = '워크스페이스 타입을 선택해주세요.';
    }

    if (!formData.tenant_id) {
      newErrors.tenant_id = '테넌트를 선택해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 메시지 제거
    if (errors[name as keyof WorkspaceFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 메시지 제거
    if (errors[name as keyof WorkspaceFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await workspaceService.createWorkspace(formData);
      if (response.success) {
        onSave();
        onClose();
        alert('워크스페이스가 성공적으로 생성되었습니다.');
      } else {
        // 서버 에러를 적절한 필드에 매핑
        if (response.error?.includes('name') || response.error?.includes('Name')) {
          setErrors({ name: response.error });
        } else if (response.error?.includes('tenant') || response.error?.includes('Tenant')) {
          setErrors({ tenant_id: response.error });
        } else {
          setErrors({ name: response.error || '워크스페이스 생성에 실패했습니다.' });
        }
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      setErrors({ name: '서버 오류로 워크스페이스 생성에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 테넌트 옵션 생성
  const tenantOptions = companies.map(company => ({
    value: company.id,
    label: company.name,
    disabled: company.status === 'inactive'
  }));

  // 워크스페이스 타입 옵션 생성
  const typeOptions = workspaceService.getWorkspaceTypeDescriptions().map(type => ({
    value: type.type,
    label: `${type.icon} ${type.name} - ${type.description}`
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 워크스페이스 생성">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="워크스페이스명 *"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          fullWidth
          disabled={loading}
          placeholder="예: 고객지원 KMS"
        />

        <Select
          label="워크스페이스 타입 *"
          value={formData.type}
          onChange={handleSelectChange('type')}
          options={typeOptions}
          error={errors.type}
          fullWidth
          disabled={loading}
        />

        <Select
          label="소속 테넌트 *"
          value={formData.tenant_id}
          onChange={handleSelectChange('tenant_id')}
          options={tenantOptions}
          error={errors.tenant_id}
          fullWidth
          placeholder="테넌트를 선택하세요"
          disabled={loading}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="워크스페이스에 대한 간단한 설명을 입력하세요"
            disabled={loading}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        {/* 워크스페이스 타입별 안내 */}
        <div className={`rounded-lg p-4 ${
          formData.type === 'kms' 
            ? 'bg-blue-50 border border-blue-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="text-2xl">
                {formData.type === 'kms' ? '📚' : '💬'}
              </div>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                formData.type === 'kms' ? 'text-blue-800' : 'text-green-800'
              }`}>
                {formData.type === 'kms' ? 'KMS (지식 관리 시스템)' : '상담 어드바이저'}
              </h3>
              <div className={`mt-2 text-sm ${
                formData.type === 'kms' ? 'text-blue-700' : 'text-green-700'
              }`}>
                {formData.type === 'kms' ? (
                  <ul className="list-disc list-inside space-y-1">
                    <li>문서 기반 지식 검색 및 RAG 시스템</li>
                    <li>벡터 DB 연동 및 임베딩 모델 설정</li>
                    <li>지식 카테고리 구조 관리</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    <li>상담 시나리오 및 응답 템플릿 관리</li>
                    <li>트리거 조건 설정</li>
                    <li>컨텍스트 기반 자동 응답</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {loading ? '생성 중...' : '워크스페이스 생성'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkspaceModal;
