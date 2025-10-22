import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { UserFormData, UserFormErrors } from '../../types/user';
import { Company } from '../../types/company';
import { userService } from '../../services/userService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  companies: Company[];
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, companies }) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    ecp_user_id: '',
    tenant_id: '',
    role: 'user'
  });
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: '',
        email: '',
        full_name: '',
        ecp_user_id: '',
        tenant_id: '',
        role: 'user'
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: UserFormErrors = {};

    if (!formData.username) {
      newErrors.username = '사용자명을 입력해주세요.';
    } else if (formData.username.length < 3) {
      newErrors.username = '사용자명은 3자 이상이어야 합니다.';
    }

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요.';
    }

    if (!formData.tenant_id) {
      newErrors.tenant_id = '테넌트를 선택해주세요.';
    }

    if (!formData.role) {
      newErrors.role = '권한을 선택해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 메시지 제거
    if (errors[name as keyof UserFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 메시지 제거
    if (errors[name as keyof UserFormErrors]) {
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
      const response = await userService.createUser(formData);
      if (response.success) {
        onSave();
        onClose();
        alert('사용자가 성공적으로 등록되었습니다.');
      } else {
        // 서버 에러를 적절한 필드에 매핑
        if (response.error?.includes('Username') || response.error?.includes('username')) {
          setErrors({ username: response.error });
        } else if (response.error?.includes('email') || response.error?.includes('Email')) {
          setErrors({ email: response.error });
        } else {
          setErrors({ username: response.error || '사용자 등록에 실패했습니다.' });
        }
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setErrors({ username: '서버 오류로 사용자 등록에 실패했습니다.' });
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

  // 권한 옵션 생성
  const roleOptions = userService.getRoleDescriptions().map(role => ({
    value: role.role,
    label: `${role.name} - ${role.description}`
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 사용자 등록">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="사용자명 *"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            fullWidth
            disabled={loading}
            placeholder="영문, 숫자 조합 (3자 이상)"
          />
          
          <Input
            label="이메일 *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            fullWidth
            disabled={loading}
            placeholder="user@example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="실명"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            error={errors.full_name}
            fullWidth
            disabled={loading}
            placeholder="홍길동"
          />
          
          <Input
            label="ECP 사용자 ID"
            name="ecp_user_id"
            type="text"
            value={formData.ecp_user_id}
            onChange={handleChange}
            error={errors.ecp_user_id}
            fullWidth
            disabled={loading}
            placeholder="ECP001"
          />
        </div>

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

        <Select
          label="권한 *"
          value={formData.role}
          onChange={handleSelectChange('role')}
          options={roleOptions}
          error={errors.role}
          fullWidth
          disabled={loading}
        />

        {/* ECP 연동 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">ECP 시스템 연동 안내</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>사용자 계정은 ECP 메인 DB에서 정보를 가져옵니다</li>
                  <li>여기서는 추가 권한만 부여하며, 주기적으로 동기화됩니다</li>
                  <li>임시 비밀번호(temp123!)가 설정되며, 첫 로그인 시 변경해야 합니다</li>
                </ul>
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
            style={{ backgroundColor: '#f8bbd9', borderColor: '#f8bbd9', color: '#831843' }}
            className="hover:bg-pink-200"
          >
            {loading ? '등록 중...' : '사용자 등록'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
