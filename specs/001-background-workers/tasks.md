# Tasks: Background Workers

**Input**: Design documents from `/specs/001-background-workers/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Workers**: `apps/workers/src/`
- **Web API**: `apps/web/src/app/api/jobs/`
- **Web Services**: `apps/web/src/lib/services/job-queue/`
- **Shared Types**: Leverages existing `contracts/job-payloads.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Redis connection, and shared utilities

- [ ] T001 Create Redis connection singleton in `apps/workers/src/lib/redis.ts` with ioredis config (maxRetriesPerRequest: null)
- [ ] T002 [P] Create structured logger utility in `apps/workers/src/lib/logger.ts` matching JobLog interface from research.md
- [ ] T003 [P] Create error classes in `apps/workers/src/lib/errors.ts` (JobProcessingError, TooManyJobsError, PayloadValidationError)
- [ ] T004 [P] Copy Zod schemas from `contracts/job-payloads.ts` to `apps/workers/src/types/payloads.ts` for worker-side validation
- [ ] T005 Create BullMQ queue definitions in `apps/workers/src/queues/index.ts` (content-generation, context-scraping, analytics-sync queues)
- [ ] T006 Create default job options with retry strategy in `apps/workers/src/queues/options.ts` (attempts: 3, backoff: 1m/5m/15m)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create job producer service in `apps/web/src/lib/services/job-queue/producer.ts` with enqueueJob() function
- [ ] T008 [P] Create job types export in `apps/web/src/lib/services/job-queue/types.ts` re-exporting from contracts
- [ ] T009 Create job-queue service index in `apps/web/src/lib/services/job-queue/index.ts` with exports
- [ ] T010 Implement POST /api/jobs endpoint in `apps/web/src/app/api/jobs/route.ts` for job creation
- [ ] T011 [P] Implement GET /api/jobs endpoint in `apps/web/src/app/api/jobs/route.ts` for job listing with filters
- [ ] T012 [P] Implement GET /api/jobs/[id] endpoint in `apps/web/src/app/api/jobs/[id]/route.ts` for job details
- [ ] T013 [P] Implement DELETE /api/jobs/[id] endpoint in `apps/web/src/app/api/jobs/[id]/route.ts` for job cancellation
- [ ] T014 Implement POST /api/jobs/[id]/retry endpoint in `apps/web/src/app/api/jobs/[id]/retry/route.ts` for retry
- [ ] T015 Create base processor function template in `apps/workers/src/processors/base.ts` with logging and error handling wrapper
- [ ] T016 Update worker entry point in `apps/workers/src/index.ts` to initialize BullMQ workers with graceful shutdown

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Content Generation Queue Processing (Priority: P1)

**Goal**: Process content generation requests asynchronously without blocking UI. Users submit topic, get acknowledgment in <2s, content appears in dashboard when ready.

**Independent Test**: Submit content generation request via API, verify job is queued (PENDING), worker processes it, content appears in ContentItem table with platform variations.

### Implementation for User Story 1

- [ ] T017 [US1] Create content-generator processor in `apps/workers/src/processors/content-generator.ts` calling ContentFactory service
- [ ] T018 [US1] Register content-generation worker in `apps/workers/src/index.ts` with concurrency: 10, lockDuration: 5min
- [ ] T019 [US1] Implement job completion handler to update Job.result with ContentGenerationResult in `apps/workers/src/processors/content-generator.ts`
- [ ] T020 [US1] Implement job failure handler to update Job.error and Job.status in `apps/workers/src/processors/content-generator.ts`
- [ ] T021 [US1] Add Prisma Job status updates (RUNNING→COMPLETED/FAILED) in content-generator processor
- [ ] T022 [US1] Add integration with existing ContentFactory service in `apps/web/src/lib/services/content-factory/`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Context Scraping Tasks (Priority: P2)

**Goal**: Scrape websites and RSS feeds automatically on schedule, storing content in Context Engine for AI context.

**Independent Test**: Configure a context source URL, trigger scrape job, verify new ContextItem records appear in database with extracted content.

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create context-scraper processor in `apps/workers/src/processors/context-scraper.ts` for SCRAPE_WEBSITE jobs
- [ ] T024 [P] [US2] Create rss-syncer processor in `apps/workers/src/processors/rss-syncer.ts` for SYNC_RSS jobs
- [ ] T025 [US2] Register context-scraping worker in `apps/workers/src/index.ts` with concurrency: 30, lockDuration: 2min
- [ ] T026 [US2] Integrate with existing WebsiteScraper from `apps/web/src/lib/services/context-engine/`
- [ ] T027 [US2] Integrate with existing RSSFeedScraper from `apps/web/src/lib/services/context-engine/`
- [ ] T028 [US2] Implement unhealthy source detection (5 consecutive failures) in scraper processors
- [ ] T029 [US2] Add Prisma Job and ContextSource status updates in scraper processors

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Job Scheduling and Management (Priority: P2)

**Goal**: Run background jobs on configurable schedules (cron), prevent overlapping executions, distribute workload evenly.

**Independent Test**: Configure a cron schedule, verify jobs execute within ±1 minute of scheduled time, verify duplicate runs are skipped when previous job is still active.

### Implementation for User Story 4

- [ ] T030 [US4] Create scheduler service in `apps/workers/src/scheduler.ts` with cron job registration
- [ ] T031 [US4] Implement deterministic jobId generation for deduplication (`${jobType}-${scheduleId}-${timestamp}`)
- [ ] T032 [US4] Add duplicate job detection before enqueuing in scheduler
- [ ] T033 [US4] Register default schedules: scraping (every 6 hours), analytics sync (every hour) in scheduler
- [ ] T034 [US4] Implement graceful scheduler shutdown handling
- [ ] T035 [US4] Add scheduler health check logging (next run times, active schedules)

**Checkpoint**: At this point, User Stories 1, 2, and 4 should all work independently

---

## Phase 6: User Story 3 - Analytics Sync (Priority: P3)

**Goal**: Collect post performance metrics from all connected social platforms, feed insights to Brand Brain for AI learning loop.

**Independent Test**: Publish content to connected social account, trigger analytics sync job, verify PostAnalytics records updated with engagement metrics, verify BrandLearning records generated.

### Implementation for User Story 3

- [ ] T036 [US3] Create analytics-collector processor in `apps/workers/src/processors/analytics-collector.ts` for SYNC_ANALYTICS jobs
- [ ] T037 [US3] Register analytics-sync worker in `apps/workers/src/index.ts` with concurrency: 60, lockDuration: 3min
- [ ] T038 [US3] Integrate with existing Analytics service from `apps/web/src/lib/services/analytics/`
- [ ] T039 [US3] Implement rate limit detection and backoff for platform APIs in analytics-collector
- [ ] T040 [US3] Handle expired OAuth token detection in analytics-collector (mark account needs reauth)
- [ ] T041 [US3] Implement BrandLearning generation from aggregated metrics in analytics-collector

**Checkpoint**: All 4 user stories should now be independently functional

---

## Phase 7: Supporting Processors (Cross-Cutting)

**Purpose**: Additional job processors that support multiple user stories

- [ ] T042 [P] Create token-refresher processor in `apps/workers/src/processors/token-refresher.ts` for REFRESH_TOKEN jobs
- [ ] T043 [P] Create document-processor in `apps/workers/src/processors/document-processor.ts` for PROCESS_DOCUMENT jobs
- [ ] T044 [P] Create content-publisher processor in `apps/workers/src/processors/content-publisher.ts` for PUBLISH_CONTENT jobs
- [ ] T045 [P] Create image-generator processor in `apps/workers/src/processors/image-generator.ts` for GENERATE_IMAGE jobs
- [ ] T046 Register all supporting workers in `apps/workers/src/index.ts` with appropriate concurrency settings

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T047 [P] Add per-organization rate limiting (50 concurrent jobs) in `apps/web/src/lib/services/job-queue/producer.ts`
- [ ] T048 [P] Add job status notification badge logic for failed jobs in dashboard (if UI exists)
- [ ] T049 Implement stalled job recovery in worker startup in `apps/workers/src/index.ts`
- [ ] T050 [P] Add health check endpoint for worker in `apps/workers/src/health.ts`
- [ ] T051 Verify DigitalOcean deployment config in `.do/app.yaml` matches worker requirements
- [ ] T052 Run quickstart.md validation - test local Redis + worker setup
- [ ] T053 [P] Add monitoring: log worker stats every 60 seconds (completed/failed/active counts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Supporting Processors (Phase 7)**: Can run in parallel with or after user stories
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent but benefits from US4 for scheduling

### Within Each User Story

- Base infrastructure before processors
- Processors before worker registration
- Integration with existing services before completion handlers
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# Run in parallel:
T002 (logger), T003 (errors), T004 (payloads)
```

**Phase 2 (Foundational)**:
```bash
# Run in parallel:
T011 (GET /jobs), T012 (GET /jobs/[id]), T013 (DELETE /jobs/[id])
```

**Phase 4 (US2)**:
```bash
# Run in parallel:
T023 (context-scraper), T024 (rss-syncer)
```

**Phase 7 (Supporting)**:
```bash
# All tasks can run in parallel:
T042, T043, T044, T045
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T016)
3. Complete Phase 3: User Story 1 (T017-T022)
4. **STOP and VALIDATE**: Test content generation end-to-end
5. Deploy to DigitalOcean - MVP is live!

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 → Content generation works
2. **+US2**: Add scraping → Context stays fresh automatically
3. **+US4**: Add scheduling → Jobs run on cron
4. **+US3**: Add analytics sync → Learning loop complete
5. **+Supporting**: Add remaining processors → Full feature set

### Parallel Team Strategy

With 2-3 developers:

1. All complete Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (content generation)
   - Developer B: User Story 2 (scraping) + User Story 4 (scheduling)
   - Developer C: User Story 3 (analytics) + Supporting processors
3. Stories complete and integrate independently

---

## Task Summary

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| Phase 1: Setup | - | 6 | 4 |
| Phase 2: Foundational | - | 10 | 4 |
| Phase 3: US1 | Content Generation | 6 | 0 |
| Phase 4: US2 | Context Scraping | 7 | 2 |
| Phase 5: US4 | Job Scheduling | 6 | 0 |
| Phase 6: US3 | Analytics Sync | 6 | 0 |
| Phase 7: Supporting | Cross-cutting | 5 | 4 |
| Phase 8: Polish | Cross-cutting | 7 | 4 |
| **Total** | | **53** | **18** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Job model already exists in Prisma - no migrations needed
- BullMQ 5.7.0 already installed in workers package
