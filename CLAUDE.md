# Epic AI 2.0 - Claude Code Instructions

## Project Overview

Epic AI is a **self-improving AI marketing platform** built around a flywheel architecture. Each component feeds into the next, and the output of the last step improves the first step. The more you use it, the better it gets.

### Core Concept: The Flywheel

```
Brand Brain → Content Factory → Publishing Engine → Analytics → Learning Loop
     ↑                                                              │
     └──────────────────── AI Improvements ─────────────────────────┘
```

## Deployment Architecture

| Platform | Service | URL |
|----------|---------|-----|
| **Vercel** | Next.js web app | https://leads.epic.dm |
| **DigitalOcean** | n8n workflows, background workers | (App Platform) |
| **Render** | PostgreSQL database, Voice AI service | (Managed services) |
| **Postiz** | Social media management (legacy) | https://social.leads.epic.dm |

**Note:** Postiz is being replaced by native OAuth integrations (PKG-022). The new architecture uses direct platform APIs.

---

## The 7 Core Modules

### 1. Brand Brain (PKG-020)
**Purpose:** Central intelligence storing everything about the brand.

**Stores:**
- Company name, industry, mission, values
- Voice & tone settings (professional, friendly, witty, etc.)
- Formality level (1-5 scale)
- Emoji and hashtag preferences
- Words/topics to avoid
- Target audiences (personas with demographics, pain points, goals)
- Content pillars (themes you post about)
- Competitors to track
- AI-generated learnings

**Location:** `apps/web/src/lib/services/brand-brain/`

### 2. Context Engine (PKG-021)
**Purpose:** Feed external information to keep content relevant.

**Data Sources:**
- Website scraping
- RSS feeds
- Document uploads (PDFs)
- Manual notes

**Location:** `apps/web/src/lib/services/context-engine/`

### 3. Native Social Connectors (PKG-022)
**Purpose:** Direct OAuth connections to social platforms (replaces Postiz).

**Platforms:**
- Twitter/X (OAuth 2.0 with PKCE)
- LinkedIn (OAuth 2.0)
- Facebook Pages (OAuth 2.0)
- Instagram (via Facebook Graph API)

**Location:** `apps/web/src/lib/services/social-publishing/`

### 4. Content Factory (PKG-023)
**Purpose:** AI-powered content generation using brand voice.

**Flow:**
```
User Topic → Brand Brain + Context → GPT-4o → Platform Variations
```

**Generates platform-specific versions:**
- Twitter: 280 chars, punchy
- LinkedIn: Professional, thought-leadership
- Facebook: Conversational
- Instagram: Visual, emoji-heavy

**Location:** `apps/web/src/lib/services/content-factory/`

### 5. Publishing Engine (PKG-024)
**Purpose:** Schedule and automate content publishing.

**Features:**
- Manual scheduling
- Auto-scheduling (optimal times)
- Cron job (every minute)
- Rate limiting per platform
- Retry logic (max 3 attempts)

**Location:** `apps/web/src/lib/services/publishing-engine/`

### 6. Analytics & Learning Loop (PKG-025)
**Purpose:** Collect metrics and generate AI-powered insights.

**Metrics:**
- Impressions, reach
- Likes, comments, shares
- Engagement rate
- Link clicks

**AI Learning:** Analyzes patterns and saves insights to Brand Brain for future content improvement.

**Location:** `apps/web/src/lib/services/analytics/`

### 7. Unified Dashboard (PKG-026)
**Purpose:** Command center showing everything in one place.

**Sections:**
- Flywheel Status (0-100% health)
- Quick Actions
- Organic/Paid Metrics
- Lead Stats
- AI Insights
- Recent Activity
- Connected Accounts

**Location:** `apps/web/src/components/dashboard/unified-dashboard.tsx`

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, TypeScript, Tailwind CSS, HeroUI
- **State:** Zustand, React Query
- **Forms:** React Hook Form + Zod
- **Auth:** Clerk

### Backend
- **API:** Next.js API Routes
- **Voice Service:** Python Flask + LiveKit
- **Database:** PostgreSQL + Prisma ORM
- **Cache/Queue:** Redis (Upstash)
- **Storage:** S3-compatible (Cloudflare R2)
- **AI:** OpenAI GPT-4o, DALL-E 3

### Infrastructure
- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend Hosting:** Vercel
- **Backend Hosting:** DigitalOcean App Platform, Render
- **Voice:** LiveKit Cloud

---

## Project Structure

```
epic-ai/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App router pages
│   │   │   │   ├── (dashboard)/      # Dashboard route group
│   │   │   │   │   ├── dashboard/    # Main dashboard
│   │   │   │   │   ├── brand/        # Brand Brain UI
│   │   │   │   │   ├── content/      # Content Factory UI
│   │   │   │   │   ├── analytics/    # Analytics UI
│   │   │   │   │   └── onboarding/   # Onboarding flow
│   │   │   │   └── api/              # API routes
│   │   │   │       ├── dashboard/    # Unified dashboard API
│   │   │   │       ├── brand-brain/  # Brand Brain APIs
│   │   │   │       ├── content/      # Content APIs
│   │   │   │       ├── analytics/    # Analytics APIs
│   │   │   │       └── social/       # Social connection APIs
│   │   │   ├── components/           # React components
│   │   │   │   ├── dashboard/        # Dashboard components
│   │   │   │   ├── brand/            # Brand Brain components
│   │   │   │   ├── content/          # Content components
│   │   │   │   └── layout/           # Layout components
│   │   │   └── lib/
│   │   │       ├── services/         # Core service modules
│   │   │       │   ├── brand-brain/
│   │   │       │   ├── context-engine/
│   │   │       │   ├── content-factory/
│   │   │       │   ├── social-publishing/
│   │   │       │   ├── publishing-engine/
│   │   │       │   ├── analytics/
│   │   │       │   └── ad-platform/
│   │   │       └── sync-user.ts      # User sync utilities
│   │   └── ...
│   └── voice-service/                # Python voice backend
├── packages/
│   ├── database/                     # Prisma schema & client
│   ├── shared/                       # Shared types & utils
│   └── ui/                           # Shared UI components
├── .do/                              # DigitalOcean App Platform config
└── docs/                             # Documentation
```

---

## Database Models (Key Tables)

| Model | Purpose |
|-------|---------|
| `User` | Clerk-synced user |
| `Organization` | Multi-tenant org |
| `Brand` | Brand entity per org |
| `BrandBrain` | AI brain settings |
| `BrandAudience` | Target personas |
| `ContentPillar` | Content themes |
| `BrandCompetitor` | Competitors to track |
| `BrandLearning` | AI-generated insights |
| `ContextSource` | External data sources |
| `ContextItem` | Processed content items |
| `SocialAccount` | Connected platforms |
| `ContentItem` | Generated content |
| `ContentVariation` | Platform-specific versions |
| `PublishingSchedule` | Posting schedules |
| `PostAnalytics` | Per-post metrics |
| `Lead` | CRM leads |
| `AdCampaign` | Paid ad campaigns |

---

## Authentication

Using **Clerk** for authentication:

```tsx
// Server Component
import { auth } from "@clerk/nextjs/server";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  // ...
}
```

```tsx
// API Route
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

---

## Coding Standards

### TypeScript
- Use strict TypeScript - no `any` types
- Define interfaces/types for all data structures
- Use Zod for runtime validation

### React/Next.js
- Use Server Components by default
- Mark client components with `"use client"`
- Use `@/` alias for imports from `src/`

### API Routes
```tsx
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await prisma.brand.findMany();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### Error Handling
- Wrap database calls in try-catch
- Return graceful error responses
- Log errors for debugging
- Prevent redirect loops (check before redirecting)

---

## Commands

```bash
# Development
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all apps

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Specific apps
pnpm --filter web dev
pnpm --filter @epic-ai/database generate
```

---

## Environment Variables

Key variables:
- `DATABASE_URL` - PostgreSQL connection
- `CLERK_SECRET_KEY` - Clerk auth
- `OPENAI_API_KEY` - AI features
- `TWITTER_CLIENT_ID/SECRET` - Twitter OAuth
- `LINKEDIN_CLIENT_ID/SECRET` - LinkedIn OAuth
- `META_APP_ID/SECRET` - Meta OAuth

---

## DO's and DON'Ts

### DO:
- Use TypeScript strictly
- Handle errors gracefully
- Follow existing patterns
- Use environment variables for secrets
- Test redirect logic to prevent loops
- Wrap async operations in try-catch

### DON'T:
- Use `any` type
- Hardcode secrets
- Skip error handling
- Leave console.logs in production
- Create redirect loops between pages
- Call the same function multiple times unnecessarily

---

## Key Architectural Decisions

1. **Flywheel Architecture** - Self-improving system
2. **Native OAuth** - Direct platform integrations (not Postiz)
3. **Brand Brain as Hub** - All content flows through brand voice
4. **Platform Variations** - One idea, optimized per platform
5. **Encrypted Credentials** - AES-256-GCM for tokens
6. **Cron Scheduling** - Reliable automated publishing
7. **AI Learning Loop** - System improves over time

---

## Contact

- **GitHub:** github.com/epicdm/epic-ai
- **Production:** https://leads.epic.dm
- **Social (Postiz):** https://social.leads.epic.dm
