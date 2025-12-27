# Quickstart: Background Workers

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-12-16

## Overview

This guide provides step-by-step instructions for setting up and running the Background Workers feature locally.

---

## Prerequisites

- Node.js 20+ installed
- pnpm 8+ installed
- Docker (for local Redis) OR Upstash Redis account
- PostgreSQL database running (Render or local)
- Environment variables configured (see `.env.example`)

---

## Quick Setup

### 1. Install Dependencies

```bash
# From repository root
pnpm install
```

### 2. Configure Environment

Create or update `.env` in the repository root:

```bash
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/epic_ai"

# Redis/Queue (required for workers)
REDIS_URL="redis://localhost:6379"
# OR for Upstash:
# REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"

# OpenAI (for content generation jobs)
OPENAI_API_KEY="sk-xxx"
```

### 3. Start Local Redis (if not using Upstash)

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Verify connection
docker exec redis redis-cli ping
# Should return: PONG
```

### 4. Generate Prisma Client

```bash
pnpm --filter @epic-ai/database generate
```

### 5. Run Database Migrations

```bash
pnpm --filter @epic-ai/database db:push
```

---

## Running Workers Locally

### Start Worker Process

```bash
# Terminal 1: Start the worker
pnpm --filter workers dev
```

Expected output:
```
[Worker] Connecting to Redis...
[Worker] Connected to Redis
[Worker] Starting content-generation worker (concurrency: 10)
[Worker] Starting context-scraping worker (concurrency: 30)
[Worker] Starting analytics-sync worker (concurrency: 60)
[Worker] Ready to process jobs
```

### Start Scheduler (Optional)

```bash
# Terminal 2: Start the scheduler for cron jobs
pnpm --filter workers dev:scheduler
```

### Start Web App

```bash
# Terminal 3: Start Next.js for API routes
pnpm --filter web dev
```

---

## Testing Job Processing

### Create a Test Job via API

```bash
# Create a content generation job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "type": "GENERATE_CONTENT",
    "brandId": "YOUR_BRAND_ID",
    "payload": {
      "topic": "AI trends in marketing",
      "platforms": ["TWITTER", "LINKEDIN"]
    },
    "priority": "NORMAL"
  }'
```

Response:
```json
{
  "id": "clxyz123abc",
  "type": "GENERATE_CONTENT",
  "status": "PENDING",
  "createdAt": "2025-12-16T10:00:00Z"
}
```

### Check Job Status

```bash
curl http://localhost:3000/api/jobs/clxyz123abc \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

### List All Jobs

```bash
curl "http://localhost:3000/api/jobs?status=PENDING&limit=10" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## Development Workflow

### File Structure

```
apps/workers/src/
├── index.ts              # Main entry - starts all workers
├── scheduler.ts          # Cron scheduler entry
├── queues/               # BullMQ queue definitions
├── processors/           # Job handlers
├── lib/                  # Utilities (redis, logger, errors)
└── types/                # TypeScript definitions
```

### Adding a New Job Type

1. **Define payload type** in `contracts/job-payloads.ts`:
```typescript
export const MyJobPayloadSchema = z.object({
  // ...fields
});
```

2. **Add to PayloadSchemaMap**:
```typescript
export const PayloadSchemaMap = {
  // ...existing
  [JobType.MY_JOB]: MyJobPayloadSchema,
};
```

3. **Create processor** in `apps/workers/src/processors/`:
```typescript
export async function processMyJob(job: Job<MyJobPayload>): Promise<MyJobResult> {
  // Implementation
}
```

4. **Register queue** in `apps/workers/src/index.ts`:
```typescript
const myQueue = new Worker('my-job', processMyJob, {
  connection: redis,
  concurrency: 10,
});
```

### Running Tests

```bash
# Unit tests
pnpm --filter workers test

# Integration tests (requires Redis)
pnpm --filter workers test:integration

# Watch mode
pnpm --filter workers test:watch
```

---

## Debugging

### View Redis Queue State

```bash
# Using Redis CLI
redis-cli

# List all queues
KEYS bull:*

# View pending jobs in content-generation queue
LRANGE bull:content-generation:wait 0 -1

# View active jobs
SMEMBERS bull:content-generation:active

# View job data
HGETALL bull:content-generation:JOB_ID
```

### Enable Debug Logging

```bash
# Set DEBUG environment variable
DEBUG=bullmq:* pnpm --filter workers dev
```

### Check Worker Health

```bash
# Worker outputs periodic health stats
[Worker] Stats: {
  "content-generation": { "completed": 150, "failed": 2, "active": 3 },
  "context-scraping": { "completed": 50, "failed": 0, "active": 1 },
  "analytics-sync": { "completed": 200, "failed": 5, "active": 10 }
}
```

---

## Common Issues

### "Cannot connect to Redis"

**Cause**: Redis not running or wrong URL.

**Fix**:
```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_URL in .env
echo $REDIS_URL
```

### "Job stuck in RUNNING state"

**Cause**: Worker crashed mid-processing.

**Fix**: Jobs auto-recover after `stalledInterval` (30s-60s). To force recovery:
```bash
# In Redis CLI
redis-cli SMEMBERS bull:content-generation:active
# Note the job IDs, then restart worker
```

### "maxRetriesPerRequest error"

**Cause**: ioredis connection option not set correctly for BullMQ.

**Fix**: Ensure Redis connection includes:
```typescript
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
});
```

### "Zod validation error"

**Cause**: Job payload doesn't match expected schema.

**Fix**: Check payload against schema in `contracts/job-payloads.ts`.

---

## Validation Tests

### T050: Health Check Endpoint

```bash
# Start worker and verify health endpoint
pnpm --filter workers dev &
sleep 5

# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "healthy",
#   "uptime": 5,
#   "lastJobProcessedAt": null,
#   "queues": [
#     { "name": "content-generation", "waiting": 0, "active": 0, ... }
#   ],
#   "timestamp": "2025-12-22T..."
# }
```

### T049: Stalled Job Recovery

```bash
# 1. Create a job and simulate worker crash
# 2. Restart worker and check logs for:
#    "[worker] Found X stalled jobs, recovering..."
#    "[worker] Recovered X stalled jobs"

# Verify in Prisma Studio that previously RUNNING jobs
# older than 30 minutes are now marked as FAILED
```

### T047: Per-Organization Rate Limiting

```bash
# Create 51 jobs rapidly for the same organization
for i in {1..51}; do
  curl -X POST http://localhost:3000/api/jobs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"type": "GENERATE_CONTENT", "brandId": "BRAND_ID", "payload": {...}}'
done

# The 51st request should return:
# { "error": "Too many pending jobs for this organization" }
# Status code: 429
```

### T053: Worker Stats Monitoring

```bash
# Start worker and wait 60+ seconds
# Check logs for queue stats output every 60 seconds:
#
# [worker] Queue stats: content-generation { waiting: 0, active: 0, completed: 5, failed: 0, ... }
# [worker] Queue stats: context-scraping { waiting: 2, active: 1, completed: 10, failed: 1, ... }
# [worker] Queue stats summary { waiting: 2, active: 1, completed: 15, failed: 1 }
```

### T048: Failed Jobs Dashboard Badge

```bash
# Create a job that will fail (e.g., missing API key)
# Check dashboard API response includes:
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response should include:
# { ..., "jobs": { "failed": 1 }, ... }
```

---

## Next Steps

1. **Implement processors**: Start with `content-generation.ts`
2. **Add API routes**: Create `/api/jobs` endpoints in web app
3. **Hook existing services**: Connect Content Factory to queue producer
4. **Deploy to DigitalOcean**: Use `.do/app.yaml` configuration

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm --filter workers dev` | Start worker in development |
| `pnpm --filter workers build` | Build worker for production |
| `pnpm --filter workers start` | Start built worker |
| `pnpm --filter workers test` | Run unit tests |
| `pnpm --filter @epic-ai/database studio` | Open Prisma Studio |
