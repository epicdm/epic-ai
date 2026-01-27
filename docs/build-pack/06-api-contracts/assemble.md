# Assemble API Contract

## POST /api/agent-os/agents/assemble
Body: AgentAssemblePayloadSchema
Response envelope:
{
  data: { jobId: string, agentId: string },
  confidence: {},
  evidence: [],
  gaps: [],
  warnings: []
}

## GET /api/agent-os/jobs/:id
Returns job status and when complete includes:
data: AgentWizardSnapshot
