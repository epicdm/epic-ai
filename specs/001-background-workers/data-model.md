# Data Model: Background Workers

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-12-16

## Overview

This document defines the data entities for the Background Workers feature. The primary `Job` model already exists in the Prisma schema; this document clarifies its usage and defines the TypeScript types for job payloads.

---

## Entity: Job (Existing)

The `Job` model is already defined in `/packages/database/prisma/schema.prisma`. This section documents its usage for background workers.

### Schema (Existing)

```prisma
model Job {
  id              String    @id @default(cuid())
  type            JobType
  brandId         String?
  organizationId  String?   // For multi-tenant scoping
  payload         Json
  status          JobStatus
  priority        Int       @default(5)  // 1=HIGH, 5=NORMAL, 10=LOW
  attempts        Int       @default(0)
  maxAttempts     Int       @default(3)
  runAt           DateTime  @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  result          Json?
  error           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  brand           Brand?    @relation(fields: [brandId], references: [id])
  organization    Organization? @relation(fields: [organizationId], references: [id])

  @@index([status, runAt])
  @@index([type])
  @@index([organizationId, status])
}

enum JobType {
  SCRAPE_WEBSITE
  SYNC_RSS
  PROCESS_DOCUMENT
  GENERATE_CONTENT
  GENERATE_IMAGE
  PUBLISH_CONTENT
  SYNC_ANALYTICS
  REFRESH_TOKEN
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Unique job identifier |
| type | JobType | Determines which processor handles the job |
| brandId | String? | Associated brand (optional, for brand-specific jobs) |
| organizationId | String? | Organization scope for multi-tenant isolation |
| payload | Json | Job-specific input data (validated by Zod) |
| status | JobStatus | Current job state |
| priority | Int | Queue priority (1=high, 5=normal, 10=low) |
| attempts | Int | Current attempt number |
| maxAttempts | Int | Maximum retry attempts (default: 3) |
| runAt | DateTime | Scheduled execution time |
| startedAt | DateTime? | When processing began |
| completedAt | DateTime? | When processing finished |
| result | Json? | Job output data (on success) |
| error | String? | Error message (on failure) |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last modification timestamp |

### State Transitions

```
PENDING ──(worker picks up)──> RUNNING
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
          COMPLETED           FAILED              CANCELLED
              │                   │
              │     (attempts < maxAttempts)
              │                   │
              │                   ▼
              │              PENDING (retry)
              │                   │
              └───────────────────┘
```

---

## Entity: Schedule (Future Enhancement)

The Schedule entity is referenced in spec.md but will be implemented as a separate table in a future iteration. For MVP, schedules are managed through cron jobs in the DigitalOcean configuration.

### Proposed Schema (Not Implemented)

```prisma
model Schedule {
  id              String    @id @default(cuid())
  jobType         JobType
  cronExpression  String    // e.g., "0 */6 * * *" (every 6 hours)
  enabled         Boolean   @default(true)
  organizationId  String
  brandId         String?
  payload         Json      // Default payload for scheduled jobs
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])
  brand           Brand?       @relation(fields: [brandId], references: [id])

  @@unique([jobType, organizationId, brandId])
}
```

---

## Job Payload Types

Each job type has a specific payload structure validated by Zod schemas.

### Content Generation Payload

```typescript
// Used by: GENERATE_CONTENT job type
interface ContentGenerationPayload {
  brandId: string;
  topic: string;
  platforms: SocialPlatform[];  // ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']
  tone?: string;                // Override brand tone
  contentType?: ContentType;    // 'POST' | 'THREAD' | 'ARTICLE'
  contextItemIds?: string[];    // Specific context to include
}

// Zod schema
const ContentGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  topic: z.string().min(1).max(500),
  platforms: z.array(z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM'])).min(1),
  tone: z.string().optional(),
  contentType: z.enum(['POST', 'THREAD', 'ARTICLE']).optional(),
  contextItemIds: z.array(z.string().cuid()).optional(),
});
```

### Content Generation Result

```typescript
interface ContentGenerationResult {
  contentItemId: string;
  variations: {
    platform: SocialPlatform;
    variationId: string;
    content: string;
    characterCount: number;
  }[];
  tokensUsed: number;
  generationTimeMs: number;
}
```

---

### Context Scraping Payload

```typescript
// Used by: SCRAPE_WEBSITE, SYNC_RSS job types
interface ContextScrapingPayload {
  contextSourceId: string;      // Reference to ContextSource record
  brandId: string;
  url: string;
  sourceType: 'WEBSITE' | 'RSS';
  maxItems?: number;            // Limit items to process
}

// Zod schema
const ContextScrapingPayloadSchema = z.object({
  contextSourceId: z.string().cuid(),
  brandId: z.string().cuid(),
  url: z.string().url(),
  sourceType: z.enum(['WEBSITE', 'RSS']),
  maxItems: z.number().int().positive().optional(),
});
```

### Context Scraping Result

```typescript
interface ContextScrapingResult {
  itemsProcessed: number;
  itemsCreated: number;
  itemsSkipped: number;         // Duplicates or unchanged
  errors: {
    itemUrl?: string;
    message: string;
  }[];
  scrapeDurationMs: number;
}
```

---

### Analytics Sync Payload

```typescript
// Used by: SYNC_ANALYTICS job type
interface AnalyticsSyncPayload {
  socialAccountId: string;      // Reference to SocialAccount record
  organizationId: string;
  platform: SocialPlatform;
  syncType: 'FULL' | 'INCREMENTAL';
  postIds?: string[];           // Specific posts to sync (optional)
}

// Zod schema
const AnalyticsSyncPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  organizationId: z.string().cuid(),
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']),
  syncType: z.enum(['FULL', 'INCREMENTAL']),
  postIds: z.array(z.string().cuid()).optional(),
});
```

### Analytics Sync Result

```typescript
interface AnalyticsSyncResult {
  postsUpdated: number;
  metrics: {
    totalImpressions: number;
    totalEngagements: number;
    avgEngagementRate: number;
  };
  learningsGenerated: number;   // BrandLearning records created
  syncDurationMs: number;
  rateLimited: boolean;         // Whether rate limiting was encountered
}
```

---

### Token Refresh Payload

```typescript
// Used by: REFRESH_TOKEN job type
interface TokenRefreshPayload {
  socialAccountId: string;
  platform: SocialPlatform;
  organizationId: string;
}

// Zod schema
const TokenRefreshPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']),
  organizationId: z.string().cuid(),
});
```

### Token Refresh Result

```typescript
interface TokenRefreshResult {
  success: boolean;
  expiresAt?: Date;             // New token expiration
  requiresReauth: boolean;      // Whether user must re-authorize
}
```

---

## Relationships Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Organization │───────│    Brand     │───────│   BrandBrain │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │
       │                      │
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│     Job      │       │ ContentItem  │
├──────────────┤       ├──────────────┤
│ type         │       │ variations[] │
│ payload      │       └──────────────┘
│ status       │              │
│ result       │              ▼
└──────────────┘       ┌──────────────┐
       │               │ PostAnalytics│
       │               └──────────────┘
       │                      │
       │                      ▼
       │               ┌──────────────┐
       └──────────────▶│ BrandLearning│ (via analytics sync)
                       └──────────────┘

┌──────────────┐       ┌──────────────┐
│ContextSource │───────│ ContextItem  │
└──────────────┘       └──────────────┘
       ▲
       │
(via scraping job)

┌──────────────┐
│SocialAccount │
└──────────────┘
       ▲
       │
(via analytics sync / token refresh)
```

---

## Validation Rules

### Job Creation Rules

1. **organizationId Required**: All jobs must have an organizationId for multi-tenant isolation
2. **brandId Context**: Content generation and scraping jobs require brandId
3. **Priority Bounds**: priority must be 1, 5, or 10 (HIGH, NORMAL, LOW)
4. **Payload Validation**: payload must match Zod schema for job type
5. **Rate Limiting**: Max 50 concurrent jobs per organization

### Job State Rules

1. **Immutable After Completion**: COMPLETED/FAILED/CANCELLED jobs cannot be modified
2. **Retry Logic**: Failed jobs with attempts < maxAttempts return to PENDING
3. **Stale Job Recovery**: RUNNING jobs older than timeout are reset to PENDING

---

## Indexes

The Job model includes the following indexes for query performance:

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | id | Unique lookup |
| status_runAt | status, runAt | Worker polling for ready jobs |
| type | type | Filter jobs by type |
| org_status | organizationId, status | User job list queries |

---

## Migration Notes

No schema migrations required - the Job model already exists. If adding the Schedule model in future:

```bash
pnpm --filter @epic-ai/database db:migrate dev --name add_schedule_model
```
