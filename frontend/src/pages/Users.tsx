import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Select from '../components/common/Select';
import UserModal from '../components/features/UserModal';
import { User, UserRole } from '../types/user';
import { Company } from '../types/company';
import { userService } from '../services/userService';
import { companyService } from '../services/companyService';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string>('');
  const [deletingUserId, setDeletingUserId] = useState<string>('');

  // 모달 상태
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // 사용자 목록 로드
  const loadUsers = async (tenantId?: string) => {
    try {
      setLoading(true);
      const response = await userService.getUsers(1, 50, tenantId);
      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        console.error('Failed to load users:', response.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // 회사 목록 로드
  const loadCompanies = async () => {
    try {
      const response = await companyService.getCompanies(1, 50);
      if (response.success && response.data) {
        setCompanies(response.data.data);
      } else {
        console.error('Failed to load companies:', response.error);
        setCompanies([]);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      setCompanies([]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  // 테넌트 필터 변경
  const handleTenantFilterChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    loadUsers(tenantId || undefined);
  };

  // 권한 변경
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!window.confirm('사용자 권한을 변경하시겠습니까?')) {
      return;
    }

    setUpdatingRoleUserId(userId);
    try {
      const response = await userService.updateUserRole(userId, { role: newRole });
      if (response.success) {
        await loadUsers(selectedTenantId || undefined);
        alert('권한이 성공적으로 변경되었습니다.');
      } else {
        alert(`권한 변경 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('Role update failed:', error);
      alert('권한 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingRoleUserId('');
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`사용자 "${username}"을(를) 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await userService.deleteUser(userId);
      if (response.success) {
        await loadUsers(selectedTenantId || undefined);
        alert('사용자가 성공적으로 삭제되었습니다.');
      } else {
        alert(`사용자 삭제 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('User deletion failed:', error);
      alert('사용자 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingUserId('');
    }
  };

  // ECP 동기화
  const handleSyncEcp = async () => {
    if (!window.confirm('ECP 시스템과 사용자 정보를 동기화하시겠습니까?')) {
      return;
    }

    setSyncLoading(true);
    try {
      const response = await userService.syncEcpUsers();
      if (response.success && response.data) {
        await loadUsers(selectedTenantId || undefined);
        alert(`동기화 완료!\n- 전체: ${response.data.synchronized_count}명\n- 업데이트: ${response.data.updated_count}명\n- 신규: ${response.data.new_count}명`);
      } else {
        alert(`동기화 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('ECP sync failed:', error);
      alert('ECP 동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncLoading(false);
    }
  };

  // 테넌트 옵션 생성
  const tenantOptions = [
    { value: '', label: '전체 테넌트' },
    ...companies.map(company => ({
      value: company.id,
      label: company.name
    }))
  ];

  // 사용자 테이블 컬럼 정의
  const userColumns = [
    { 
      key: 'username' as keyof User, 
      label: '사용자명',
      render: (value: string, user: User) => (
        <div>
          <div className="font-medium">{value}</div>
          {user.full_name && <div className="text-sm text-gray-500">{user.full_name}</div>}
        </div>
      )
    },
    { key: 'email' as keyof User, label: '이메일' },
    {
      key: 'role' as keyof User,
      label: '권한',
      render: (value: UserRole, user: User) => {
        const roleDisplay = userService.getRoleDisplay(value);
        const isUpdating = updatingRoleUserId === user.id;
        
        return (
          <select
            value={value}
            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
            disabled={isUpdating}
            className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-pink-300 ${roleDisplay.color} ${isUpdating ? 'opacity-50' : 'cursor-pointer hover:opacity-80'}`}
            style={{ appearance: 'none', backgroundImage: 'none' }}
          >
            <option value="admin">관리자</option>
            <option value="manager">매니저</option>
            <option value="user">사용자</option>
          </select>
        );
      }
    },
    { 
      key: 'tenant_name' as keyof User, 
      label: '소속 테넌트',
      render: (value: string | undefined) => value || '-'
    },
    {
      key: 'is_active' as keyof User,
      label: '상태',
      render: (value: boolean) => {
        const statusDisplay = userService.getStatusDisplay(value);
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
        );
      }
    },
    {
      key: 'last_login' as keyof User,
      label: '최근 로그인',
      render: (value: string | null | undefined) => (
        <span className="text-sm text-gray-600">
          {userService.formatLastLogin(value || undefined)}
        </span>
      )
    },
    {
      key: 'created_at' as keyof User,
      label: '등록일',
      render: (value: string) => userService.formatDate(value)
    },
    {
      key: 'id' as keyof User,
      label: '액션',
      render: (value: string, user: User) => {
        const isDeleting = deletingUserId === user.id;
        return (
          <div className="flex space-x-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteUser(user.id, user.username)}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">사용자 관리</h1>
          <p className="text-gray-600 mt-1">시스템 사용자 계정을 관리합니다</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            onClick={handleSyncEcp}
            disabled={syncLoading}
          >
            {syncLoading ? 'ECP 동기화 중...' : 'ECP 동기화'}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setIsUserModalOpen(true)}
            style={{ backgroundColor: '#f8bbd9', borderColor: '#f8bbd9', color: '#831843' }}
            className="hover:bg-pink-200"
          >
            사용자 추가
          </Button>
        </div>
      </div>

      {/* 권한 설명 */}
      <Card title="권한 설명">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userService.getRoleDescriptions().map((role) => (
            <div key={role.role} className="flex items-start space-x-3">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${role.color}`}>
                {role.name}
              </span>
              <div>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 사용자 목록 */}
      <Card title="사용자 목록">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Select
              label="테넌트 필터"
              value={selectedTenantId}
              onChange={handleTenantFilterChange}
              options={tenantOptions}
              className="min-w-48"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {users.length}명의 사용자
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">사용자 목록을 로드 중입니다...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">등록된 사용자가 없습니다.</div>
            <Button 
              variant="primary" 
              onClick={() => setIsUserModalOpen(true)}
              style={{ backgroundColor: '#f8bbd9', borderColor: '#f8bbd9', color: '#831843' }}
              className="hover:bg-pink-200"
            >
              첫 번째 사용자 추가
            </Button>
          </div>
        ) : (
          <Table
            data={users}
            columns={userColumns}
            emptyMessage="사용자가 없습니다."
          />
        )}
      </Card>

      {/* 사용자 추가 모달 */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={() => {
          loadUsers(selectedTenantId || undefined);
          setIsUserModalOpen(false);
        }}
        companies={companies}
      />
    </div>
  );
};

export default Users;