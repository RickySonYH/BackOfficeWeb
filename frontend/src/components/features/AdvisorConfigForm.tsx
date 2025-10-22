import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { AdvisorConfig } from '../../types/workspace';
import { workspaceService } from '../../services/workspaceService';

interface AdvisorConfigFormProps {
  config: AdvisorConfig;
  onSave: (config: AdvisorConfig) => void;
  saving: boolean;
}

const AdvisorConfigForm: React.FC<AdvisorConfigFormProps> = ({ config, onSave, saving }) => {
  const [formConfig, setFormConfig] = useState<AdvisorConfig>(config);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setFormConfig(config);
  }, [config]);

  // 시나리오 추가
  const addScenario = () => {
    const newScenario = {
      id: `scenario_${Date.now()}`,
      name: '새 시나리오',
      description: '',
      category: '일반',
      triggers: [],
      order: formConfig.scenarios.length + 1
    };
    setFormConfig(prev => ({
      ...prev,
      scenarios: [...prev.scenarios, newScenario]
    }));
  };

  // 시나리오 삭제
  const removeScenario = (scenarioId: string) => {
    setFormConfig(prev => ({
      ...prev,
      scenarios: prev.scenarios.filter(scenario => scenario.id !== scenarioId)
    }));
  };

  // 시나리오 수정
  const updateScenario = (scenarioId: string, field: string, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(scenario =>
        scenario.id === scenarioId ? { ...scenario, [field]: value } : scenario
      )
    }));
  };

  // 시나리오 트리거 추가
  const addTriggerToScenario = (scenarioId: string, trigger: string) => {
    if (!trigger.trim()) return;
    
    setFormConfig(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(scenario =>
        scenario.id === scenarioId 
          ? { ...scenario, triggers: [...scenario.triggers, trigger.trim()] }
          : scenario
      )
    }));
  };

  // 시나리오 트리거 제거
  const removeTriggerFromScenario = (scenarioId: string, triggerIndex: number) => {
    setFormConfig(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(scenario =>
        scenario.id === scenarioId 
          ? { ...scenario, triggers: scenario.triggers.filter((_, index) => index !== triggerIndex) }
          : scenario
      )
    }));
  };

  // 응답 템플릿 카테고리 추가
  const addTemplateCategory = () => {
    const newCategory = {
      category: '새 카테고리',
      templates: []
    };
    setFormConfig(prev => ({
      ...prev,
      responseTemplates: [...prev.responseTemplates, newCategory]
    }));
  };

  // 응답 템플릿 카테고리 삭제
  const removeTemplateCategory = (categoryIndex: number) => {
    setFormConfig(prev => ({
      ...prev,
      responseTemplates: prev.responseTemplates.filter((_, index) => index !== categoryIndex)
    }));
  };

  // 응답 템플릿 추가
  const addTemplate = (categoryIndex: number) => {
    const newTemplate = {
      id: `template_${Date.now()}`,
      name: '새 템플릿',
      content: '',
      variables: []
    };
    
    setFormConfig(prev => ({
      ...prev,
      responseTemplates: prev.responseTemplates.map((category, index) =>
        index === categoryIndex 
          ? { ...category, templates: [...category.templates, newTemplate] }
          : category
      )
    }));
  };

  // 응답 템플릿 삭제
  const removeTemplate = (categoryIndex: number, templateIndex: number) => {
    setFormConfig(prev => ({
      ...prev,
      responseTemplates: prev.responseTemplates.map((category, index) =>
        index === categoryIndex 
          ? { ...category, templates: category.templates.filter((_, tIndex) => tIndex !== templateIndex) }
          : category
      )
    }));
  };

  // 트리거 조건 키워드 추가
  const addTriggerKeyword = (keyword: string) => {
    if (!keyword.trim()) return;
    
    setFormConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        keywords: [...prev.triggerConditions.keywords, keyword.trim()]
      }
    }));
  };

  // 트리거 조건 키워드 제거
  const removeTriggerKeyword = (keywordIndex: number) => {
    setFormConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        keywords: prev.triggerConditions.keywords.filter((_, index) => index !== keywordIndex)
      }
    }));
  };

  // 컨텍스트 규칙 추가
  const addContextRule = () => {
    const newRule = {
      field: '',
      operator: 'equals' as const,
      value: ''
    };
    
    setFormConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        contextRules: [...prev.triggerConditions.contextRules, newRule]
      }
    }));
  };

  // 저장
  const handleSave = () => {
    const validation = workspaceService.validateAdvisorConfig(formConfig);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    onSave(formConfig);
  };

  // 감정 옵션
  const sentimentOptions = [
    { value: 'any', label: '모든 감정' },
    { value: 'positive', label: '긍정적' },
    { value: 'negative', label: '부정적' },
    { value: 'neutral', label: '중립적' }
  ];

  // 연산자 옵션
  const operatorOptions = [
    { value: 'equals', label: '같음' },
    { value: 'contains', label: '포함' },
    { value: 'greater_than', label: '초과' },
    { value: 'less_than', label: '미만' }
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

      {/* 상담 시나리오 구조 */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-900 mb-4">💬 상담 시나리오 구조</h3>
        <div className="space-y-4">
          {formConfig.scenarios.map((scenario, index) => (
            <div key={scenario.id} className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900">시나리오 #{index + 1}</h4>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeScenario(scenario.id)}
                  disabled={formConfig.scenarios.length <= 1}
                >
                  삭제
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="시나리오명"
                  value={scenario.name}
                  onChange={(e) => updateScenario(scenario.id, 'name', e.target.value)}
                  fullWidth
                />
                <Input
                  label="카테고리"
                  value={scenario.category}
                  onChange={(e) => updateScenario(scenario.id, 'category', e.target.value)}
                  fullWidth
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={scenario.description || ''}
                  onChange={(e) => updateScenario(scenario.id, 'description', e.target.value)}
                  rows={2}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">트리거 키워드</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {scenario.triggers.map((trigger, triggerIndex) => (
                    <span
                      key={triggerIndex}
                      className="inline-flex items-center px-2 py-1 text-sm bg-green-100 text-green-800 rounded-full"
                    >
                      {trigger}
                      <button
                        onClick={() => removeTriggerFromScenario(scenario.id, triggerIndex)}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="트리거 키워드 입력"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTriggerToScenario(scenario.id, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                      addTriggerToScenario(scenario.id, input.value);
                      input.value = '';
                    }}
                    className="rounded-l-none"
                  >
                    추가
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addScenario} className="w-full">
            + 시나리오 추가
          </Button>
        </div>
      </div>

      {/* 응답 템플릿 카테고리 */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-4">📝 응답 템플릿 카테고리</h3>
        <div className="space-y-4">
          {formConfig.responseTemplates.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <Input
                  value={category.category}
                  onChange={(e) => {
                    const newTemplates = [...formConfig.responseTemplates];
                    newTemplates[categoryIndex].category = e.target.value;
                    setFormConfig(prev => ({ ...prev, responseTemplates: newTemplates }));
                  }}
                  className="font-medium"
                />
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => addTemplate(categoryIndex)}
                  >
                    템플릿 추가
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeTemplateCategory(categoryIndex)}
                    disabled={formConfig.responseTemplates.length <= 1}
                  >
                    카테고리 삭제
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {category.templates.map((template, templateIndex) => (
                  <div key={template.id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <Input
                        label="템플릿명"
                        value={template.name}
                        onChange={(e) => {
                          const newTemplates = [...formConfig.responseTemplates];
                          newTemplates[categoryIndex].templates[templateIndex].name = e.target.value;
                          setFormConfig(prev => ({ ...prev, responseTemplates: newTemplates }));
                        }}
                        className="flex-1 mr-2"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeTemplate(categoryIndex, templateIndex)}
                      >
                        삭제
                      </Button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 내용</label>
                      <textarea
                        value={template.content}
                        onChange={(e) => {
                          const newTemplates = [...formConfig.responseTemplates];
                          newTemplates[categoryIndex].templates[templateIndex].content = e.target.value;
                          setFormConfig(prev => ({ ...prev, responseTemplates: newTemplates }));
                        }}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="{{variable_name}} 형태로 변수를 사용할 수 있습니다"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addTemplateCategory} className="w-full">
            + 템플릿 카테고리 추가
          </Button>
        </div>
      </div>

      {/* 트리거 조건 설정 */}
      <div className="bg-yellow-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-900 mb-4">⚡ 트리거 조건 설정</h3>
        
        {/* 키워드 설정 */}
        <div className="bg-white p-4 rounded-lg border border-yellow-200 mb-4">
          <h4 className="font-medium text-gray-900 mb-3">트리거 키워드</h4>
          <div className="flex flex-wrap gap-2 mb-2">
            {formConfig.triggerConditions.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full"
              >
                {keyword}
                <button
                  onClick={() => removeTriggerKeyword(index)}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              placeholder="키워드 입력"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTriggerKeyword((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                addTriggerKeyword(input.value);
                input.value = '';
              }}
              className="rounded-l-none"
            >
              추가
            </Button>
          </div>
        </div>

        {/* 감정 설정 */}
        <div className="bg-white p-4 rounded-lg border border-yellow-200 mb-4">
          <Select
            label="감정 조건"
            value={formConfig.triggerConditions.sentiment}
            onChange={(e) => setFormConfig(prev => ({
              ...prev,
              triggerConditions: {
                ...prev.triggerConditions,
                sentiment: e.target.value as any
              }
            }))}
            options={sentimentOptions}
            fullWidth
          />
        </div>

        {/* 컨텍스트 규칙 */}
        <div className="bg-white p-4 rounded-lg border border-yellow-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">컨텍스트 규칙</h4>
            <Button variant="secondary" size="sm" onClick={addContextRule}>
              규칙 추가
            </Button>
          </div>
          <div className="space-y-3">
            {formConfig.triggerConditions.contextRules.map((rule, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <Input
                  label="필드"
                  value={rule.field}
                  onChange={(e) => {
                    const newRules = [...formConfig.triggerConditions.contextRules];
                    newRules[index].field = e.target.value;
                    setFormConfig(prev => ({
                      ...prev,
                      triggerConditions: { ...prev.triggerConditions, contextRules: newRules }
                    }));
                  }}
                />
                <Select
                  label="연산자"
                  value={rule.operator}
                  onChange={(e) => {
                    const newRules = [...formConfig.triggerConditions.contextRules];
                    newRules[index].operator = e.target.value as any;
                    setFormConfig(prev => ({
                      ...prev,
                      triggerConditions: { ...prev.triggerConditions, contextRules: newRules }
                    }));
                  }}
                  options={operatorOptions}
                />
                <Input
                  label="값"
                  value={rule.value}
                  onChange={(e) => {
                    const newRules = [...formConfig.triggerConditions.contextRules];
                    newRules[index].value = e.target.value;
                    setFormConfig(prev => ({
                      ...prev,
                      triggerConditions: { ...prev.triggerConditions, contextRules: newRules }
                    }));
                  }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const newRules = formConfig.triggerConditions.contextRules.filter((_, i) => i !== index);
                    setFormConfig(prev => ({
                      ...prev,
                      triggerConditions: { ...prev.triggerConditions, contextRules: newRules }
                    }));
                  }}
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
};

export default AdvisorConfigForm;
