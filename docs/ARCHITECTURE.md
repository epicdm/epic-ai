# Epic AI Architecture

This document provides a comprehensive overview of the Epic AI monorepo architecture, including all applications and packages, their purposes, tech stacks, and deployment considerations.

## Repository Overview

Epic AI is a pnpm monorepo using Turborepo for build orchestration. The codebase follows a modular architecture with clear separation between applications and shared packages.

```
epic-ai/
├── apps/
│   ├── web/              # Next.js 16 frontend (Production)
│   ├── workers/          # BullMQ background jobs (Production)
│   └── voice-service/    # Python Flask voice backend (Experimental)
├── packages/
│   ├── database/         # Prisma schema and client (Production)
│   ├── shared/           # Shared utilities and validators (Production)
│   └── ui/               # Shared React components (Production)
├── docs/                 # Documentation
└── docker-compose.yml    # Local infrastructure services
```

---

## Applications

### 1. Web Application (`apps/web`)

**Package Name:** `@epic-ai/web`
**Status:** ✅ Production-Critical
**Port:** 3000

The main user-facing Next.js application providing the marketing platform UI.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.7.x |
| Styling | Tailwind CSS | 3.4.x |
| Component Library | HeroUI | 2.8.x |
| Authentication | Clerk | 6.x |
| State Management | Zustand | 5.x |
| Forms | React Hook Form + Zod | 7.x + 3.x |
| HTTP Client | Built-in fetch | - |
| Analytics | PostHog | 1.x |
| Animation | Framer Motion | 11.x |
| Icons | Lucide React, Heroicons | - |

#### Entry Points

- **Layout:** `src/app/layout.tsx` - Root layout with ClerkProvider
- **Home:** `src/app/page.tsx` - Landing page
- **Dashboard:** `src/app/dashboard/` - Main authenticated UI
- **API Routes:** `src/app/api/` - Backend API endpoints

#### Key Directories

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── sign-in/      # Auth pages (Clerk)
│   │   └── sign-up/
│   ├── components/       # React components
│   ├── lib/              # Utilities and helpers
│   ├── hooks/            # Custom React hooks
│   └── styles/           # Global CSS
```

#### Commands

```bash
# Development
pnpm --filter @epic-ai/web dev
# Or from root:
pnpm dev

# Build
pnpm --filter @epic-ai/web build

# Start production
pnpm --filter @epic-ai/web start
```

#### Dependencies

- `@epic-ai/database` - Database client
- `@epic-ai/shared` - Shared utilities
- `@epic-ai/ui` - UI components

---

### 2. Background Workers (`apps/workers`)

**Package Name:** `@epic-ai/workers`
**Status:** ✅ Production-Critical
**Port:** N/A (Background process with health endpoint on 3001)

BullMQ-based background job processor for async operations like content generation, social media publishing, and analytics collection.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 20.x |
| Language | TypeScript | 5.4.x |
| Queue | BullMQ | 5.7.x |
| Scheduler | node-cron | 4.x |
| AI | OpenAI SDK | 6.x |
| Dev Runner | tsx | 4.x |
| Build Tool | tsup | 8.x |

#### Entry Points

- **Worker:** `src/index.ts` - Main worker process entry
- **Scheduler:** `src/scheduler.ts` - Cron job scheduler

#### Job Queues

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `content-generation` | AI content creation, image generation, publishing | 10 |
| `context-scraping` | Website scraping, RSS sync, document processing | 30 |
| `analytics-sync` | Social media analytics, token refresh | 60 |

#### Key Features

- Graceful shutdown with 30s timeout
- Stalled job recovery on startup
- Health check HTTP endpoint
- Stats monitoring (60s intervals)

#### Commands

```bash
# Development
pnpm --filter @epic-ai/workers dev

# Build
pnpm --filter @epic-ai/workers build

# Production
pnpm --filter @epic-ai/workers start
```

#### Dependencies

- `@epic-ai/database` - Database client
- `@epic-ai/shared` - Shared utilities

---

### 3. Voice Service (`apps/voice-service`)

**Package Name:** N/A (Python)
**Status:** ⚠️ Experimental (Feature-flagged)
**Port:** 5000 (Docker) / 8000 (Local)

Python Flask backend for voice AI features including phone calls, LiveKit integration, and Magnus Billing telephony.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Flask | 2.x |
| Language | Python | 3.x |
| Voice | LiveKit SDK | - |
| AI | OpenAI | - |
| Speech | Deepgram | - |
| Telephony | Magnus Billing | - |
| CORS | Flask-CORS | - |

#### Entry Points

- **Main:** `main.py` - Flask application entry
- **LiveKit:** `livekit_manager.py` - LiveKit room management
- **Telephony:** `livekit_telephony.py` - SIP trunk management
- **Agents:** `agent_creator.py` - Voice agent management
- **Billing:** `magnus_billing.py` - Magnus Billing client

#### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Health check |
| `/api/agents/*` | Voice agent CRUD |
| `/api/telephony/*` | SIP trunk management |
| `/api/magnus/*` | Magnus Billing integration |
| `/api/livekit/*` | LiveKit room management |

#### Commands

```bash
# Via Docker (recommended)
docker-compose up voice-service

# Local development
cd apps/voice-service
pip install -r requirements.txt
python main.py
```

#### Feature Flag

This service is controlled by the `NEXT_PUBLIC_ENABLE_VOICE_AI` environment variable. When disabled (default), voice-related UI elements are hidden.

---

## Packages

### 1. Database (`packages/database`)

**Package Name:** `@epic-ai/database`
**Status:** ✅ Production-Critical

Prisma ORM package providing type-safe database access for PostgreSQL.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 16.x |
| Build Tool | tsup | 8.x |

#### Entry Points

- **Client:** `src/index.ts` - Exports Prisma client
- **Schema:** `prisma/schema.prisma` - Database schema (49 models)

#### Database Models (49 total)

**Core (6):** `User`, `Organization`, `Membership`, `Brand`, `BrandBrain`, `Subscription`

**Content Factory (7):** `ContentItem`, `ContentVariation`, `ContentTemplate`, `PublishResult`, `ContentAnalytics`, `AutopilotConfig`

**Social & Publishing (5):** `SocialAccount`, `OAuthState`, `PublishingSchedule`, `PublishingLog`, `PostAnalytics`

**Voice Module (12):** `VoiceAgent`, `VoicePersona`, `SipConfig`, `PhoneMapping`, `CallLog`, `CallEvent`, `CallTranscript`, `TranscriptSegment`, `VoiceCampaign`, `CampaignLead`, `PricingConfig`, `CallCostBreakdown`

**Context Engine (3):** `ContextSource`, `ContextItem`, `DocumentUpload`

**Brand Brain Extensions (4):** `BrandAudience`, `ContentPillar`, `BrandCompetitor`, `BrandLearning`

**Onboarding & UX (5):** `FlywheelProgress`, `UserOnboardingProgress`, `WizardSession`, `FeatureDiscoveryState`, `DemoModeData`

**Analytics (2):** `AnalyticsSnapshot`, `LearningHistory`

**Ads & Leads (3):** `AdAccount`, `AdCampaign`, `Lead`

**Billing & Jobs (3):** `Usage`, `Job`, `VoiceUsageRecord`

#### Commands

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (no migrations)
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

#### Exports

```typescript
// Re-exports all Prisma types
export * from "@prisma/client";
// Pre-configured Prisma client instance
export { prisma } from "./client";
```

---

### 2. Shared (`packages/shared`)

**Package Name:** `@epic-ai/shared`
**Status:** ✅ Production-Critical

Shared utilities, types, constants, and validators used across the monorepo.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Language | TypeScript | 5.7.x |
| Validation | Zod | 3.24.x |
| Build Tool | tsup | 8.x |

#### Entry Point

- **Index:** `src/index.ts`

#### Exports

```typescript
export * from "./types";       // Shared TypeScript types
export * from "./constants";   // Application constants
export * from "./validators";  // Zod validation schemas
export * from "./utils";       // Utility functions
```

#### Files

- `src/types.ts` - TypeScript interfaces and types
- `src/constants.ts` - Application-wide constants
- `src/validators.ts` - Zod schemas for validation
- `src/utils.ts` - Utility functions

---

### 3. UI (`packages/ui`)

**Package Name:** `@epic-ai/ui`
**Status:** ✅ Production-Critical (Placeholder)

Shared React component library. Currently a placeholder with plans for future shared components.

#### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.x |
| Language | TypeScript | 5.7.x |
| Build Tool | tsup | 8.x |

#### Entry Point

- **Index:** `src/index.ts`

#### Current Exports

```typescript
export const UI_VERSION = "0.1.0";
```

> **Note:** This package is a placeholder. Shared components are currently housed in `apps/web/src/components/`. Future refactoring will move reusable components here.

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        apps/web                             │
│                   (Next.js Frontend)                        │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ @epic-ai/database│ │ @epic-ai/shared │ │  @epic-ai/ui    │
│  (Prisma ORM)    │ │  (Utilities)    │ │  (Components)   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │
          ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Database)    │
└─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      apps/workers                           │
│                  (Background Jobs)                          │
└─────────────────────────────────────────────────────────────┘
          │
          ├─────────────────┐
          ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│ @epic-ai/database│ │ @epic-ai/shared │
└─────────────────┘ └─────────────────┘
          │
          ▼
┌─────────────────┐         ┌─────────────────┐
│   PostgreSQL    │◄───────►│     Redis       │
└─────────────────┘         │  (Job Queue)    │
                            └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  apps/voice-service                         │
│               (Python Flask - Standalone)                   │
└─────────────────────────────────────────────────────────────┘
          │
          ├─────────────────┬─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │     Redis       │ │    LiveKit      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Build Pipeline

Turborepo manages the build pipeline with the following task configuration:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Build Order

1. `packages/database` → Generate Prisma client
2. `packages/shared` → Build shared utilities
3. `packages/ui` → Build UI components
4. `apps/web` → Build Next.js application
5. `apps/workers` → Build worker process

---

## Infrastructure Services

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Job queue (BullMQ) |
| `voice-service` | Custom Dockerfile | 5000 | Voice AI backend |

### Port Allocation

| Service | Port | Configurable |
|---------|------|--------------|
| Web (Next.js) | 3000 | `next dev -p PORT` |
| Workers Health | 3001 | Environment variable |
| PostgreSQL | 5432 | docker-compose.yml |
| Redis | 6379 | docker-compose.yml |
| Voice Service | 5000 | docker-compose.yml |
| Prisma Studio | 5555 | Default |

---

## Component Classification

| Component | Type | Status | Required for Local Dev |
|-----------|------|--------|------------------------|
| apps/web | Application | Production | ✅ Yes |
| apps/workers | Application | Production | ⚠️ Optional |
| apps/voice-service | Application | Experimental | ❌ No |
| packages/database | Package | Production | ✅ Yes |
| packages/shared | Package | Production | ✅ Auto-built |
| packages/ui | Package | Production | ✅ Auto-built |
| PostgreSQL | Infrastructure | Production | ✅ Yes |
| Redis | Infrastructure | Production | ⚠️ For workers |

**Legend:**
- ✅ **Production** - Required for production deployment
- ⚠️ **Optional** - Enhances functionality but not required for basic operation
- ❌ **Experimental** - Feature-flagged, disabled by default

---

## External Service Dependencies

### Required Services

| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| PostgreSQL | Primary database | `DATABASE_URL` |
| Clerk | Authentication | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |

### Optional Services

| Service | Purpose | Feature Flag | Environment Variables |
|---------|---------|--------------|----------------------|
| Redis | Job queues | Workers enabled | `REDIS_URL` |
| OpenAI | AI content generation | Content features | `OPENAI_API_KEY` |
| LiveKit | Voice AI | `NEXT_PUBLIC_ENABLE_VOICE_AI` | `LIVEKIT_*` |
| Deepgram | Speech-to-text | Voice features | `DEEPGRAM_API_KEY` |
| Magnus Billing | Telephony | Voice features | `MAGNUS_*` |
| Twitter | Social posting | Social connected | `TWITTER_*` |
| LinkedIn | Social posting | Social connected | `LINKEDIN_*` |
| Meta | Social posting | Social connected | `META_*` |
| Google | Social posting | Social connected | `GOOGLE_*` |
| Stripe | Payments | Billing enabled | `STRIPE_*` |
| PostHog | Analytics | Analytics enabled | `NEXT_PUBLIC_POSTHOG_*` |

---

## Related Documentation

- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Local development setup guide
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variable reference
- [RELEASE_READINESS.md](./RELEASE_READINESS.md) - Production deployment checklist
- [SYSTEM_TEST_PLAN.md](./SYSTEM_TEST_PLAN.md) - Testing documentation
