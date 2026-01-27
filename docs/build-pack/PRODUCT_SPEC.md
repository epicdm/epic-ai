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
