# Feature Specification: Background Workers

**Feature Branch**: `001-background-workers`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "Phase 1: Background Workers - Implement BullMQ queue processor and scheduler to unblock DigitalOcean deployment. Must handle content generation jobs, scraping tasks, and analytics sync with proper error handling and retry logic per Constitution Principle III."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Content Generation Queue Processing (Priority: P1)

As a marketing manager, I want content generation requests to be processed asynchronously so that the application remains responsive while AI generates content variations for multiple platforms.

**Why this priority**: Content generation is the core value proposition of the flywheel. Without background processing, users experience timeouts and the system cannot scale. This unblocks the entire publishing workflow.

**Independent Test**: Can be fully tested by submitting a content generation request and verifying that the job is queued, processed, and the generated content appears in the user's dashboard without blocking the UI.

**Acceptance Scenarios**:

1. **Given** a user submits a content generation request with a topic, **When** the request is received, **Then** the system acknowledges receipt immediately (within 2 seconds) and queues the job for background processing.

2. **Given** a content generation job is in the queue, **When** the worker processes the job, **Then** platform-specific variations (Twitter, LinkedIn, Facebook, Instagram) are generated and saved to the user's content library.

3. **Given** a content generation job fails during processing, **When** the failure is detected, **Then** the system retries the job up to 3 times with exponential backoff before marking it as failed.

4. **Given** a content generation job permanently fails, **When** all retry attempts are exhausted, **Then** the user is notified of the failure with a clear error message and the option to retry manually.

---

### User Story 2 - Context Scraping Tasks (Priority: P2)

As a marketing manager, I want my website and RSS feeds to be scraped automatically on a schedule so that the AI has fresh context for content generation without manual intervention.

**Why this priority**: Context freshness directly impacts content relevance. Scheduled scraping feeds the Context Engine, which improves the flywheel's output quality over time.

**Independent Test**: Can be fully tested by configuring a context source (website URL or RSS feed) and verifying that new content items appear in the context library after the scheduled scrape completes.

**Acceptance Scenarios**:

1. **Given** a user has configured a website URL as a context source, **When** the scheduled scrape runs, **Then** the system extracts relevant text content and stores it in the Context Engine.

2. **Given** a user has configured an RSS feed, **When** new items are published to the feed, **Then** the next scheduled scrape captures the new items and adds them to the context library.

3. **Given** a scraping job encounters a temporarily unavailable source, **When** the connection fails, **Then** the system retries with exponential backoff (up to 3 attempts) before logging the failure.

4. **Given** a context source consistently fails, **When** failures exceed a threshold (5 consecutive failures), **Then** the system marks the source as unhealthy and notifies the user.

---

### User Story 3 - Analytics Sync (Priority: P3)

As a marketing manager, I want post performance metrics to be collected automatically from all connected social platforms so that the AI can learn which content performs best and improve future recommendations.

**Why this priority**: Analytics sync completes the learning loop of the flywheel. Without it, the system cannot self-improve. However, it can operate without analytics while the other features provide immediate user value.

**Independent Test**: Can be fully tested by publishing content to a connected social account and verifying that engagement metrics (likes, comments, shares, impressions) appear in the analytics dashboard within the sync interval.

**Acceptance Scenarios**:

1. **Given** a user has published content to a connected social account, **When** the analytics sync job runs, **Then** the system fetches the latest metrics from the platform and updates the post's analytics record.

2. **Given** metrics are collected for multiple posts, **When** the sync completes, **Then** the system calculates aggregate engagement rates and stores insights in the Brand Brain for AI learning.

3. **Given** an analytics sync encounters rate limiting from a platform, **When** the rate limit is detected, **Then** the system respects the platform's backoff period and reschedules the sync accordingly.

4. **Given** a social account's OAuth token has expired, **When** the sync fails due to authentication, **Then** the system marks the account as needing re-authorization and notifies the user.

---

### User Story 4 - Job Scheduling and Management (Priority: P2)

As a system administrator, I want background jobs to run on configurable schedules so that workloads are distributed evenly and the system remains stable during high-traffic periods.

**Why this priority**: Scheduling controls system load and ensures predictable behavior. It's essential for production stability but can be configured with sensible defaults initially.

**Independent Test**: Can be fully tested by configuring a schedule for a job type and verifying that jobs execute at the expected times within a reasonable tolerance (±1 minute).

**Acceptance Scenarios**:

1. **Given** a job type is configured with a cron schedule, **When** the scheduled time arrives, **Then** the system enqueues the job automatically.

2. **Given** multiple job types are scheduled to run simultaneously, **When** the schedules trigger, **Then** jobs are processed in priority order without overwhelming system resources.

3. **Given** a scheduled job is currently running, **When** the next scheduled execution time arrives, **Then** the system skips the duplicate execution to prevent overlapping runs.

---

### Edge Cases

- What happens when a job is queued but the worker crashes mid-processing?
  *The job remains in "active" state and is recovered when the worker restarts (job must be re-queued after timeout).*

- What happens when the queue storage becomes unavailable?
  *The system logs the failure, surfaces a health check warning, and retries connection with exponential backoff.*

- How does the system handle malformed job payloads?
  *Invalid payloads are rejected immediately, logged for debugging, and not retried.*

- What happens when a single user floods the queue with requests?
  *Jobs are processed per-user with fair scheduling to prevent one user from monopolizing resources.*

- How does the system behave when an external API (social platform) is down?
  *Jobs dependent on the API are deferred with backoff, and a partial failure does not block other job types.*

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process content generation requests asynchronously without blocking the user interface.

- **FR-002**: System MUST retry failed jobs up to 3 times with exponential backoff (1 min, 5 min, 15 min delays).

- **FR-003**: System MUST provide job status visibility (queued, processing, completed, failed) to users and administrators.

- **FR-004**: System MUST execute scheduled scraping tasks based on configurable cron expressions.

- **FR-005**: System MUST sync analytics data from all connected social platforms at regular intervals (default: hourly).

- **FR-006**: System MUST handle platform rate limits gracefully by respecting backoff periods and rescheduling jobs.

- **FR-007**: System MUST isolate job failures so that one failed job does not affect other jobs in the queue.

- **FR-008**: System MUST persist job state to survive worker restarts without losing in-progress work.

- **FR-009**: System MUST log all job executions with timestamps, duration, and outcome for observability.

- **FR-010**: System MUST notify users when their jobs fail permanently (after all retries exhausted).

- **FR-011**: System MUST prevent duplicate job execution when schedules overlap with active jobs.

- **FR-012**: System MUST support priority levels for jobs so that critical tasks are processed first.

### Key Entities

- **Job**: Represents a unit of background work. Key attributes: type (content-generation, scraping, analytics-sync), status (queued, active, completed, failed), priority, retry count, created timestamp, completed timestamp, error message (if failed), associated user/organization.

- **Schedule**: Defines when recurring jobs should execute. Key attributes: job type, cron expression, enabled/disabled flag, last run timestamp, next run timestamp.

- **Job Result**: Captures the outcome of job execution. Key attributes: job reference, success/failure status, execution duration, output data (varies by job type), error details (if failed).

## Assumptions

- The system will use an existing Redis instance (Upstash) as the queue backend.
- Job execution time limits: content generation (5 minutes), scraping (2 minutes), analytics sync (3 minutes per platform).
- Default schedules: scraping (every 6 hours), analytics sync (every hour).
- Users will see job status in existing UI components (no new UI pages required for this phase).
- The worker process will run as a separate service on DigitalOcean App Platform.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Content generation requests receive acknowledgment within 2 seconds, with processing completing within 5 minutes for standard content.

- **SC-002**: 99% of jobs complete successfully on first attempt or after retries (excluding permanent external failures).

- **SC-003**: Scheduled jobs execute within 1 minute of their configured time under normal system load.

- **SC-004**: Worker restarts recover in-progress jobs within 5 minutes without user intervention.

- **SC-005**: Users are notified of permanent job failures within 15 minutes of final retry exhaustion.

- **SC-006**: The system handles 100 concurrent jobs per worker instance without degradation.

- **SC-007**: Job status updates are visible to users within 10 seconds of state changes.
