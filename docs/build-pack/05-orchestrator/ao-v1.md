# Assembly Orchestrator v1 (agent_assemble_v1)

## Purpose
One job assembles a DRAFT agent by running engines in order and persisting each module config.

## Phases
0) ensure company enrichment
1) create or validate DRAFT agent (block PUBLISHED)
2) template engine → persist role_card.template_key
3) tools engine → persist tool_config
4) flow engine → persist brain_config.conversation_flows
5) personality engine → persist personality_config
6) knowledge seed → persist knowledge_config
7) governance defaults → persist governance_config
8) economics defaults → persist economics_config
9) build wizard_snapshot and set job.output

## Resumability
Store assembly_state in job progress/meta:
- phase
- completedPhases[]
- agentId

On restart:
- skip completed phases unless force=true

## Validation + repair
- Validate each phase output with strict schemas.
- If LLM output fails: repair once via structured “fix JSON to schema”.
- If still failing: job fails with audit log.

## Audit logging
Emit:
- job_started
- phase_started
- phase_completed
- phase_failed
- job_completed
- job_failed
