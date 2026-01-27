# Retry and Resume Rules

## Retry
- Engine phase may be retried by job retry.
- LLM JSON repair is allowed once per phase when schema validation fails.

## Resume
- If completedPhases contains a phase, skip unless force=true.
- Always verify agent is DRAFT before writing; if not, stop with AGENT_PUBLISHED (or equivalent).

## Gap merging
Dedup key: gap_type + field_path
Keep highest severity
