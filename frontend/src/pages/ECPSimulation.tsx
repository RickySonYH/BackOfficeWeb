// [advice from AI] ECP 로그인 시뮬레이션 페이지 (개발/테스트용)
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ecpAuthService, ECPUser } from '../services/ecpAuthService';

const ECPSimulation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [ecpUsers, setECPUsers] = useState<ECPUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const state = searchParams.get('state');
  const sessionId = searchParams.get('session');

  useEffect(() => {
    loadECPUsers();
  }, []);

  const loadECPUsers = async () => {
    try {
      const response = await ecpAuthService.getECPUsers();
      if (response.success && response.users) {
        setECPUsers(response.users);
        if (response.users.length > 0) {
          setSelectedUserId(response.users[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load ECP users:', error);
    }
  };

  const handleLogin = async () => {
    if (!selectedUserId || !state || !sessionId) {
      setError('필수 정보가 누락되었습니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 선택된 사용자의 인덱스를 코드로 사용 (시뮬레이션)
      const userIndex = ecpUsers.findIndex(user => user.id === selectedUserId);
      const code = userIndex.toString();
      
      const response = await ecpAuthService.handleCallback(code, state, sessionId);
      
      if (response.success) {
        // 로그인 성공 시 대시보드로 리다이렉트
        navigate('/dashboard');
      } else {
        setError(response.error || '로그인에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/login');
  };

  if (!state || !sessionId) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Card title="오류">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">유효하지 않은 ECP 인증 요청입니다.</p>
            <Button variant="primary" onClick={() => navigate('/login')}>
              로그인 페이지로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card title="ECP 로그인 시뮬레이션">
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ECP 인증 서버
              </h2>
              <p className="text-sm text-gray-600">
                테스트용 사용자를 선택하여 로그인하세요
              </p>
            </div>

            {/* 사용자 선택 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                로그인할 사용자 선택
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {ecpUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.username}) - {user.role}
                  </option>
                ))}
              </select>
            </div>

            {/* 선택된 사용자 정보 */}
            {selectedUserId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const selectedUser = ecpUsers.find(user => user.id === selectedUserId);
                  if (!selectedUser) return null;
                  
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">이름:</span>
                        <span className="font-medium">{selectedUser.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">이메일:</span>
                        <span className="font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">역할:</span>
                        <span className="font-medium capitalize">{selectedUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">회사:</span>
                        <span className="font-medium">{selectedUser.tenant_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">부서:</span>
                        <span className="font-medium">{selectedUser.department}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 버튼들 */}
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={handleLogin}
                disabled={loading || !selectedUserId}
                fullWidth
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '로그인 중...' : 'ECP 로그인 승인'}
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={loading}
                fullWidth
              >
                취소
              </Button>
            </div>

            {/* 안내 메시지 */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                실제 환경에서는 ECP 서버의 로그인 페이지가 표시됩니다.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ECPSimulation;
