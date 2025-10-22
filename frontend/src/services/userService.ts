import api from './api';
import { 
  User, 
  UserFormData, 
  UserRoleUpdateData, 
  UsersResponse, 
  UserResponse, 
  UserRole,
  RoleDescription,
  EcpSyncResponse
} from '../types/user';

export class UserService {
  // 사용자 목록 조회 (페이지네이션 및 테넌트 필터 지원)
  async getUsers(
    page: number = 1, 
    limit: number = 10, 
    tenantId?: string
  ): Promise<UsersResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (tenantId) {
        params.append('tenant_id', tenantId);
      }

      const response = await api.get(`/api/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch users' 
      };
    }
  }

  // 단일 사용자 조회
  async getUserById(userId: string): Promise<UserResponse> {
    try {
      const response = await api.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user' 
      };
    }
  }

  // 사용자 등록
  async createUser(userData: UserFormData): Promise<UserResponse> {
    try {
      const response = await api.post('/api/users', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create user' 
      };
    }
  }

  // 사용자 권한 변경
  async updateUserRole(userId: string, roleData: UserRoleUpdateData): Promise<UserResponse> {
    try {
      const response = await api.put(`/api/users/${userId}/role`, roleData);
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update user role' 
      };
    }
  }

  // 사용자 삭제
  async deleteUser(userId: string): Promise<UserResponse> {
    try {
      const response = await api.delete(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete user' 
      };
    }
  }

  // ECP 사용자 동기화
  async syncEcpUsers(): Promise<EcpSyncResponse> {
    try {
      const response = await api.post('/api/users/sync-ecp');
      return response.data;
    } catch (error) {
      console.error('Failed to sync ECP users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync ECP users' 
      };
    }
  }

  // 권한 설명 정보
  getRoleDescriptions(): RoleDescription[] {
    return [
      {
        role: 'admin',
        name: '관리자',
        description: '모든 기능에 접근할 수 있습니다',
        color: 'bg-red-100 text-red-800'
      },
      {
        role: 'manager',
        name: '매니저',
        description: '테넌트 내 모든 기능을 관리할 수 있습니다',
        color: 'bg-blue-100 text-blue-800'
      },
      {
        role: 'user',
        name: '사용자',
        description: '읽기 전용 권한을 가집니다',
        color: 'bg-gray-100 text-gray-800'
      }
    ];
  }

  // 권한별 표시 정보
  getRoleDisplay(role: UserRole): { text: string; color: string } {
    const roleMap = {
      admin: { text: '관리자', color: 'bg-red-100 text-red-800' },
      manager: { text: '매니저', color: 'bg-blue-100 text-blue-800' },
      user: { text: '사용자', color: 'bg-gray-100 text-gray-800' }
    };
    
    return roleMap[role] || { text: '알 수 없음', color: 'bg-gray-100 text-gray-800' };
  }

  // 사용자 상태 표시
  getStatusDisplay(isActive: boolean): { text: string; color: string } {
    return isActive 
      ? { text: '활성', color: 'bg-success-100 text-success-800' }
      : { text: '비활성', color: 'bg-red-100 text-red-800' };
  }

  // 날짜 포맷팅
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  // 마지막 로그인 시간 포맷팅
  formatLastLogin(lastLogin?: string): string {
    if (!lastLogin) return '로그인 기록 없음';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffMs = now.getTime() - loginDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return this.formatDate(lastLogin);
    }
  }

  // 권한 검증 헬퍼
  canManageUsers(currentUserRole: UserRole): boolean {
    return currentUserRole === 'admin';
  }

  canChangeRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'manager' && targetRole !== 'admin') return true;
    return false;
  }

  canDeleteUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'manager' && targetUserRole === 'user') return true;
    return false;
  }
}

// 싱글톤 사용자 서비스 인스턴스
export const userService = new UserService();
