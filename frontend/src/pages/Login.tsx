// [advice from AI] ECP 인증 지원이 추가된 로그인 페이지
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useECPAuth } from '../contexts/ECPAuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Checkbox from '../components/common/Checkbox';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'internal' | 'ecp'>('internal');
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { login: ecpLogin, isAuthenticated: ecpAuthenticated, isLoading: ecpLoading } = useECPAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated || ecpAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, ecpAuthenticated, navigate]);

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login({ username, password });
      
      if (success) {
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        }
        navigate('/dashboard');
      } else {
        setError('로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleECPLogin = async () => {
    setError('');
    try {
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      }
      await ecpLogin();
    } catch (err: any) {
      setError(err.message || 'ECP 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* 로고/제목 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AICC Operations
          </h1>
          <p className="text-gray-600">
            관리자 로그인
          </p>
        </div>

        <Card padding="lg">
          {/* 로그인 방법 선택 */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod('internal')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMethod === 'internal'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                내부 계정
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('ecp')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMethod === 'ecp'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ECP 인증
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 내부 계정 로그인 폼 */}
          {loginMethod === 'internal' && (
            <form onSubmit={handleInternalSubmit} className="space-y-4">
              <Input
                label="사용자명 또는 이메일"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin 또는 manager1"
                required
                fullWidth
                disabled={isLoading}
              />

              <Input
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                fullWidth
                disabled={isLoading}
              />

              <Checkbox
                id="remember-me"
                label="로그인 상태 유지"
                checked={rememberMe}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={!username || !password}
              >
                로그인
              </Button>
            </form>
          )}

          {/* ECP 로그인 */}
          {loginMethod === 'ecp' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ECP 통합 인증
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  기업 통합 인증 시스템(ECP)을 통해 안전하게 로그인하세요
                </p>
              </div>

              <Checkbox
                id="remember-me-ecp"
                label="로그인 상태 유지"
                checked={rememberMe}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                disabled={ecpLoading}
              />

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={ecpLoading}
                onClick={handleECPLogin}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {ecpLoading ? 'ECP 서버 연결 중...' : 'ECP 로그인'}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  ECP 서버로 안전하게 리다이렉트됩니다
                </p>
              </div>
            </div>
          )}

          {/* 테스트 계정 안내 */}
          {loginMethod === 'internal' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">테스트 계정:</p>
              <div className="space-y-1 text-xs text-gray-500">
                <p>• 관리자: <span className="font-mono">admin</span> / <span className="font-mono">admin123!</span></p>
                <p>• 매니저: <span className="font-mono">manager1</span> / <span className="font-mono">manager123!</span></p>
              </div>
            </div>
          )}

          {loginMethod === 'ecp' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">ECP 테스트 사용자:</p>
              <div className="space-y-1 text-xs text-gray-500">
                <p>• 시스템 관리자 (admin)</p>
                <p>• 김매니저 (manager)</p>
                <p>• 이사용자 (user)</p>
                <p className="text-blue-600 mt-2">* ECP 시뮬레이션 페이지에서 선택 가능</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
