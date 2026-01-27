#!/usr/bin/env bash
set -euo pipefail

BASE="docs/build-pack"

mkdir -p \
  "$BASE/04-engine-specs" \
  "$BASE/05-orchestrator" \
  "$BASE/06-api-contracts" \
  "$BASE/07-ui-contracts" \
  "$BASE/08-testing" \
  "$BASE/09-runbooks"

########################################
# 00 OVERVIEW
########################################
cat <<'EOF' > "$BASE/00-overview.md"
# Build Pack — Agent OS Wizard + Assembly Orchestrator (AO v1)

## What we are building
An AI-native Agent Creation Wizard that behaves like a consultant:
1) learns the business (enrichment)
2) recommends the best agent template (template engine)
3) assigns tools based on purpose (tools engine)
4) generates goal-driven conversation flows (flow engine)
5) applies brand-aligned personality (personality engine)
6) seeds knowledge + governance + economics defaults
7) returns a single “wizard_snapshot” to drive the UI

## Non-negotiable product principles
- Company-first: start from business context, not tool toggles
- Proactive AI: autofill everything possible, surface gaps clearly
- Agent-centric: each agent is standalone + self-contained (config blobs)
- Tools follow purpose: capability stack is derived from use-case
- Governed outputs: strict schemas, evidence, confidence, gaps, warnings

## The two key deliverables
1) Assembly Orchestrator (AO v1): one job produces a complete DRAFT agent
2) Wizard Snapshot Contract: one envelope powers the full wizard UI

## End-to-end lifecycle
Input → Enrichment → Template → Tools → Flow → Personality → Knowledge/Gov/Econ → Wizard Snapshot → User Review → Publish

## What “done” looks like
- POST /api/agent-os/agents/assemble starts AO job and returns jobId
- Job completes and returns a schema-valid wizard_snapshot
- Wizard UI can hydrate from wizard_snapshot and guide user to next best step
- All tests pass, including resume + published protection + gaps merge invariants
EOF

########################################
# 01 SCOPE / NON-GOALS
########################################
cat <<'EOF' > "$BASE/01-scope-and-non-goals.md"
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
EOF

########################################
# 02 ARCHITECTURE
########################################
cat <<'EOF' > "$BASE/02-system-architecture.md"
# System Architecture (End-to-End)

## High-level pipeline
1) Company Understanding (Enrichment v1)
2) Template Decision Engine (TRE v1)
3) Tool Assignment Engine (TAIE v1)
4) Flow Engine (CFE v1)
5) Personality Engine (PE v1)
6) Knowledge Seed + Gov/Econ Defaults
7) Assemble Draft Agent + Wizard Snapshot

## Core data model: Agent OS config blobs
Agent stores 9 JSONB configs:
- role_card
- brain
- personality
- tools
- knowledge
- memory
- learning
- governance
- economics

Each blob is updated independently via patch-by-module routes.
All blobs are validated by strict Zod schemas.

## Execution model
- Orchestrator runs as BullMQ job: agent_assemble_v1
- Orchestrator is resumable with checkpoints
- Each phase writes to its respective JSONB module
- All outputs provide evidence/confidence/gaps/warnings

## Wizard model
Wizard is not a form builder.
Wizard is a review+edit surface over:
- decisions made by engines
- gaps the user must fill
- confidence levels to guide attention

## Governance invariants
- PUBLISHED agents cannot be modified; AO must operate on DRAFT only.
- All LLM outputs must validate schemas; repair once on failure.
- All state changes must be audit logged.
EOF

########################################
# 03 DATA MODEL / SCHEMAS
########################################
cat <<'EOF' > "$BASE/03-data-model-and-schemas.md"
# Data Model and Schemas

## Response envelope standard
Every engine and API response must adhere to:
{
  data: T,
  confidence: Record<string, number> (0..1),
  evidence: EvidenceItem[],
  gaps: GapItem[],
  warnings: WarningItem[]
}

## EvidenceItem (required for traceability)
Evidence must include:
- source_type (website, manual, inferred, system)
- field_path
- source_url or source_id
- quote/snippet
- reasoning
- optional confidence

Rules:
- Do not fabricate phone/email/pricing. Those must be evidenced.

## GapItem
Gap must include:
- gap_type enum (missing_required, missing_pricing, missing_integration, etc.)
- field_path
- severity enum (low/medium/high) or (info/warning/error)
- message
- suggested_action (optional)

Dedup rule:
- gap_type + field_path
Keep highest severity.

## Wizard Snapshot schema
AO output must validate a strict AgentWizardSnapshotSchema.
It is the single source of truth for wizard hydration.
EOF

########################################
# ENGINE SPECS
########################################
cat <<'EOF' > "$BASE/04-engine-specs/enrichment-v1.md"
# Enrichment v1

## Purpose
Create a reliable company intelligence profile from website/manual inputs.

## Inputs
- companyId
- websiteUrl (optional)
- userAnswers (optional manual entry)

## Deterministic extraction (required)
- HTML → structured text sections
- Contact extraction (email/phone/whatsapp mentions)
- Service extraction from headings/sections
- Pricing signal detection (keywords/symbols)

## LLM refinement (optional but recommended)
Task: company_enrichment_v1
- normalize industry/sub-industry
- infer business model
- infer target audience
- infer sales complexity
- infer recommended agent types
Rules:
- never invent phone/email/pricing
- if weak evidence: low confidence + gap

## Outputs
- company_profile (normalized)
- brand_voice_profile (if inferable)
- evidence/confidence/gaps/warnings
- persist: company.enrichedAt, company_profile, brand_voice_profile
EOF

cat <<'EOF' > "$BASE/04-engine-specs/template-engine.md"
# Template Engine (TRE v1)

## Purpose
Recommend the best agent template for a business.

## Inputs
- company_profile
- brand_voice_profile (optional)
- desiredTemplateKey (optional override)

## Scoring model (0–100)
- Industry match (30)
- Business model match (15)
- Sales complexity match (15)
- Service category fit (10)
- AI recommended agent types (10)
- Conversation fit (10)
- Market effectiveness prior (10)

## Output
data:
- template_key
- match_score
- reasoning[] (bullet-like strings)
confidence:
- template_key confidence
gaps:
- if profile incomplete, add missing_required gaps (e.g. missing industry)

## Override behavior
If desiredTemplateKey provided:
- template_key = desiredTemplateKey
- match_score = 100
- reasoning = ["User selected template"]
EOF

cat <<'EOF' > "$BASE/04-engine-specs/tools-engine.md"
# Tools Engine (TAIE v1)

## Purpose
Assign tools/capabilities based on template + business context.

## Inputs
- template_key
- company_profile (industry, business_model, sales_complexity)
- channel(s): voice/chat

## Tool taxonomy
Each tool includes:
- id, category
- required_for_templates[]
- best_for_industries[]
- business_model_fit[]
- sales_complexity_fit[]
- value_contribution
- dependencies[]

## Scoring model
Score = Template requirement (40) + Industry fit (25) + Complexity fit (20) + Model fit (15)

## Classification tiers
- ≥80: essential
- 60–79: recommended
- 40–59: optional
- <40: hidden/disabled

## Dependency resolution
If tool A depends on tool B, enabling A must enable B or emit gap.

## Integration gaps
If a tool requires external connection (calendar, crm, sms):
- Emit gap_type="missing_integration" for that tool field_path.

## Output
tool_config:
- essential_tools: [{id, reason}]
- recommended_tools: [{id, reason}]
- optional_tools: [{id, reason}]
- disabled_tools: [{id, reason}]
- dependencies: record
EOF

cat <<'EOF' > "$BASE/04-engine-specs/flow-engine.md"
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
EOF

cat <<'EOF' > "$BASE/04-engine-specs/personality-engine.md"
# Personality Engine (PE v1)

## Purpose
Set agent tone/persona to match brand voice + industry + role.

## Inputs
- brand_voice_profile (preferred)
- template_key
- industry norms
- channel(s): voice/chat/sms/email

## Base persona by template
- sales_qualifier: professional, warm, direct, concise
- support_agent: empathetic, patient, thorough
- appointment_setter: friendly, efficient, scheduling-forward

## Brand overlay
- apply do_say/dont_say phrases
- adjust formality/enthusiasm/empathy
- apply vocabulary style

## Channel tuning
Voice:
- shorter sentences
- confirm critical details
- handle interruptions gracefully

## Gaps
If brand_voice_profile missing:
- gap_type="missing_required", field_path="brand_voice_profile"
EOF

########################################
# ORCHESTRATOR DOCS
########################################
cat <<'EOF' > "$BASE/05-orchestrator/ao-v1.md"
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
EOF

cat <<'EOF' > "$BASE/05-orchestrator/job-payloads.md"
# Job Payloads

## agent_assemble_v1
Payload:
- companyId (required)
- websiteUrl (optional)
- desiredTemplateKey (optional)
- channels (optional; default ["voice"])
- userAnswers (optional)
- agentId (optional; if provided must be DRAFT)
- force (optional; default false)

Output:
- AgentWizardSnapshot (strict schema)
EOF

cat <<'EOF' > "$BASE/05-orchestrator/retry-and-resume.md"
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
EOF

########################################
# API CONTRACTS
########################################
cat <<'EOF' > "$BASE/06-api-contracts/assemble.md"
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
EOF

cat <<'EOF' > "$BASE/06-api-contracts/jobs.md"
# Jobs API Contract

Jobs must expose:
- id
- status (queued/running/completed/failed)
- progress (phase, completedPhases, agentId)
- output when completed
- errors when failed
EOF

cat <<'EOF' > "$BASE/06-api-contracts/patch-modules.md"
# Patch-by-Module Endpoints

AO writes to JSONB module configs; UI can also patch modules independently using existing routes.

Rules:
- Must validate with strict schemas
- Must reject PUBLISHED agent writes (409 AGENT_PUBLISHED)
- Must return response envelope (data/confidence/gaps/warnings)
EOF

########################################
# UI CONTRACTS
########################################
cat <<'EOF' > "$BASE/07-ui-contracts/wizard-snapshot.md"
# Wizard Snapshot Contract

Wizard Snapshot is the single payload that hydrates the wizard.

Contains:
- agentId, companyId, deploymentState
- selectedTemplate {template_key, match_score, reasoning[]}
- wizard_snapshot: module configs (company, role_card, tools, flows, personality, knowledge, governance, economics)
- confidence map
- evidence list
- gaps list
- warnings list

UI must:
- show gaps grouped by step
- show confidence badges
- navigate user to next best step
EOF

cat <<'EOF' > "$BASE/07-ui-contracts/gaps-and-confidence.md"
# Gaps and Confidence

## Gaps
- must be visible to user
- grouped by wizard step using field_path mapping
- high severity gaps block publish

## Confidence
- show per-step confidence summary (avg of relevant keys)
- low confidence triggers “review recommended” badges
EOF

cat <<'EOF' > "$BASE/07-ui-contracts/next-best-step.md"
# Next Best Step Resolver

Priority:
1) earliest step with high-severity gaps
2) integration gaps (tools step)
3) otherwise review step

Output:
{ stepId, reason, gaps[] }
EOF

########################################
# TESTING
########################################
cat <<'EOF' > "$BASE/08-testing/test-plan.md"
# Test Plan

## Required tests
1) assembly-orchestrator: job completes, snapshot validates, configs populated
2) assembly-resume: failure mid-phase resumes without rerunning earlier phases
3) published-protection: cannot modify published agents
4) gaps-merge: dedupe keeps highest severity

## Test strategy
Mock engines using fixtures.
Avoid real network or LLM calls.
EOF

cat <<'EOF' > "$BASE/08-testing/fixtures.md"
# Fixtures

Fixtures must include:
- company_profile sample (no pricing to force missing_pricing gap)
- brand_voice_profile sample
- engine output fixtures for each engine EngineResult<T>

All fixtures must validate strict Zod schemas.
EOF

########################################
# RUNBOOKS
########################################
cat <<'EOF' > "$BASE/09-runbooks/local-dev.md"
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
EOF

cat <<'EOF' > "$BASE/09-runbooks/troubleshooting.md"
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
EOF

echo "✅ Build Pack written to $BASE"
