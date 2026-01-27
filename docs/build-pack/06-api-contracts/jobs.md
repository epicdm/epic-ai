# Jobs API Contract

Jobs must expose:
- id
- status (queued/running/completed/failed)
- progress (phase, completedPhases, agentId)
- output when completed
- errors when failed
