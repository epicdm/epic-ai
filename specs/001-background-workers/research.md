# Research: Background Workers

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-12-16

## Executive Summary

This research document resolves technical decisions for the Background Workers feature. The codebase already has BullMQ 5.7.0 installed, a Job model in Prisma, and DigitalOcean deployment infrastructure ready. Research focused on best practices for connecting these existing pieces.

---

## Decision 1: Queue Architecture

### Question
How should jobs flow between the web app (producer) and workers (consumer)?

### Decision
**Dual-storage pattern**: BullMQ for queue mechanics (Redis), Prisma Job model for persistence and user visibility.

### Rationale
- BullMQ handles scheduling, retries, concurrency, and backpressure automatically
- Prisma Job model provides queryable job history, user-facing status, and audit trail
- Jobs are created in both systems: Prisma for durability, BullMQ for processing
- Worker updates Prisma record on completion/failure

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Prisma-only polling | High database load, no native retry/scheduling, reinventing queue logic |
| BullMQ-only | No job history persistence across Redis restarts, harder to query for UI |
| Separate event bus (Kafka) | Over-engineered for current scale, adds operational complexity |

---

## Decision 2: Redis Connection Strategy

### Question
How should workers connect to Upstash Redis for BullMQ?

### Decision
**Direct ioredis connection** using `REDIS_URL` environment variable (already configured in DigitalOcean app.yaml).

### Rationale
- BullMQ requires ioredis (not HTTP-based Upstash SDK)
- Upstash provides standard Redis connection string for ioredis compatibility
- Connection pooling handled by BullMQ internally
- TLS enabled by default with Upstash URLs

### Configuration
```typescript
// apps/workers/src/lib/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,    // Faster startup
});
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Upstash REST SDK | BullMQ requires native Redis protocol, not HTTP |
| Local Redis | Not suitable for production, Upstash already provisioned |
| Redis Cluster | Upstash single-node sufficient for current scale |

---

## Decision 3: Job Priority Implementation

### Question
How should job priorities (FR-012) be implemented?

### Decision
**Three priority levels** mapped to BullMQ priority numbers (lower = higher priority).

### Rationale
- BullMQ supports integer priorities (default: 0)
- Simple 3-tier system covers all use cases without complexity
- Aligns with P1/P2/P3 priority classification in spec

### Implementation
| Priority | BullMQ Value | Use Case |
|----------|--------------|----------|
| HIGH (1) | 1 | User-initiated content generation, manual retries |
| NORMAL (2) | 5 | Scheduled scraping, routine analytics sync |
| LOW (3) | 10 | Bulk operations, background optimization tasks |

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Single priority queue | Cannot prioritize user-initiated over background work |
| 10-level system | Unnecessary complexity, harder to reason about |
| Separate queues per priority | Complicates concurrency management |

---

## Decision 4: Retry Strategy

### Question
How should exponential backoff (FR-002) be implemented?

### Decision
**BullMQ native backoff** with custom delay calculation.

### Rationale
- BullMQ has built-in exponential backoff support
- Matches spec requirements: 1 min, 5 min, 15 min delays
- Automatic retry tracking and failure handling

### Configuration
```typescript
// Job options for all queues
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'custom',
    delay: (attemptsMade: number) => {
      // 1 min, 5 min, 15 min
      const delays = [60000, 300000, 900000];
      return delays[attemptsMade - 1] || delays[delays.length - 1];
    },
  },
  removeOnComplete: { count: 1000 }, // Keep last 1000 completed
  removeOnFail: { count: 5000 },     // Keep last 5000 failed for debugging
};
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Fixed delay | Doesn't provide progressively longer waits |
| Fibonacci backoff | Non-standard, harder to communicate to users |
| Custom retry logic | Reinvents BullMQ's battle-tested implementation |

---

## Decision 5: Job Timeout Handling

### Question
How should long-running jobs be handled to prevent stuck workers?

### Decision
**Per-queue timeout configuration** matching spec limits, with stalled job recovery.

### Rationale
- Different job types have different expected durations
- BullMQ's stalled job detection handles crashed workers (FR-008)
- Timeout triggers automatic retry, not immediate failure

### Configuration
| Queue | Timeout | Stall Interval |
|-------|---------|----------------|
| content-generation | 5 minutes | 30 seconds |
| context-scraping | 2 minutes | 15 seconds |
| analytics-sync | 3 minutes | 20 seconds |

```typescript
// Queue-specific worker options
const contentWorker = new Worker('content-generation', processor, {
  connection: redis,
  lockDuration: 300000, // 5 min lock
  stalledInterval: 30000, // Check every 30s
});
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Global timeout | Different job types need different limits |
| No timeout | Stuck jobs could block worker indefinitely |
| Aggressive timeout (30s) | Content generation legitimately takes minutes |

---

## Decision 6: Concurrency Model

### Question
How many jobs should process concurrently per worker instance?

### Decision
**Per-queue concurrency limits** totaling ~100 concurrent jobs per instance (SC-006).

### Rationale
- Different job types have different resource profiles
- Content generation is CPU/API-intensive (lower concurrency)
- Analytics sync is I/O-bound (higher concurrency)
- Total concurrency matches success criteria SC-006

### Configuration
| Queue | Concurrency | Rationale |
|-------|-------------|-----------|
| content-generation | 10 | OpenAI API rate limits, high memory |
| context-scraping | 30 | I/O-bound, many parallel requests safe |
| analytics-sync | 60 | API calls with wait time, low CPU |

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Single global concurrency | Can't optimize per job type |
| Unlimited concurrency | Risk of overwhelming external APIs |
| Fixed 10 per queue | Underutilizes I/O-bound job capacity |

---

## Decision 7: Duplicate Job Prevention

### Question
How should duplicate scheduled job execution (FR-011) be prevented?

### Decision
**BullMQ jobId-based deduplication** combined with cron schedule tracking.

### Rationale
- BullMQ rejects jobs with duplicate IDs within retention period
- Scheduler tracks lastRunAt to skip if job still active
- Combination prevents both exact duplicates and overlapping runs

### Implementation
```typescript
// Scheduler creates jobs with deterministic IDs
const jobId = `${jobType}-${scheduleId}-${scheduledTime.toISOString()}`;

// Before scheduling, check if job exists
const existing = await queue.getJob(jobId);
if (existing && ['waiting', 'active', 'delayed'].includes(await existing.getState())) {
  logger.info(`Skipping duplicate job: ${jobId}`);
  return;
}
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Database lock | Additional complexity, BullMQ handles this |
| Timestamp-based | Doesn't catch overlapping runs |
| No deduplication | Violates FR-011, wastes resources |

---

## Decision 8: User Notification Strategy

### Question
How should users be notified of permanent job failures (FR-010)?

### Decision
**Database flag + in-app notification** (no external push for MVP).

### Rationale
- Users check job status in existing UI components (per spec assumption)
- Database `Job.error` field stores failure reason
- Future: email/push notifications can be added without architecture change

### Implementation
1. Worker marks job as FAILED with error message
2. API returns failed jobs when user queries their jobs
3. Dashboard shows notification badge for failed jobs
4. User can click to see details and retry manually

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Real-time WebSocket | Over-engineered for MVP, adds infrastructure |
| Email notification | Requires email service integration, not in scope |
| SMS alerts | Overkill for content generation failures |

---

## Decision 9: Logging Strategy

### Question
How should job executions be logged for observability (FR-009)?

### Decision
**Structured JSON logging** with consistent fields across all job types.

### Rationale
- JSON format enables log aggregation and querying
- Consistent fields allow cross-job-type analysis
- DigitalOcean App Platform captures stdout logs automatically

### Log Schema
```typescript
interface JobLog {
  timestamp: string;      // ISO 8601
  level: 'info' | 'warn' | 'error';
  jobId: string;
  jobType: JobType;
  event: 'started' | 'progress' | 'completed' | 'failed' | 'retrying';
  duration?: number;      // milliseconds (on completion)
  attempt?: number;       // current attempt number
  error?: string;         // error message (on failure)
  metadata?: Record<string, unknown>; // job-specific data
}
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Plain text logs | Hard to query and aggregate |
| External logging service | Adds dependency, DigitalOcean captures logs |
| Database logging | High volume, better suited for log aggregation |

---

## Decision 10: Fair Scheduling (Edge Case)

### Question
How should the system prevent one user from monopolizing queue resources?

### Decision
**Per-organization rate limiting** at job creation time.

### Rationale
- Fair scheduling handled at producer (API) level, not worker
- Each organization has a maximum concurrent jobs limit
- Prevents queue flooding while allowing burst traffic

### Implementation
```typescript
// Before enqueuing a new job
const activeJobs = await prisma.job.count({
  where: {
    organizationId,
    status: { in: ['PENDING', 'RUNNING'] },
  },
});

const ORG_JOB_LIMIT = 50;
if (activeJobs >= ORG_JOB_LIMIT) {
  throw new TooManyJobsError('Maximum concurrent jobs reached');
}
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| BullMQ rate limiting | Per-queue, not per-organization |
| No limiting | One user could flood queue, affecting others |
| Global limit | Punishes all users for one user's behavior |

---

## Technology Best Practices Applied

### BullMQ Best Practices
- ✅ Use `maxRetriesPerRequest: null` for ioredis connection
- ✅ Implement graceful shutdown with `worker.close()`
- ✅ Use stalled job recovery for crashed workers
- ✅ Set appropriate `lockDuration` per job type
- ✅ Use `jobId` for idempotency

### Error Handling (Constitution Principle III)
- ✅ All processors wrapped in try-catch
- ✅ Structured error responses with context
- ✅ Errors logged before propagating
- ✅ User-facing errors sanitized (no stack traces)

### Type Safety (Constitution Principle II)
- ✅ Zod schemas for job payloads at API boundary
- ✅ TypeScript interfaces for all job types
- ✅ No `any` types in worker code
- ✅ Prisma-generated types for database operations

---

## Open Questions (Resolved)

All technical questions have been resolved. No NEEDS CLARIFICATION items remain.

---

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Upstash Redis for BullMQ](https://upstash.com/docs/redis/sdks/bullmq-js)
- [DigitalOcean Workers Guide](https://docs.digitalocean.com/products/app-platform/how-to/manage-workers/)
