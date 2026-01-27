# Local Development Runbook

## Start services
- Redis running (required for BullMQ)
- Workers running
- Web running

## Trigger assembly
POST /api/agent-os/agents/assemble
{
  "companyId": "...",
  "websiteUrl": "https://example.com",
  "channels": ["voice"]
}

## Poll job
GET /api/agent-os/jobs/:jobId

When complete:
- job.output contains AgentWizardSnapshot
