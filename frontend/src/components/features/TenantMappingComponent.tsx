import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { TenantWorkspaceMapping, Workspace, WorkspaceType } from '../../types/workspace';
import { workspaceService } from '../../services/workspaceService';

interface TenantMappingComponentProps {
  tenantId: string;
  mapping: TenantWorkspaceMapping | null;
  onMappingSaved: () => void;
}

const TenantMappingComponent: React.FC<TenantMappingComponentProps> = ({ 
  tenantId, 
  mapping, 
  onMappingSaved 
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    default_kms_workspace_id: '',
    default_advisor_workspace_id: '',
    workspace_priorities: [] as {
      workspace_id: string;
      workspace_name: string;
      workspace_type: WorkspaceType;
      priority: number;
      is_default: boolean;
    }[]
  });

  // 테넌트의 워크스페이스 목록 로드
  const loadTenantWorkspaces = async () => {
    try {
      setWorkspacesLoading(true);
      const response = await workspaceService.getWorkspaces(1, 50, tenantId);
      if (response.success && response.data) {
        setWorkspaces(response.data.workspaces);
      } else {
        console.error('Failed to load tenant workspaces:', response.error);
        setWorkspaces([]);
      }
    } catch (error) {
      console.error('Failed to load tenant workspaces:', error);
      setWorkspaces([]);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  // 맵핑 데이터를 폼 데이터로 변환
  useEffect(() => {
    if (mapping && workspaces.length > 0) {
      // 기존 맵핑이 있는 경우
      setFormData({
        default_kms_workspace_id: mapping.default_kms_workspace_id || '',
        default_advisor_workspace_id: mapping.default_advisor_workspace_id || '',
        workspace_priorities: mapping.workspace_priorities || []
      });
    } else if (workspaces.length > 0) {
      // 새로운 맵핑 생성 (모든 워크스페이스를 기본 우선순위로)
      const priorities = workspaces.map((workspace, index) => ({
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        workspace_type: workspace.type,
        priority: index + 1,
        is_default: false
      }));

      // 타입별 첫 번째 워크스페이스를 기본으로 설정
      const firstKms = workspaces.find(w => w.type === 'kms');
      const firstAdvisor = workspaces.find(w => w.type === 'advisor');

      if (firstKms) {
        const kmsIndex = priorities.findIndex(p => p.workspace_id === firstKms.id);
        if (kmsIndex !== -1) {
          priorities[kmsIndex].is_default = true;
          priorities[kmsIndex].priority = 1;
        }
      }

      if (firstAdvisor) {
        const advisorIndex = priorities.findIndex(p => p.workspace_id === firstAdvisor.id);
        if (advisorIndex !== -1) {
          priorities[advisorIndex].is_default = true;
          priorities[advisorIndex].priority = 1;
        }
      }

      setFormData({
        default_kms_workspace_id: firstKms?.id || '',
        default_advisor_workspace_id: firstAdvisor?.id || '',
        workspace_priorities: priorities
      });
    }
  }, [mapping, workspaces]);

  useEffect(() => {
    if (tenantId) {
      loadTenantWorkspaces();
    }
  }, [tenantId]);

  // 우선순위 변경
  const handlePriorityChange = (workspaceId: string, newPriority: number) => {
    setFormData(prev => ({
      ...prev,
      workspace_priorities: prev.workspace_priorities.map(wp =>
        wp.workspace_id === workspaceId 
          ? { ...wp, priority: newPriority }
          : wp
      )
    }));
  };

  // 기본 워크스페이스 변경
  const handleDefaultChange = (type: WorkspaceType, workspaceId: string) => {
    setFormData(prev => {
      const updatedPriorities = prev.workspace_priorities.map(wp => ({
        ...wp,
        is_default: wp.workspace_type === type ? wp.workspace_id === workspaceId : wp.is_default
      }));

      return {
        ...prev,
        [type === 'kms' ? 'default_kms_workspace_id' : 'default_advisor_workspace_id']: workspaceId,
        workspace_priorities: updatedPriorities
      };
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        default_kms_workspace_id: formData.default_kms_workspace_id,
        default_advisor_workspace_id: formData.default_advisor_workspace_id,
        workspace_priorities: formData.workspace_priorities.map(wp => ({
          workspace_id: wp.workspace_id,
          priority: wp.priority,
          is_default: wp.is_default
        }))
      };

      const response = await workspaceService.updateTenantWorkspaceMapping(tenantId, updateData);
      
      if (response.success) {
        alert('워크스페이스 맵핑이 성공적으로 저장되었습니다.');
        onMappingSaved();
      } else {
        alert(`맵핑 저장 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('Mapping save failed:', error);
      alert('맵핑 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (workspacesLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">워크스페이스 정보를 로드 중입니다...</div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">이 테넌트에 등록된 워크스페이스가 없습니다.</div>
        <div className="text-sm text-gray-400">
          먼저 워크스페이스를 생성한 후 맵핑을 설정하세요.
        </div>
      </div>
    );
  }

  const kmsWorkspaces = workspaces.filter(w => w.type === 'kms');
  const advisorWorkspaces = workspaces.filter(w => w.type === 'advisor');
  const kmsOptions = kmsWorkspaces.map(w => ({ value: w.id, label: w.name }));
  const advisorOptions = advisorWorkspaces.map(w => ({ value: w.id, label: w.name }));

  return (
    <div className="space-y-8">
      {/* 기본 워크스페이스 설정 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KMS 기본 워크스페이스 */}
        {kmsWorkspaces.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
              <span className="mr-2">📚</span>
              KMS 기본 워크스페이스
            </h3>
            <Select
              value={formData.default_kms_workspace_id}
              onChange={(e) => handleDefaultChange('kms', e.target.value)}
              options={[{ value: '', label: '선택하지 않음' }, ...kmsOptions]}
              fullWidth
            />
            <p className="text-sm text-blue-700 mt-2">
              새로운 KMS 요청이 들어올 때 기본적으로 사용될 워크스페이스입니다.
            </p>
          </div>
        )}

        {/* 어드바이저 기본 워크스페이스 */}
        {advisorWorkspaces.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
              <span className="mr-2">💬</span>
              어드바이저 기본 워크스페이스
            </h3>
            <Select
              value={formData.default_advisor_workspace_id}
              onChange={(e) => handleDefaultChange('advisor', e.target.value)}
              options={[{ value: '', label: '선택하지 않음' }, ...advisorOptions]}
              fullWidth
            />
            <p className="text-sm text-green-700 mt-2">
              새로운 상담 요청이 들어올 때 기본적으로 사용될 워크스페이스입니다.
            </p>
          </div>
        )}
      </div>

      {/* 워크스페이스 우선순위 설정 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">워크스페이스 우선순위 설정</h3>
        <div className="space-y-4">
          {/* KMS 워크스페이스들 */}
          {kmsWorkspaces.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <span className="mr-2">📚</span>
                KMS 워크스페이스
              </h4>
              <div className="space-y-3">
                {formData.workspace_priorities
                  .filter(wp => wp.workspace_type === 'kms')
                  .sort((a, b) => a.priority - b.priority)
                  .map((wp) => (
                    <div key={wp.workspace_id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{wp.workspace_name}</span>
                        {wp.is_default && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            기본 설정
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">우선순위:</label>
                        <Input
                          type="number"
                          value={wp.priority}
                          onChange={(e) => handlePriorityChange(wp.workspace_id, parseInt(e.target.value) || 1)}
                          min={1}
                          max={10}
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 어드바이저 워크스페이스들 */}
          {advisorWorkspaces.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-3 flex items-center">
                <span className="mr-2">💬</span>
                어드바이저 워크스페이스
              </h4>
              <div className="space-y-3">
                {formData.workspace_priorities
                  .filter(wp => wp.workspace_type === 'advisor')
                  .sort((a, b) => a.priority - b.priority)
                  .map((wp) => (
                    <div key={wp.workspace_id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{wp.workspace_name}</span>
                        {wp.is_default && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            기본 설정
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">우선순위:</label>
                        <Input
                          type="number"
                          value={wp.priority}
                          onChange={(e) => handlePriorityChange(wp.workspace_id, parseInt(e.target.value) || 1)}
                          min={1}
                          max={10}
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {saving ? '저장 중...' : '맵핑 설정 저장'}
        </Button>
      </div>
    </div>
  );
};

export default TenantMappingComponent;
