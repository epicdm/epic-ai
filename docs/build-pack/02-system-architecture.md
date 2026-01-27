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
Agent stores 10 JSONB configs:
- role_card
- brain
- personality
- tools
- knowledge
- memory
- learning
- governance
- economics
- flow

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
