# Implementation Plan: Background Workers

**Branch**: `001-background-workers` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-background-workers/spec.md`

## Summary

Implement BullMQ-based background job processing to enable asynchronous content generation, context scraping, and analytics sync. The worker runs as a separate DigitalOcean service, using Redis (Upstash) as the queue backend and PostgreSQL for job persistence. This unblocks the flywheel by enabling non-blocking AI operations with proper retry logic and observability.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: BullMQ 5.7.0 (already installed), Prisma ORM, ioredis
**Storage**: PostgreSQL (Render) + Redis (Upstash) for queue backend
**Testing**: Vitest for unit tests, Playwright for E2E
**Target Platform**: DigitalOcean App Platform (Linux container)
**Project Type**: Monorepo - workers app + web app integration
**Performance Goals**: 100 concurrent jobs per worker instance (SC-006)
**Constraints**: Job acknowledgment <2s, processing <5min for content generation
**Scale/Scope**: Single worker instance initially, horizontal scaling via instance_count

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Assessment

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Flywheel-First | ✅ | Integrates with ALL flywheel modules: Content Factory (generation), Context Engine (scraping), Analytics (sync), Brand Brain (learnings) |
| II. Type Safety | ✅ | Job payloads typed via Zod schemas, JobType/JobStatus enums in Prisma, typed processor signatures |
| III. Error Handling | ✅ | FR-002 mandates retry with exponential backoff (1m→5m→15m), FR-007 isolates failures, FR-010 notifies users |
| IV. Security | ✅ | REDIS_URL/DATABASE_URL in env vars, jobs scoped to brandId (multi-tenant), no credential storage in queue |
| V. Modular Services | ✅ | Workers in `apps/workers/`, job producers in `apps/web/src/lib/services/job-queue/`, clear boundaries |
| VI. Server-First | ✅ | N/A for workers (Node.js backend), job status API endpoints are server-only |
| VII. Observability | ✅ | FR-009 mandates logging with timestamps/duration/outcome, analytics sync feeds Brand Brain learnings |

## Project Structure

### Documentation (this feature)

```text
specs/001-background-workers/
├── plan.md              # This file
├── research.md          # Phase 0: Design decisions
├── data-model.md        # Phase 1: Entity schemas
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: API specifications
│   ├── jobs-api.yaml    # OpenAPI spec for job endpoints
│   └── job-payloads.ts  # TypeScript + Zod payload schemas
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/workers/
├── src/
│   ├── index.ts              # BullMQ worker initialization
│   ├── scheduler.ts          # Cron-based job scheduler
│   ├── queue.ts              # Queue and connection setup
│   ├── processors/           # Job type handlers
│   │   ├── content-generator.ts
│   │   ├── content-publisher.ts
│   │   ├── context-scraper.ts
│   │   ├── rss-syncer.ts
│   │   ├── analytics-collector.ts
│   │   └── token-refresher.ts
│   └── utils/
│       ├── logger.ts         # Structured logging
│       └── retry.ts          # Backoff utilities
├── tests/
│   ├── processors/           # Unit tests for processors
│   └── integration/          # Queue integration tests
└── package.json

apps/web/src/
├── app/api/jobs/             # REST API for job management
│   ├── route.ts              # POST /api/jobs (create), GET /api/jobs (list)
│   └── [id]/
│       └── route.ts          # GET/DELETE /api/jobs/:id
└── lib/services/
    └── job-queue/            # Job producer service
        ├── index.ts          # Exports
        ├── producer.ts       # Enqueue functions
        └── types.ts          # Shared job types
```

**Structure Decision**: Monorepo with dedicated `apps/workers/` for BullMQ consumers and `apps/web/src/lib/services/job-queue/` for producers. This maintains separation between the web app (Vercel) and worker (DigitalOcean) while sharing types via `packages/shared/`.

## Complexity Tracking

> **No violations - all Constitution principles satisfied.**

---

## Post-Design Constitution Check

*Verified after Phase 1 design completion.*

| Principle | Status | Implementation Reference |
|-----------|--------|--------------------------|
| I. Flywheel-First | ✅ | Content generation, scraping, analytics sync jobs all feed into flywheel. See `data-model.md` relationships diagram. |
| II. Type Safety | ✅ | Zod schemas in `contracts/job-payloads.ts` for all 8 job types. TypeScript interfaces for payloads and results. |
| III. Error Handling | ✅ | Retry strategy in `research.md` Decision 4. Per-type timeouts in Decision 5. Structured error logging throughout. |
| IV. Security | ✅ | Multi-tenant isolation via organizationId scoping. No secrets in payloads. Rate limiting at 50 jobs/org. |
| V. Modular Services | ✅ | Clear separation: `apps/workers/` (consumers), `apps/web/src/lib/services/job-queue/` (producers). |
| VI. Server-First | ✅ | All job processing is server-side. API routes in `apps/web/src/app/api/jobs/`. No client components. |
| VII. Observability | ✅ | Structured JSON logging defined in `research.md` Decision 9. Job status persisted in PostgreSQL for visibility. |

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Plan | `specs/001-background-workers/plan.md` | ✅ Complete |
| Research | `specs/001-background-workers/research.md` | ✅ Complete |
| Data Model | `specs/001-background-workers/data-model.md` | ✅ Complete |
| API Contract | `specs/001-background-workers/contracts/jobs-api.yaml` | ✅ Complete |
| Payload Types | `specs/001-background-workers/contracts/job-payloads.ts` | ✅ Complete |
| Quickstart | `specs/001-background-workers/quickstart.md` | ✅ Complete |
| Agent Context | `CLAUDE.md` (updated) | ✅ Complete |

---

## Next Steps

Run `/speckit.tasks` to generate implementation task breakdown, or `/speckit.clarify` if any requirements need refinement.
