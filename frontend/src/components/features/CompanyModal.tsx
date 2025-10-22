// frontend/src/components/features/CompanyModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { Company, CompanyFormData, CompanyFormErrors } from '../../types/company';
import { companyService } from '../../services/companyService';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  company?: Company | null;
  mode: 'create' | 'edit';
}

const CompanyModal: React.FC<CompanyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  company, 
  mode 
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    businessNumber: '',
    contractDate: '',
    status: 'active'
  });
  const [errors, setErrors] = useState<CompanyFormErrors>({});
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && company) {
        setFormData({
          name: company.name,
          businessNumber: company.businessNumber,
          contractDate: company.contractDate,
          status: company.status
        });
      } else {
        setFormData({
          name: '',
          businessNumber: '',
          contractDate: '',
          status: 'active'
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, company]);

  const validateForm = (): boolean => {
    const newErrors: CompanyFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '회사명을 입력해주세요.';
    }

    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자번호를 입력해주세요.';
    } else if (!companyService.validateBusinessNumber(formData.businessNumber)) {
      newErrors.businessNumber = '올바른 사업자번호 형식이 아닙니다. (예: 123-45-67890)';
    }

    if (!formData.contractDate) {
      newErrors.contractDate = '계약일을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    if (field === 'businessNumber') {
      // 사업자번호는 자동 포맷팅
      value = companyService.formatBusinessNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let response;
      if (mode === 'create') {
        response = await companyService.createCompany(formData);
      } else if (company) {
        response = await companyService.updateCompany(company.id, formData);
      }
      
      if (response && response.success) {
        onSave(); // 목록 새로고침
        onClose(); // 모달 닫기
      } else {
        const errorMessage = response?.error || '저장 중 오류가 발생했습니다.';
        
        if (errorMessage.includes('Business number already exists')) {
          setErrors({ businessNumber: '이미 등록된 사업자번호입니다.' });
        } else {
          setErrors({ name: errorMessage });
        }
      }
    } catch (error: any) {
      console.error('Company save error:', error);
      
      // API 에러 메시지 표시
      const errorMessage = error.response?.data?.error || '저장 중 오류가 발생했습니다.';
      
      if (errorMessage.includes('Business number already exists')) {
        setErrors({ businessNumber: '이미 등록된 사업자번호입니다.' });
      } else {
        setErrors({ name: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? '회사 등록' : '회사 수정'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="회사명 *"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          fullWidth
          disabled={loading}
          placeholder="회사명을 입력하세요"
        />

        <Input
          label="사업자번호 *"
          type="text"
          value={formData.businessNumber}
          onChange={(e) => handleInputChange('businessNumber', e.target.value)}
          error={errors.businessNumber}
          fullWidth
          disabled={loading}
          placeholder="123-45-67890"
          maxLength={12} // 하이픈 포함 최대 길이
        />

        <Input
          label="계약일 *"
          type="date"
          value={formData.contractDate}
          onChange={(e) => handleInputChange('contractDate', e.target.value)}
          error={errors.contractDate}
          fullWidth
          disabled={loading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상태 *
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="active"
                checked={formData.status === 'active'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={loading}
                className="mr-2 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">활성</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={formData.status === 'inactive'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={loading}
                className="mr-2 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">비활성</span>
            </label>
          </div>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="light"
            onClick={handleClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CompanyModal;
