# Troubleshooting

## Common issues
- Job stuck running:
  - worker not running, redis unavailable, queue misconfigured

- Schema validation failures:
  - check strict Zod schema mismatch
  - ensure JSON repair prompt runs once for LLM steps

- Published protection triggered:
  - AO must only operate on draft agents (use clone-draft first)

- Gaps not surfacing:
  - verify gap_type+field_path mapping and merge logic

## Debug steps
- Inspect job progress and output
- Inspect audit logs for phase failures
- Validate output with AgentWizardSnapshotSchema locally
