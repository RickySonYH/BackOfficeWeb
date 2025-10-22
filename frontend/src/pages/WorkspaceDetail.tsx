import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import KmsConfigForm from '../components/features/KmsConfigForm';
import AdvisorConfigForm from '../components/features/AdvisorConfigForm';
import { Workspace, KmsConfig, AdvisorConfig } from '../types/workspace';
import { workspaceService } from '../services/workspaceService';

const WorkspaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 워크스페이스 정보 로드
  const loadWorkspace = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await workspaceService.getWorkspaceById(id);
      if (response.success && response.data) {
        setWorkspace(response.data);
      } else {
        console.error('Failed to load workspace:', response.error);
        navigate('/workspaces'); // 워크스페이스가 없으면 목록으로 리다이렉트
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  // 설정 저장
  const handleSaveConfig = async (config: KmsConfig | AdvisorConfig) => {
    if (!id) return;

    setSaving(true);
    try {
      const response = await workspaceService.updateWorkspaceConfig(id, { config });
      if (response.success) {
        setWorkspace(response.data!);
        alert('설정이 성공적으로 저장되었습니다.');
      } else {
        alert(`설정 저장 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('Config save failed:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !workspace) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">워크스페이스 정보를 로드 중입니다...</p>
      </div>
    );
  }

  const typeDisplay = workspaceService.getWorkspaceTypeDisplay(workspace.type);
  const statusDisplay = workspaceService.getWorkspaceStatusDisplay(workspace.status);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text flex items-center">
            <span className="mr-2">{typeDisplay.icon}</span>
            {workspace.name}
          </h1>
          <p className="text-gray-600 mt-1">{workspace.description || '설명이 없습니다.'}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/workspaces')}>
          목록으로 돌아가기
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card title="기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-text">
          <div>
            <p className="text-sm font-medium text-gray-500">워크스페이스 타입</p>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded-full ${typeDisplay.color}`}>
                <span className="mr-1">{typeDisplay.icon}</span>
                {typeDisplay.text}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">상태</p>
            <p className="mt-1">
              <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">소속 테넌트</p>
            <p className="mt-1 text-lg">{workspace.tenant_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">생성일</p>
            <p className="mt-1 text-lg">{workspaceService.formatDate(workspace.created_at)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">최종 수정일</p>
            <p className="mt-1 text-lg">{workspaceService.formatDate(workspace.updated_at)}</p>
          </div>
        </div>
      </Card>

      {/* 설정 폼 */}
      <Card title={`${typeDisplay.text} 설정`}>
        {workspace.type === 'kms' ? (
          <KmsConfigForm
            config={workspace.config as KmsConfig}
            onSave={handleSaveConfig}
            saving={saving}
          />
        ) : (
          <AdvisorConfigForm
            config={workspace.config as AdvisorConfig}
            onSave={handleSaveConfig}
            saving={saving}
          />
        )}
      </Card>
    </div>
  );
};

export default WorkspaceDetail;
