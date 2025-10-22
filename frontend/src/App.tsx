// React 18에서는 JSX Transform으로 인해 React import 불필요
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ECPAuthProvider } from './contexts/ECPAuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// 페이지 컴포넌트 임포트
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnhancedDashboard from './pages/EnhancedDashboard';
import Companies from './pages/Companies';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Users from './pages/Users';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import WorkspaceMapping from './pages/WorkspaceMapping';
import DataInitialization from './pages/DataInitialization';
import SolutionDeployment from './pages/SolutionDeployment';
import ECPSimulation from './pages/ECPSimulation';

function App() {
  return (
    <AuthProvider>
      <ECPAuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* 로그인 페이지 */}
          <Route path="/login" element={<Login />} />
          
                  {/* 보호된 라우트들 */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/monitoring" element={
                    <ProtectedRoute>
                      <Layout>
                        <EnhancedDashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
          
          <Route path="/companies" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <Companies />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/tenants" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <Tenants />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/tenants/:id" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <TenantDetail />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspaces" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <Workspaces />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspaces/:id" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <WorkspaceDetail />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace-mapping" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <WorkspaceMapping />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/data-initialization" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Layout>
                <DataInitialization />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/solution-deployment" element={
            <ProtectedRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <SolutionDeployment />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* ECP 시뮬레이션 페이지 */}
          <Route path="/ecp-simulation" element={<ECPSimulation />} />
          
          {/* 기본 리다이렉트 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 페이지 */}
          <Route path="*" element={
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">페이지를 찾을 수 없습니다.</p>
                <a href="/dashboard" className="text-[#A8D5E2] hover:underline">
                  대시보드로 이동
                </a>
              </div>
            </div>
          } />
        </Routes>
        </Router>
      </ECPAuthProvider>
    </AuthProvider>
  );
}

export default App;