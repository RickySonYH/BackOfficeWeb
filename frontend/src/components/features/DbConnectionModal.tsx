// frontend/src/components/features/DbConnectionModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { DbConnectionFormData, DbConnectionFormErrors } from '../../types/tenant';
import { tenantService } from '../../services/tenantService';

interface DbConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
  tenantName: string;
}

const DbConnectionModal: React.FC<DbConnectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  tenantId,
  tenantName
}) => {
  const [formData, setFormData] = useState<DbConnectionFormData>({
    connection_type: 'postgresql',
    host: '',
    port: 5432,
    database_name: '',
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<DbConnectionFormErrors>({});
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        connection_type: 'postgresql',
        host: '',
        port: 5432,
        database_name: '',
        username: '',
        password: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  // 연결 타입 변경 시 기본 포트 설정
  useEffect(() => {
    if (formData.connection_type === 'postgresql') {
      setFormData(prev => ({ ...prev, port: 5432 }));
    } else if (formData.connection_type === 'mongodb') {
      setFormData(prev => ({ ...prev, port: 27017 }));
    }
  }, [formData.connection_type]);

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field: keyof DbConnectionFormData, value: string | number) => {
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
    const newErrors: DbConnectionFormErrors = {};

    if (!formData.connection_type) {
      newErrors.connection_type = '연결 타입을 선택해주세요.';
    }

    if (!formData.host.trim()) {
      newErrors.host = '호스트를 입력해주세요.';
    } else if (!/^[a-zA-Z0-9.-]+$/.test(formData.host)) {
      newErrors.host = '유효한 호스트명을 입력해주세요.';
    }

    const port = typeof formData.port === 'string' ? parseInt(formData.port) : formData.port;
    if (!port || port < 1 || port > 65535) {
      newErrors.port = '유효한 포트 번호를 입력해주세요 (1-65535).';
    }

    if (!formData.database_name.trim()) {
      newErrors.database_name = '데이터베이스명을 입력해주세요.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.database_name)) {
      newErrors.database_name = '데이터베이스명은 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다.';
    }

    if (!formData.username.trim()) {
      newErrors.username = '사용자명을 입력해주세요.';
    } else if (formData.username.length < 2) {
      newErrors.username = '사용자명은 최소 2자 이상이어야 합니다.';
    }

    if (!formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 4) {
      newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
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
      
      const response = await tenantService.createTenantDbConnection(tenantId, {
        connection_type: formData.connection_type,
        host: formData.host.trim(),
        port: typeof formData.port === 'string' ? parseInt(formData.port) : formData.port,
        database_name: formData.database_name.trim(),
        username: formData.username.trim(),
        password: formData.password
      });

      if (response.success) {
        onSave();
        onClose();
      } else {
        // API 에러 처리
        setErrors({ host: response.error || 'DB 연결 정보 등록에 실패했습니다.' });
      }
    } catch (error) {
      console.error('DB 연결 등록 오류:', error);
      setErrors({ host: 'DB 연결 등록 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 연결 타입 옵션
  const connectionTypeOptions = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mongodb', label: 'MongoDB' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`DB 연결 추가 - ${tenantName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 연결 타입 선택 */}
        <Select
          label="연결 타입 *"
          value={formData.connection_type}
          onChange={(value) => handleInputChange('connection_type', value)}
          options={connectionTypeOptions}
          error={errors.connection_type}
          fullWidth
          disabled={loading}
        />

        {/* 호스트 입력 */}
        <Input
          label="호스트 *"
          type="text"
          value={formData.host}
          onChange={(e) => handleInputChange('host', e.target.value)}
          placeholder="예: postgres.example.com 또는 192.168.1.100"
          error={errors.host}
          fullWidth
          disabled={loading}
        />

        {/* 포트 입력 */}
        <Input
          label="포트 *"
          type="number"
          value={formData.port.toString()}
          onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
          placeholder={formData.connection_type === 'postgresql' ? '5432' : '27017'}
          error={errors.port}
          fullWidth
          disabled={loading}
        />

        {/* 데이터베이스명 입력 */}
        <Input
          label="데이터베이스명 *"
          type="text"
          value={formData.database_name}
          onChange={(e) => handleInputChange('database_name', e.target.value)}
          placeholder="예: production_db"
          error={errors.database_name}
          fullWidth
          disabled={loading}
        />

        {/* 사용자명 입력 */}
        <Input
          label="사용자명 *"
          type="text"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          placeholder="데이터베이스 사용자명"
          error={errors.username}
          fullWidth
          disabled={loading}
        />

        {/* 비밀번호 입력 */}
        <Input
          label="비밀번호 *"
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="데이터베이스 비밀번호"
          error={errors.password}
          fullWidth
          disabled={loading}
        />

        {/* 연결 정보 미리보기 */}
        {formData.host && formData.database_name && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              연결 정보 미리보기
            </h4>
            <div className="text-sm text-blue-700">
              <div className="font-mono bg-white px-3 py-2 rounded border">
                {formData.connection_type === 'postgresql' 
                  ? `postgresql://${formData.username}:***@${formData.host}:${formData.port}/${formData.database_name}`
                  : `mongodb://${formData.username}:***@${formData.host}:${formData.port}/${formData.database_name}`
                }
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                보안 안내
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>비밀번호는 암호화되어 안전하게 저장됩니다.</li>
                  <li>연결 정보 등록 후 자동으로 연결 테스트가 수행됩니다.</li>
                  <li>데이터베이스 서버가 접근 가능한 상태인지 확인해주세요.</li>
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
            disabled={loading || !formData.host || !formData.database_name}
          >
            {loading ? '등록 중...' : 'DB 연결 등록'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DbConnectionModal;
