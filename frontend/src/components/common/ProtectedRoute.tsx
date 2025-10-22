// frontend/src/components/common/ProtectedRoute.tsx

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  redirectTo = '/login'
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A8D5E2] mx-auto mb-4"></div>
          <p className="text-gray-600">로딩중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // 역할 기반 접근 제어
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-[#FFE4B5] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
              <p className="text-gray-600 mb-4">
                이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요.
              </p>
              <p className="text-sm text-gray-500">
                현재 권한: <span className="font-medium capitalize">{user.role}</span><br/>
                필요 권한: <span className="font-medium">{requiredRoles.join(', ')}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
