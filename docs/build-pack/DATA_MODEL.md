# Data Model (V1)

## Company
- id
- name
- website_url
- company_profile (JSON)
- brand_voice_profile (JSON)
- created_at, updated_at

## AgentTemplate
- id
- name
- category
- best_for_outcomes (string[])
- required_knowledge (string[])
- default_tools (string[])
- role_defaults (JSON)
- brain_defaults (JSON)

## Agent
- id
- company_id
- template_id
- name
- deployment_state (draft|published)
- version (int)
- role_card (JSON)
- brain_config (JSON)
- personality_config (JSON)
- tool_config (JSON)
- knowledge_config (JSON)
- memory_config (JSON)
- learning_config (JSON)
- governance_config (JSON)
- economics_config (JSON)
- created_at, updated_at

## EnrichmentJob
- id
- company_id
- status (queued|running|completed|failed)
- input (JSON)
- output (JSON)
- error (text)
- created_at, updated_at

## Conversation
- id
- agent_id
- channel
- transcript (text/JSON)
- summary (text/JSON)
- outcome (JSON)
- risk_flags (JSON)
- created_at

## MemoryEvent
- id
- agent_id
- conversation_id
- memory_type
- payload (JSON)
- created_at

## AuditLog
- id
- company_id
- agent_id (nullable)
- event_type
- event_data (JSON)
- created_at
