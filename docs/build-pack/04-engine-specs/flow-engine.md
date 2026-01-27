# Flow Engine (CFE v1)

## Purpose
Generate goal-oriented conversation flows (decision graph) tied to tools.

## Inputs
- template_key
- tool_config
- company_profile (industry, sales_complexity, audience)
- governance defaults

## Required minimum nodes
- greeting/start
- intent discovery
- qualification or triage
- decision (qualified? / resolved?)
- action (book, send info, create lead, escalate)
- outcome close

## Tool safety
Action nodes must only reference enabled tools.
If tool needed but missing:
- emit missing_integration or missing_required gap
