-- [advice from AI] 기본 워크스페이스 템플릿 시드 데이터
-- 회사 생성 시 자동으로 생성되는 기본 워크스페이스 템플릿

-- KMS 기본 템플릿
INSERT INTO workspace_templates (id, name, type, default_config, is_system_default, description) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default KMS Workspace', 'KMS', 
'{
    "knowledge_sources": [],
    "indexing_enabled": true,
    "auto_learning": false,
    "vector_db_config": {
        "dimension": 1536,
        "similarity_metric": "cosine",
        "index_type": "hnsw"
    },
    "search_config": {
        "max_results": 10,
        "similarity_threshold": 0.7,
        "enable_semantic_search": true
    },
    "data_processing": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "enable_preprocessing": true,
        "supported_formats": ["pdf", "docx", "txt", "html", "md"]
    },
    "ui_settings": {
        "theme": "light",
        "language": "ko",
        "show_confidence_scores": true
    }
}', 
true, 
'기본 KMS 워크스페이스 - 지식 관리 시스템용 기본 설정') 
ON CONFLICT (id) DO NOTHING;

-- Advisor 기본 템플릿
INSERT INTO workspace_templates (id, name, type, default_config, is_system_default, description) VALUES 
('00000000-0000-0000-0000-000000000002', 'Default Advisor Workspace', 'ADVISOR', 
'{
    "response_templates": [
        {
            "id": "greeting",
            "name": "인사말",
            "template": "안녕하세요! 무엇을 도와드릴까요?",
            "category": "greeting"
        },
        {
            "id": "fallback",
            "name": "기본 응답",
            "template": "죄송합니다. 해당 질문에 대한 답변을 찾을 수 없습니다. 다른 방식으로 질문해 주시겠어요?",
            "category": "fallback"
        }
    ],
    "escalation_rules": [
        {
            "condition": "confidence < 0.5",
            "action": "human_handoff",
            "message": "전문 상담원에게 연결해드리겠습니다."
        },
        {
            "condition": "sentiment < -0.7",
            "action": "priority_escalation",
            "message": "고객님의 불편사항을 우선적으로 처리해드리겠습니다."
        }
    ],
    "sentiment_analysis": {
        "enabled": true,
        "threshold_positive": 0.3,
        "threshold_negative": -0.3,
        "language": "ko"
    },
    "conversation_config": {
        "max_context_length": 10,
        "enable_context_memory": true,
        "session_timeout": 1800
    },
    "auto_response_settings": {
        "enabled": false,
        "confidence_threshold": 0.8,
        "max_auto_responses": 3
    },
    "ui_settings": {
        "theme": "light",
        "language": "ko",
        "show_confidence_scores": false,
        "enable_quick_replies": true
    }
}', 
true, 
'기본 Advisor 워크스페이스 - 상담 어드바이저용 기본 설정') 
ON CONFLICT (id) DO NOTHING;

-- 고급 KMS 템플릿 (선택사항)
INSERT INTO workspace_templates (id, name, type, default_config, is_system_default, description) VALUES 
('00000000-0000-0000-0000-000000000003', 'Advanced KMS Workspace', 'KMS', 
'{
    "knowledge_sources": [],
    "indexing_enabled": true,
    "auto_learning": true,
    "vector_db_config": {
        "dimension": 1536,
        "similarity_metric": "cosine",
        "index_type": "hnsw",
        "ef_construction": 200,
        "m": 16
    },
    "search_config": {
        "max_results": 20,
        "similarity_threshold": 0.6,
        "enable_semantic_search": true,
        "enable_hybrid_search": true,
        "rerank_enabled": true
    },
    "data_processing": {
        "chunk_size": 800,
        "chunk_overlap": 150,
        "enable_preprocessing": true,
        "enable_entity_extraction": true,
        "supported_formats": ["pdf", "docx", "txt", "html", "md", "csv", "json"],
        "ocr_enabled": true
    },
    "ml_features": {
        "auto_tagging": true,
        "content_classification": true,
        "duplicate_detection": true,
        "quality_scoring": true
    },
    "ui_settings": {
        "theme": "light",
        "language": "ko",
        "show_confidence_scores": true,
        "enable_analytics": true
    }
}', 
false, 
'고급 KMS 워크스페이스 - 머신러닝 기능이 포함된 고급 설정') 
ON CONFLICT (id) DO NOTHING;

-- 고급 Advisor 템플릿 (선택사항)
INSERT INTO workspace_templates (id, name, type, default_config, is_system_default, description) VALUES 
('00000000-0000-0000-0000-000000000004', 'Advanced Advisor Workspace', 'ADVISOR', 
'{
    "response_templates": [
        {
            "id": "greeting",
            "name": "개인화된 인사말",
            "template": "안녕하세요 {{customer_name}}님! 오늘도 {{company_name}}을 이용해주셔서 감사합니다. 무엇을 도와드릴까요?",
            "category": "greeting",
            "personalization": true
        },
        {
            "id": "product_info",
            "name": "제품 정보",
            "template": "{{product_name}}에 대해 문의하셨군요. {{product_description}} 추가 정보가 필요하시면 언제든 말씀해 주세요.",
            "category": "product",
            "dynamic": true
        }
    ],
    "escalation_rules": [
        {
            "condition": "confidence < 0.6",
            "action": "suggest_alternatives",
            "message": "다음과 같은 관련 주제는 어떠신가요?"
        },
        {
            "condition": "confidence < 0.4",
            "action": "human_handoff",
            "message": "전문 상담원에게 연결해드리겠습니다."
        },
        {
            "condition": "sentiment < -0.5",
            "action": "priority_escalation",
            "message": "고객님의 불편사항을 우선적으로 처리해드리겠습니다."
        },
        {
            "condition": "conversation_length > 10",
            "action": "summary_and_escalate",
            "message": "대화 내용을 정리해서 전문 상담원에게 전달해드리겠습니다."
        }
    ],
    "sentiment_analysis": {
        "enabled": true,
        "threshold_positive": 0.3,
        "threshold_negative": -0.3,
        "language": "ko",
        "emotion_detection": true
    },
    "conversation_config": {
        "max_context_length": 20,
        "enable_context_memory": true,
        "session_timeout": 3600,
        "enable_conversation_summary": true
    },
    "auto_response_settings": {
        "enabled": true,
        "confidence_threshold": 0.85,
        "max_auto_responses": 5,
        "learning_enabled": true
    },
    "personalization": {
        "enabled": true,
        "customer_history": true,
        "preference_learning": true,
        "context_awareness": true
    },
    "analytics": {
        "conversation_tracking": true,
        "satisfaction_scoring": true,
        "topic_analysis": true,
        "performance_metrics": true
    },
    "ui_settings": {
        "theme": "light",
        "language": "ko",
        "show_confidence_scores": true,
        "enable_quick_replies": true,
        "enable_rich_responses": true,
        "enable_analytics": true
    }
}', 
false, 
'고급 Advisor 워크스페이스 - AI 개인화 및 분석 기능이 포함된 고급 설정') 
ON CONFLICT (id) DO NOTHING;
