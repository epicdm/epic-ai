# Patch-by-Module Endpoints

AO writes to JSONB module configs; UI can also patch modules independently using existing routes.

Rules:
- Must validate with strict schemas
- Must reject PUBLISHED agent writes (409 AGENT_PUBLISHED)
- Must return response envelope (data/confidence/gaps/warnings)
