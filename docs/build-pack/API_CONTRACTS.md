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
