#!/usr/bin/env bash
set -euo pipefail

BASE="docs/build-pack"
mkdir -p "$BASE/prompts" "$BASE/schemas" "$BASE/tests"

cat > "$BASE/README.md" <<'EOF'
# Build Pack (Source of Truth)

This folder is the canonical specification for AI Agent OS v1.

Coding agents MUST:
- Treat these docs as the source of truth
- Map implementation to TRACEABILITY.md
- Validate prompt outputs against schemas
- Implement golden tests for non-negotiable constraints

If CHAT_SPEC_FULL.txt exists, it provides extended context. When conflicts exist,
these docs take precedence (PRODUCT_SPEC.md, API_CONTRACTS.md, TRACEABILITY.md).
EOF

cat > "$BASE/PRODUCT_SPEC.md" <<'EOF'
# AI Agent OS — V1 Product Specification

## Goal
A user can create ONE high-quality AI Sales Agent that:
- Learns the business (website/social/manual)
- Recommends a template based on outcome
- Autofills config with evidence + confidence
- Uses tools (Calendar, CRM, SMS, Knowledge)
- Can be tested, launched, and monitored safely

## V1 Included
- Company enrichment job (website/social/manual) -> structured company_profile + brand_voice_profile
- Template recommendation (ship 5 templates)
- Agent draft creation + patch-by-module configuration
- Knowledge ingestion + FAQ generation + gap detection
- Tool gateway abstraction (calendar/CRM/SMS/knowledge)
- Episodic memory summarization (PII-safe)
- Governance (risk detection, escalation, audit logs)
- Test harness (simulate)
- Basic economics estimates

## V1 Not Included
- Multi-agent orchestration/hierarchy
- Auto-deployed learning / autonomous experimentation
- Payments
- Advanced tool webhooks marketplace

## Non-negotiable constraints
1) Never hallucinate pricing or policies.
2) Every extracted fact MUST include evidence (or be explicitly manual).
3) Missing required knowledge MUST create a GAP with an exact question to user.
4) Prompt outputs MUST be JSON-only and schema-validated; retry once for JSON repair.
5) Memory MUST redact PII when policy disallows.
6) Governance policies override learning and tool actions.
EOF

cat > "$BASE/DATA_MODEL.md" <<'EOF'
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
EOF

cat > "$BASE/API_CONTRACTS.md" <<'EOF'
# API Contracts (V1)

## Companies
POST /api/v1/companies
POST /api/v1/companies/{company_id}/enrichment/jobs
GET  /api/v1/companies/{company_id}/enrichment/jobs/{job_id}
PATCH /api/v1/companies/{company_id}

## Templates
GET  /api/v1/templates
POST /api/v1/companies/{company_id}/template-recommendations

## Agents
POST /api/v1/companies/{company_id}/agents
GET  /api/v1/agents/{agent_id}
PATCH /api/v1/agents/{agent_id}/role-card
PATCH /api/v1/agents/{agent_id}/brain
PATCH /api/v1/agents/{agent_id}/personality
PATCH /api/v1/agents/{agent_id}/tools
PATCH /api/v1/agents/{agent_id}/knowledge
PATCH /api/v1/agents/{agent_id}/memory
PATCH /api/v1/agents/{agent_id}/learning
PATCH /api/v1/agents/{agent_id}/governance
PATCH /api/v1/agents/{agent_id}/economics
POST /api/v1/agents/{agent_id}/knowledge/jobs
POST /api/v1/agents/{agent_id}/test/simulate
POST /api/v1/agents/{agent_id}/publish
POST /api/v1/agents/{agent_id}/rollback

## Runtime
POST /api/v1/agents/{agent_id}/sessions
POST /api/v1/sessions/{session_id}/messages

## Metrics
GET /api/v1/agents/{agent_id}/metrics
GET /api/v1/companies/{company_id}/metrics
EOF

cat > "$BASE/EPICS_AND_SPRINTS.md" <<'EOF'
# Epics & Sprints (V1)

Sprint 1: Foundations (DB models, templates seed, base APIs)
Sprint 2: Company enrichment (job + prompt runner + schema validation)
Sprint 3: Agent config modules (role + brain + personality)
Sprint 4: Tool gateway + runtime orchestration (calendar first)
Sprint 5: Knowledge ingestion + memory
Sprint 6: Governance + testing + launch
Sprint 7 (optional): Learning suggestions + economics lite
EOF

cat > "$BASE/TRACEABILITY.md" <<'EOF'
# Traceability Matrix

| Requirement | Where | Test |
|-------------|-------|------|
| Missing pricing => gap | Knowledge extraction | test_missing_pricing_gap |
| Evidence required for extracted facts | Enrichment + Knowledge | test_evidence_required |
| Prompt output schema validation | Prompt runner | test_schema_validation |
| JSON repair retry once | Prompt runner | test_json_repair_retry |
| PII redaction when disallowed | Memory summarizer | test_pii_redaction |
| Risk flags include evidence quote | Risk detection | test_risk_evidence |
| Tool calls audited | Tool gateway | test_tool_audit_log |
| Governance overrides tool action | Runtime orchestrator | test_governance_override |
EOF

# Prompt stubs (keys)
cat > "$BASE/prompts/README.md" <<'EOF'
# Prompts

Store prompt templates here. Each prompt:
- Returns JSON-only
- Must validate against corresponding schema in ../schemas/
- Must include: result, confidence, evidence, gaps, warnings

Keys:
- company_enrichment_v1
- brand_voice_v1
- template_recommendation_v1
- agent_brain_policies_v1
- knowledge_extraction_faq_v1
- episodic_memory_summary_v1
- learning_proposals_safe_v1
- risk_detection_v1
- explainability_trace_v1
- economics_estimator_v1
EOF

cat > "$BASE/prompts/company_enrichment_v1.md" <<'EOF'
SYSTEM:
Return only valid JSON. Do not invent facts. Every filled field must have evidence unless it came from manual input.
If info is missing, leave empty and create a gap with a direct question.

TASK:
From provided sources, produce company_profile and brand_voice_profile plus confidence, evidence, gaps.

OUTPUT:
Must match the company_enrichment schema.
EOF

cat > "$BASE/prompts/knowledge_extraction_faq_v1.md" <<'EOF'
SYSTEM:
Return only valid JSON. Do not invent facts. Pricing/policies must never be guessed.
If required knowledge is missing, create gaps.

TASK:
Extract knowledge facts/services/policies and generate safe FAQs with evidence.
EOF

# Schema stubs
cat > "$BASE/schemas/README.md" <<'EOF'
# Schemas

These schemas define required JSON output shapes from prompts.
Implementation should validate LLM outputs against these schemas (Zod/JSONSchema).
EOF

cat > "$BASE/schemas/envelope.schema.json" <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PromptEnvelope",
  "type": "object",
  "required": ["result", "confidence", "evidence", "gaps"],
  "properties": {
    "result": { "type": "object" },
    "confidence": { "type": "object" },
    "evidence": { "type": "array" },
    "gaps": { "type": "array" },
    "warnings": { "type": "array" }
  },
  "additionalProperties": false
}
EOF

cat > "$BASE/schemas/company_enrichment.schema.json" <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CompanyEnrichmentOutput",
  "allOf": [{ "$ref": "./envelope.schema.json" }]
}
EOF

cat > "$BASE/schemas/knowledge_extraction_faq.schema.json" <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "KnowledgeExtractionFaqOutput",
  "allOf": [{ "$ref": "./envelope.schema.json" }]
}
EOF

# Test stubs
cat > "$BASE/tests/README.md" <<'EOF'
# Golden Tests (Specs)

These are language-agnostic golden tests. Implement them in workers/shared test suites.
EOF

cat > "$BASE/tests/test_missing_pricing_gap.md" <<'EOF'
Input: Website content with no pricing info.
Expected:
- pricing fields empty/unknown
- gap_type = "missing_pricing" exists with severity >= medium
- confidence for pricing < 0.4
EOF

cat > "$BASE/tests/test_pii_redaction.md" <<'EOF'
Input: Transcript includes phone/email/name.
Policy: pii_allowed=false.
Expected:
- episodic summary redacts PII
- warning includes pii_detected_and_redacted
EOF

cat > "$BASE/tests/test_evidence_required.md" <<'EOF'
Input: Website has explicit service list.
Expected:
- each extracted service has an evidence item pointing to a source_id and quote
EOF

echo "✅ docs/build-pack populated (starter content)."
echo "Next: add CHAT_SPEC_FULL.txt manually (paste your full chat) into docs/build-pack/CHAT_SPEC_FULL.txt"
