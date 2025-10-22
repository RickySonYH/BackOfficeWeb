import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { KmsConfig } from '../../types/workspace';
import { workspaceService } from '../../services/workspaceService';

interface KmsConfigFormProps {
  config: KmsConfig;
  onSave: (config: KmsConfig) => void;
  saving: boolean;
}

const KmsConfigForm: React.FC<KmsConfigFormProps> = ({ config, onSave, saving }) => {
  const [formConfig, setFormConfig] = useState<KmsConfig>(config);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setFormConfig(config);
  }, [config]);

  // 카테고리 추가
  const addCategory = () => {
    const newCategory = {
      id: `cat_${Date.now()}`,
      name: '새 카테고리',
      description: '',
      order: formConfig.categories.length + 1
    };
    setFormConfig(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
  };

  // 카테고리 삭제
  const removeCategory = (categoryId: string) => {
    setFormConfig(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId)
    }));
  };

  // 카테고리 수정
  const updateCategory = (categoryId: string, field: string, value: string | number) => {
    setFormConfig(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, [field]: value } : cat
      )
    }));
  };

  // 검색 파라미터 수정
  const updateSearchParams = (field: string, value: number) => {
    setFormConfig(prev => ({
      ...prev,
      searchParams: { ...prev.searchParams, [field]: value }
    }));
  };

  // RAG 설정 수정
  const updateRagConfig = (section: string, field: string, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      ragConfig: {
        ...prev.ragConfig,
        [section]: {
          ...prev.ragConfig[section as keyof typeof prev.ragConfig],
          [field]: value
        }
      }
    }));
  };

  // 기본 RAG 설정 수정
  const updateRagBasicConfig = (field: string, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      ragConfig: { ...prev.ragConfig, [field]: value }
    }));
  };

  // 저장
  const handleSave = () => {
    const validation = workspaceService.validateKmsConfig(formConfig);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    onSave(formConfig);
  };

  // 벡터 DB 제공자 옵션
  const vectorDbProviders = [
    { value: 'pinecone', label: 'Pinecone' },
    { value: 'weaviate', label: 'Weaviate' },
    { value: 'chroma', label: 'ChromaDB' }
  ];

  // 임베딩 모델 제공자 옵션
  const embeddingProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'huggingface', label: 'Hugging Face' },
    { value: 'cohere', label: 'Cohere' }
  ];

  return (
    <div className="space-y-8">
      {/* 유효성 검증 에러 표시 */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">설정 오류</h3>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 지식 카테고리 구조 */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-4">📚 지식 카테고리 구조</h3>
        <div className="space-y-4">
          {formConfig.categories.map((category, index) => (
            <div key={category.id} className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900">카테고리 #{index + 1}</h4>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeCategory(category.id)}
                  disabled={formConfig.categories.length <= 1}
                >
                  삭제
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="카테고리명"
                  value={category.name}
                  onChange={(e) => updateCategory(category.id, 'name', e.target.value)}
                  fullWidth
                />
                <Input
                  label="설명"
                  value={category.description || ''}
                  onChange={(e) => updateCategory(category.id, 'description', e.target.value)}
                  fullWidth
                />
                <Input
                  label="순서"
                  type="number"
                  value={category.order}
                  onChange={(e) => updateCategory(category.id, 'order', parseInt(e.target.value))}
                  fullWidth
                />
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addCategory} className="w-full">
            + 카테고리 추가
          </Button>
        </div>
      </div>

      {/* 검색 파라미터 */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-900 mb-4">🔍 검색 파라미터</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              유사도 임계값 ({formConfig.searchParams.similarityThreshold})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={formConfig.searchParams.similarityThreshold}
              onChange={(e) => updateSearchParams('similarityThreshold', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0</span>
              <span>1.0</span>
            </div>
          </div>
          <Input
            label="Top-K"
            type="number"
            value={formConfig.searchParams.topK}
            onChange={(e) => updateSearchParams('topK', parseInt(e.target.value))}
            min={1}
            max={100}
            fullWidth
          />
          <Input
            label="최대 결과 수"
            type="number"
            value={formConfig.searchParams.maxResults}
            onChange={(e) => updateSearchParams('maxResults', parseInt(e.target.value))}
            min={1}
            max={100}
            fullWidth
          />
        </div>
      </div>

      {/* RAG 설정 */}
      <div className="bg-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-purple-900 mb-4">🤖 RAG 설정</h3>
        
        {/* 벡터 DB 설정 */}
        <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
          <h4 className="font-medium text-gray-900 mb-3">벡터 데이터베이스</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="제공자"
              value={formConfig.ragConfig.vectorDb.provider}
              onChange={(e) => updateRagConfig('vectorDb', 'provider', e.target.value)}
              options={vectorDbProviders}
              fullWidth
            />
            <Input
              label="인덱스 이름"
              value={formConfig.ragConfig.vectorDb.indexName || ''}
              onChange={(e) => updateRagConfig('vectorDb', 'indexName', e.target.value)}
              fullWidth
            />
            <Input
              label="엔드포인트 URL"
              value={formConfig.ragConfig.vectorDb.endpoint || ''}
              onChange={(e) => updateRagConfig('vectorDb', 'endpoint', e.target.value)}
              fullWidth
            />
            <Input
              label="API 키"
              type="password"
              value={formConfig.ragConfig.vectorDb.apiKey || ''}
              onChange={(e) => updateRagConfig('vectorDb', 'apiKey', e.target.value)}
              fullWidth
            />
          </div>
        </div>

        {/* 임베딩 모델 설정 */}
        <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
          <h4 className="font-medium text-gray-900 mb-3">임베딩 모델</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="제공자"
              value={formConfig.ragConfig.embeddingModel.provider}
              onChange={(e) => updateRagConfig('embeddingModel', 'provider', e.target.value)}
              options={embeddingProviders}
              fullWidth
            />
            <Input
              label="모델명"
              value={formConfig.ragConfig.embeddingModel.model}
              onChange={(e) => updateRagConfig('embeddingModel', 'model', e.target.value)}
              fullWidth
            />
            <Input
              label="차원 수"
              type="number"
              value={formConfig.ragConfig.embeddingModel.dimension}
              onChange={(e) => updateRagConfig('embeddingModel', 'dimension', parseInt(e.target.value))}
              fullWidth
            />
          </div>
        </div>

        {/* 청킹 설정 */}
        <div className="bg-white p-4 rounded-lg border border-purple-200">
          <h4 className="font-medium text-gray-900 mb-3">문서 청킹 설정</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="청크 크기"
              type="number"
              value={formConfig.ragConfig.chunkSize}
              onChange={(e) => updateRagBasicConfig('chunkSize', parseInt(e.target.value))}
              fullWidth
            />
            <Input
              label="청크 오버랩"
              type="number"
              value={formConfig.ragConfig.chunkOverlap}
              onChange={(e) => updateRagBasicConfig('chunkOverlap', parseInt(e.target.value))}
              fullWidth
            />
          </div>
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
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
};

export default KmsConfigForm;
