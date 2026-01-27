#!/usr/bin/env bash

set -e

BASE="docs/build-pack"

mkdir -p \
$BASE/04-engine-specs \
$BASE/05-orchestrator \
$BASE/06-api-contracts \
$BASE/07-ui-contracts \
$BASE/08-testing \
$BASE/09-runbooks

########################################
# 00 OVERVIEW
########################################
cat <<'EOF' > $BASE/00-overview.md
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
- Company-first
- Proactive AI
- Agent-centric
- Tools follow purpose
- Governed outputs

## The two key deliverables
1) Assembly Orchestrator (AO v1)
2) Wizard Snapshot Contract

## End-to-end lifecycle
Input → Enrichment → Template → Tools → Flow → Personality → Knowledge/Gov/Econ → Wizard Snapshot → User Review → Publish

## Done = 
- POST /assemble starts job
- Snapshot validates schema
- Wizard hydrates from snapshot
EOF

########################################
cat <<'EOF' > $BASE/01-scope-and-non-goals.md
# Scope and Non-goals

## In scope
Deterministic enrichment, template scoring, tool assignment, flow generation, personality alignment, governance defaults, wizard snapshot.

## Out of scope
UI polish, full social scraping, deep RAG, multi-agent orchestration.

## Rule
If it doesn't improve "generate agent draft", it's deferred.
EOF

########################################
cat <<'EOF' > $BASE/02-system-architecture.md
# System Architecture

Pipeline:
Enrichment → Template → Tools → Flow → Personality → Knowledge → Governance → Economics → Snapshot

Agent model uses 9 JSONB configs.

AO runs as BullMQ job: agent_assemble_v1
Wizard UI = review surface over AI decisions.
EOF

########################################
cat <<'EOF' > $BASE/03-data-model-and-schemas.md
# Data Model and Schemas

All responses use:
{ data, confidence, evidence, gaps, warnings }

Evidence required for factual claims.
Gaps deduped by (gap_type + field_path).

Wizard Snapshot = strict schema.
EOF

########################################
# ENGINE SPECS
########################################
cat <<'EOF' > $BASE/04-engine-specs/enrichment-v1.md
# Enrichment v1

Deterministic extraction:
- contacts
- services
- pricing signals

LLM refinement:
- industry
- business model
- audience

Never fabricate facts.
EOF

cat <<'EOF' > $BASE/04-engine-specs/template-engine.md
# Template Engine

Scoring:
Industry 30
Business Model 15
Sales Complexity 15
Service Fit 10
AI Recommendation 10
Conversation Fit 10
Market Effectiveness 10
EOF

cat <<'EOF' > $BASE/04-engine-specs/tools-engine.md
# Tools Engine

Score tools by:
Template need + Industry fit + Complexity fit + Model fit

Tiers:
Essential ≥80
Recommended 60–79
Optional 40–59
Disabled <40
EOF

cat <<'EOF' > $BASE/04-engine-specs/flow-engine.md
# Flow Engine

Goal-driven conversation graph.
Nodes must reference enabled tools only.
EOF

cat <<'EOF' > $BASE/04-engine-specs/personality-engine.md
# Personality Engine

Base persona from template.
Overlay brand voice.
Tune for channel.
EOF

########################################
# ORCHESTRATOR
########################################
cat <<'EOF' > $BASE/05-orchestrator/ao-v1.md
# Assembly Orchestrator

Phases:
Enrichment → Template → Tools → Flow → Personality → Knowledge → Gov → Econ → Snapshot

Resumable with checkpoints.
Validate each phase with strict schemas.
EOF

cat <<'EOF' > $BASE/05-orchestrator/job-payloads.md
# Job Payload

agent_assemble_v1:
companyId, websiteUrl?, desiredTemplateKey?, channels?, agentId?, force?
EOF

cat <<'EOF' > $BASE/05-orchestrator/retry-and-resume.md
# Retry & Resume

Repair invalid LLM JSON once.
Skip completed phases on resume.
EOF

########################################
# API
########################################
cat <<'EOF' > $BASE/06-api-contracts/assemble.md
# Assemble API

POST /assemble → {jobId, agentId}
GET /jobs/:id → snapshot when done
EOF

cat <<'EOF' > $BASE/06-api-contracts/jobs.md
# Jobs API

Status, progress, output, errors
EOF

cat <<'EOF' > $BASE/06-api-contracts/patch-modules.md
# Patch Modules

Strict schema validation.
Block PUBLISHED writes.
EOF

########################################
# UI
########################################
cat <<'EOF' > $BASE/07-ui-contracts/wizard-snapshot.md
# Wizard Snapshot

Single payload hydrates wizard.
Includes gaps, confidence, evidence.
EOF

cat <<'EOF' > $BASE/07-ui-contracts/gaps-and-confidence.md
# Gaps & Confidence

Gaps block publish if high severity.
Confidence drives review hints.
EOF

cat <<'EOF' > $BASE/07-ui-contracts/next-best-step.md
# Next Best Step

Earliest high-severity gap wins.
EOF

########################################
# TESTING
########################################
cat <<'EOF' > $BASE/08-testing/test-plan.md
# Test Plan

AO job completes.
Resume works.
Published protection works.
Gap merge invariant holds.
EOF

cat <<'EOF' > $BASE/08-testing/fixtures.md
# Fixtures

Mock engine outputs using schema-valid fixtures.
EOF

########################################
# RUNBOOKS
########################################
cat <<'EOF' > $BASE/09-runbooks/local-dev.md
# Local Dev

Start Redis, workers, web.
POST assemble.
Poll job.
EOF

cat <<'EOF' > $BASE/09-runbooks/troubleshooting.md
# Troubleshooting

Check worker, redis, schema validation, published protection.
EOF

echo "✅ Build Pack structure created successfully!"
