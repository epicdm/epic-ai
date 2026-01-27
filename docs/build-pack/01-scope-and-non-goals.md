# Scope and Non-goals

## In scope (AO v1)
- Deterministic enrichment extraction → structured company profile
- Template selection via scoring
- Tool assignment + dependency resolution + integration gaps
- Conversation flow generation with tool-linked actions
- Personality generation aligned to brand voice + industry norms + channel
- Knowledge seeding (facts + placeholders) and gap surfacing
- Governance defaults (invariants, escalation, compliance mode)
- Economics defaults (budgets, channel cost estimates)
- Resumable BullMQ job orchestration with audit logs
- Wizard snapshot response contract

## Out of scope (AO v1)
- UI redesign / polish / animations
- Full social scraping integrations (LinkedIn/IG/etc) beyond placeholders
- Deep RAG / vector search (knowledge seed is lightweight)
- Multi-agent orchestration (this build pack is per-agent, standalone)
- Auto-publishing agents (publishing remains an explicit action)
- Full analytics dashboards (only snapshot + gaps/warnings for wizard)

## Guiding rule
If it does not directly improve the “one-click generate agent draft” workflow, it is deferred.
