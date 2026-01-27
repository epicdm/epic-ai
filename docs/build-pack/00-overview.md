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
