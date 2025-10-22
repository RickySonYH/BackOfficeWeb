// frontend/src/components/layout/Sidebar.tsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { MenuItem } from '../../types/common';

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    path: '/dashboard'
  },
  {
    id: 'companies',
    label: '회사 관리',
    path: '/companies',
    requiredRoles: ['admin', 'manager']
  },
  {
    id: 'tenants',
    label: '테넌트 관리',
    path: '/tenants',
    requiredRoles: ['admin', 'manager']
  },
  {
    id: 'users',
    label: '사용자 관리',
    path: '/users',
    requiredRoles: ['admin', 'manager']
  },
  {
    id: 'workspaces',
    label: '워크스페이스 관리',
    path: '/workspaces',
    requiredRoles: ['admin', 'manager']
  },
  {
    id: 'workspace-mapping',
    label: '워크스페이스 맵핑',
    path: '/workspace-mapping',
    requiredRoles: ['admin', 'manager']
  },
  {
    id: 'data-initialization',
    label: '데이터 초기화',
    path: '/data-initialization',
    requiredRoles: ['admin']
  },
  {
    id: 'solution-deployment',
    label: '솔루션 배포 관리',
    path: '/solution-deployment',
    requiredRoles: ['admin', 'manager']
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasPermission = (item: MenuItem): boolean => {
    if (!item.requiredRoles || !user) return true;
    return item.requiredRoles.includes(user.role);
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const filteredMenuItems = menuItems.filter(hasPermission);

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 h-full">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            메뉴
          </h2>
          <p className="text-sm text-gray-500">
            시스템 관리 도구
          </p>
        </div>

        <nav className="space-y-2">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.path)}
              className={`
                w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium
                ${isActive(item.path)
                  ? 'bg-[#A8D5E2] text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `.trim().replace(/\s+/g, ' ')}
            >
              <div className="flex items-center">
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* 사용자 정보 표시 */}
        {user && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">현재 사용자</p>
              <p className="text-sm font-medium text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role} 권한</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
