// frontend/src/components/layout/Header.tsx

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
// Button 컴포넌트 사용하지 않음

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* 로고/제목 */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">
            AICC Operations Management
          </h1>
        </div>

        {/* 사용자 정보 및 메뉴 */}
        <div className="flex items-center space-x-4">
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="w-8 h-8 bg-[#A8D5E2] rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-800">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>

              {/* 드롭다운 메뉴 */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    프로필 설정
                  </button>
                  
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    비밀번호 변경
                  </button>
                  
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 외부 클릭 시 드롭다운 닫기 */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
