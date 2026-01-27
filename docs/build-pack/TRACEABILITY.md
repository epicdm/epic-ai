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
