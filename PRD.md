# Epic AI 2.0 - Product Requirements Document (PRD)

## Executive Summary

**Epic AI** is a self-improving AI-powered marketing platform built on a **flywheel architecture**. The platform helps businesses automate their social media marketing by learning their brand voice, generating platform-optimized content, publishing across channels, and continuously improving based on performance analytics.

**Core Value Proposition:** The more you use Epic AI, the better it gets. Each component feeds into the next, creating a virtuous cycle of improvement.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Modules](#3-core-modules)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [User Journeys](#6-user-journeys)
7. [Technical Stack](#7-technical-stack)
8. [Feature Specifications](#8-feature-specifications)
9. [Security & Compliance](#9-security--compliance)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. Product Vision

### 1.1 Problem Statement

Small and medium businesses struggle with:
- **Time constraints**: Creating consistent social media content is time-consuming
- **Brand consistency**: Maintaining voice/tone across platforms is difficult
- **Platform expertise**: Each social platform has different best practices
- **Performance tracking**: Understanding what content works requires analytics expertise
- **Resource limitations**: Hiring social media teams is expensive

### 1.2 Solution

Epic AI provides an end-to-end AI marketing platform that:
1. **Learns your brand** through website analysis, documents, and social profiles
2. **Generates content** using AI trained on your brand voice
3. **Optimizes for each platform** with character limits, hashtags, and best practices
4. **Publishes automatically** on schedule across all connected accounts
5. **Learns from performance** to continuously improve content quality

### 1.3 The Flywheel Model

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     ┌─────────────┐                      ┌─────────────┐       │
│     │ BRAND BRAIN │ ◄──────────────────── │   LEARNING  │       │
│     │  (Understand)│                      │    LOOP     │       │
│     └──────┬──────┘                      └──────▲──────┘       │
│            │                                     │              │
│            ▼                                     │              │
│     ┌─────────────┐                      ┌──────┴──────┐       │
│     │   CONTENT   │                      │  ANALYTICS  │       │
│     │   FACTORY   │                      │   (Learn)   │       │
│     │   (Create)  │                      └──────▲──────┘       │
│     └──────┬──────┘                             │              │
│            │                                    │              │
│            ▼                                    │              │
│     ┌─────────────┐     ┌─────────────┐        │              │
│     │  PUBLISHING │ ──► │   SOCIAL    │ ───────┘              │
│     │   ENGINE    │     │  PLATFORMS  │                       │
│     │ (Distribute)│     │             │                       │
│     └─────────────┘     └─────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### 2.1 Monorepo Structure

```
epic-ai/
├── apps/
│   ├── web/                    # Next.js 15 frontend & API
│   │   ├── src/
│   │   │   ├── app/            # App Router pages & API routes
│   │   │   ├── components/     # React components (100+)
│   │   │   ├── lib/
│   │   │   │   └── services/   # Core business logic modules
│   │   │   └── hooks/          # Custom React hooks
│   │   └── ...
│   ├── voice-service/          # Python Flask voice AI backend
│   └── workers/                # Background job processors
│
├── packages/
│   ├── database/               # Prisma ORM & schema
│   ├── shared/                 # Shared types & utilities
│   └── ui/                     # Shared UI components
│
└── docs/                       # Documentation
```

### 2.2 Multi-Service Architecture

| Service | Technology | Purpose |
|---------|------------|---------|
| **Web App** | Next.js 15 | Frontend UI & API routes |
| **Voice Service** | Python Flask | Voice AI agent backend |
| **Workers** | Node.js | Background job processing |
| **Database** | PostgreSQL | Primary data store |
| **Cache/Queue** | Redis (Upstash) | Job queues & caching |
| **Storage** | Cloudflare R2 | Media file storage |

---

## 3. Core Modules

### 3.1 Brand Brain (PKG-020)

**Purpose:** Central intelligence hub storing everything about a brand.

**Location:** `apps/web/src/lib/services/brand-brain/`

**Components:**
- `BrandAnalyzer` - Analyzes websites, documents, social profiles
- `BrandBrainService` - Retrieves brand context for content generation
- `ContentPrompt` - Generates AI prompts with brand voice

**Data Stored:**
```typescript
interface BrandBrain {
  // Identity
  companyName: string;
  industry: string;
  mission: string;
  coreValues: string[];

  // Voice Settings
  tone: 'PROFESSIONAL' | 'FRIENDLY' | 'WITTY' | 'INSPIRING' | 'AUTHORITATIVE';
  formality: 1-5; // 1=casual, 5=very formal
  emojiUsage: 'NONE' | 'MINIMAL' | 'MODERATE' | 'HEAVY';
  hashtagStyle: 'NONE' | 'MINIMAL' | 'MODERATE' | 'HEAVY';

  // Guardrails
  wordsToAvoid: string[];
  topicsToAvoid: string[];

  // AI-Generated
  generatedSummary: string;
  suggestedHashtags: string[];
  writingStyleGuide: string;
}
```

**Key Features:**
- Website scraping for brand understanding
- Document upload (PDFs, Word docs)
- Social profile import
- AI-powered brand voice analysis
- Competitor tracking
- Content pillar management

### 3.2 Context Engine (PKG-021)

**Purpose:** Feed external information to keep AI content relevant.

**Location:** `apps/web/src/lib/services/context-engine/`

**Components:**
- `ContextManager` - Manages all context sources
- `WebsiteScraper` - Scrapes websites for content
- `RSSProcessor` - Processes RSS feeds
- `DocumentProcessor` - Extracts text from documents
- `AIProcessor` - Generates summaries and keywords

**Data Sources:**
| Type | Description | Auto-Refresh |
|------|-------------|--------------|
| Website | Company website pages | Weekly |
| RSS | Blog/news feeds | Hourly |
| Document | PDFs, Word, text files | Manual |
| Manual | User-entered notes | Manual |

**Schema:**
```typescript
interface ContextSource {
  type: 'WEBSITE' | 'RSS_FEED' | 'DOCUMENT' | 'MANUAL';
  url?: string;
  refreshInterval?: number;
  lastRefreshedAt?: Date;
  isActive: boolean;
}

interface ContextItem {
  sourceId: string;
  title: string;
  content: string;
  summary: string;      // AI-generated
  keywords: string[];   // AI-extracted
  importance: 1-10;
  isEvergreen: boolean;
  expiresAt?: Date;
}
```

### 3.3 Content Factory (PKG-023)

**Purpose:** AI-powered content generation using brand voice.

**Location:** `apps/web/src/lib/services/content-factory/`

**Components:**
- `ContentGenerator` - Main AI content generation
- `ContentScheduler` - Queue management
- `ContentQueueManager` - Approval workflow

**Generation Flow:**
```
User Request
    │
    ▼
┌─────────────────┐
│  Brand Brain    │──► Brand Voice Prompt
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Context Engine  │──► Relevant Context
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   GPT-4o API    │──► Generated Content
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Platform Adapt  │──► Platform Variations
└─────────────────┘
    │
    ▼
Content Queue (Review/Approve)
```

**Platform Limits:**
```typescript
const PLATFORM_LIMITS = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
  THREADS: 500,
  BLUESKY: 300,
};
```

**Content Types:**
- `POST` - Standard social media post
- `THREAD` - Multi-part thread
- `STORY` - Ephemeral content
- `REEL` - Short-form video
- `ARTICLE` - Long-form content
- `POLL` - Interactive poll
- `CAROUSEL` - Multi-image post

### 3.4 Social Publishing (PKG-022)

**Purpose:** Direct OAuth integration with social platforms.

**Location:** `apps/web/src/lib/services/social-publishing/`

**Supported Platforms:**
| Platform | Auth Method | Features |
|----------|-------------|----------|
| Twitter/X | OAuth 2.0 + PKCE | Posts, Threads, Polls |
| LinkedIn | OAuth 2.0 | Posts, Articles, Polls |
| Facebook | OAuth 2.0 | Pages, Posts, Stories |
| Instagram | Graph API | Posts, Stories, Reels |
| TikTok | OAuth 2.0 | Videos (coming soon) |
| Threads | Graph API | Posts |
| Bluesky | AT Protocol | Posts |

**OAuth Flow:**
```
1. User clicks "Connect [Platform]"
2. Generate secure state token → store in OAuthState table
3. Redirect to platform auth URL
4. User authorizes app
5. Platform redirects back with code
6. Exchange code for tokens
7. Store encrypted tokens in SocialAccount
8. Fetch profile info and save
```

**Token Security:**
- AES-256-GCM encryption for access tokens
- Refresh tokens rotated automatically
- Token expiry tracking and auto-refresh

### 3.5 Publishing Engine (PKG-024)

**Purpose:** Automated content scheduling and publishing.

**Location:** `apps/web/src/lib/services/publishing-engine/`

**Components:**
- `ContentScheduler` - Processes scheduled posts
- `processAllScheduledContent` - Cron job handler

**Scheduling Features:**
- Manual date/time scheduling
- Auto-scheduling with optimal times
- Recurring schedules (daily/weekly)
- Rate limiting per platform
- Retry logic (max 3 attempts)

**Cron Jobs:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| `publish-scheduled` | Every minute | Publish due content |
| `sync-analytics` | Every hour | Fetch platform metrics |
| `scrape-context` | Daily | Refresh context sources |
| `generate-content` | Weekly | Auto-generate content |

### 3.6 Analytics & Learning (PKG-025)

**Purpose:** Track performance and improve AI over time.

**Location:** `apps/web/src/lib/services/analytics/`

**Components:**
- `MetricsCollector` - Fetches platform metrics
- `AnalyticsAggregator` - Aggregates data
- `LearningGenerator` - Creates AI insights
- `FeedbackLoop` - Updates Brand Brain

**Metrics Tracked:**
```typescript
interface PostAnalytics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  videoViews?: number;
  videoWatchTime?: number;
}
```

**Learning Loop:**
1. Collect metrics from all posts
2. Analyze patterns (best times, hashtags, topics)
3. Generate insights using AI
4. Store learnings in `BrandLearning` table
5. Apply learnings to future content generation

### 3.7 Voice AI Module

**Purpose:** AI-powered voice agents for phone calls.

**Location:**
- `apps/web/src/app/api/voice/` - API routes
- `apps/voice-service/` - Python backend

**Components:**
- Voice Agent configuration
- Voice Persona templates
- SIP trunk integration
- Call logging & transcription
- Lead qualification

**Voice Agent Features:**
- Inbound call handling
- Outbound campaigns
- Custom personas/voices
- Real-time transcription
- Lead capture & CRM sync
- Call recording

---

## 4. Database Schema

### 4.1 Core Entities

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    User     │────►│  Membership  │────►│Organization │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                         ┌──────────────────────┤
                         ▼                      ▼
                  ┌─────────────┐        ┌─────────────┐
                  │    Brand    │        │Subscription │
                  └──────┬──────┘        └─────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ BrandBrain  │ │ContentPillar│ │SocialAccount│
  └─────────────┘ └─────────────┘ └─────────────┘
```

### 4.2 Key Models

**User & Organization:**
```prisma
model User {
  id            String       @id
  email         String       @unique
  firstName     String?
  lastName      String?
  clerkId       String       @unique
  memberships   Membership[]
  flywheelProgress FlywheelProgress?
}

model Organization {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique
  memberships   Membership[]
  brands        Brand[]
  subscription  Subscription?
}

model Membership {
  userId        String
  organizationId String
  role          MemberRole   @default(MEMBER)
}
```

**Brand & Brain:**
```prisma
model Brand {
  id              String          @id @default(cuid())
  organizationId  String
  name            String
  slug            String
  website         String?
  logo            String?

  // Relationships
  brandBrain      BrandBrain?
  contentPillars  ContentPillar[]
  socialAccounts  SocialAccount[]
  contentItems    ContentItem[]
  contextSources  ContextSource[]
  voiceAgents     VoiceAgent[]
}

model BrandBrain {
  id              String    @id @default(cuid())
  brandId         String    @unique

  // Identity
  industry        String?
  mission         String?
  coreValues      String[]

  // Voice Settings
  tone            VoiceTone?
  formality       Int?      @default(3)
  emojiUsage      String?
  hashtagStyle    String?

  // Content Guidelines
  wordsToAvoid    String[]
  topicsToAvoid   String[]

  // AI Generated
  generatedSummary String?
  suggestedHashtags String[]
}
```

**Content System:**
```prisma
model ContentItem {
  id              String            @id @default(cuid())
  brandId         String
  contentType     ContentType
  category        String?
  originalContent String

  // Status
  status          ContentStatus     @default(DRAFT)

  // Scheduling
  scheduledFor    DateTime?
  publishedAt     DateTime?

  // Relationships
  variations      ContentVariation[]
  analytics       ContentAnalytics?
  publishResults  PublishResult[]
}

model ContentVariation {
  id              String         @id @default(cuid())
  contentItemId   String
  platform        SocialPlatform
  content         String
  hashtags        String[]
  characterCount  Int
}
```

**Social Accounts:**
```prisma
model SocialAccount {
  id              String         @id @default(cuid())
  brandId         String
  platform        SocialPlatform
  platformUserId  String
  platformUsername String?
  displayName     String?
  avatarUrl       String?

  // Auth (encrypted)
  accessToken     String
  refreshToken    String?
  tokenExpires    DateTime?

  status          AccountStatus  @default(CONNECTED)
}

enum SocialPlatform {
  TWITTER
  LINKEDIN
  FACEBOOK
  INSTAGRAM
  TIKTOK
  YOUTUBE
  THREADS
  BLUESKY
}
```

**Flywheel Progress:**
```prisma
model FlywheelProgress {
  id              String      @id @default(cuid())
  userId          String      @unique
  brandId         String?

  // Phase Status
  understandPhase PhaseStatus @default(NOT_STARTED)
  understandStep  Int         @default(-1)
  createPhase     PhaseStatus @default(NOT_STARTED)
  createStep      Int         @default(-1)
  distributePhase PhaseStatus @default(NOT_STARTED)
  distributeStep  Int         @default(-1)
  learnPhase      PhaseStatus @default(NOT_STARTED)
  learnStep       Int         @default(-1)
  automatePhase   PhaseStatus @default(NOT_STARTED)
  automateStep    Int         @default(-1)

  // Overall
  overallProgress Int         @default(0)
  flywheelActive  Boolean     @default(false)
  setupPath       SetupPath?
}

enum PhaseStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum SetupPath {
  AI_EXPRESS
  GUIDED
  EXPERT
}
```

### 4.3 Full Schema Statistics

- **50+ Models** covering all platform features
- **15+ Enums** for type safety
- **Comprehensive indexes** for query performance
- **Soft deletes** on critical models
- **Audit timestamps** on all models

---

## 5. API Reference

### 5.1 API Route Categories

| Category | Path | Routes |
|----------|------|--------|
| Auth | `/api/webhooks/clerk` | Clerk webhook |
| Onboarding | `/api/onboarding/*` | 5 routes |
| Flywheel | `/api/flywheel/*` | 6 routes |
| Brand Brain | `/api/brand-brain/*` | 10 routes |
| Content | `/api/content/*` | 12 routes |
| Social | `/api/social/*` | 15 routes |
| Analytics | `/api/analytics/*` | 5 routes |
| Publishing | `/api/publishing/*` | 4 routes |
| Voice | `/api/voice/*` | 18 routes |
| Leads | `/api/leads/*` | 5 routes |
| Ads | `/api/ads/*` | 8 routes |
| Context | `/api/context/*` | 5 routes |
| Cron | `/api/cron/*` | 5 routes |

### 5.2 Key API Endpoints

**Brand Brain:**
```
GET    /api/brand-brain              # Get brand brain config
POST   /api/brand-brain              # Update brand brain
GET    /api/brand-brain/current      # Get current brand's brain
POST   /api/brand-brain/generate-summary # AI generate summary
GET    /api/brand-brain/pillars      # List content pillars
POST   /api/brand-brain/pillars      # Create pillar
GET    /api/brand-brain/audience     # List target audiences
POST   /api/brand-brain/audience     # Create audience
POST   /api/brand-brain/apply-template # Apply industry template
```

**Content Factory:**
```
POST   /api/content/generate         # Generate content
POST   /api/content/generate/batch   # Batch generate
GET    /api/content/queue            # Content queue
POST   /api/content/queue            # Add to queue
PATCH  /api/content/queue/[id]       # Update queue item
POST   /api/content/approval         # Approve/reject content
GET    /api/content/calendar         # Content calendar
GET    /api/content/published        # Published history
```

**Social Publishing:**
```
GET    /api/social/accounts          # List connected accounts
DELETE /api/social/accounts/[id]     # Disconnect account
GET    /api/social/setup             # Check setup status
POST   /api/social/generate          # Generate post
POST   /api/social/posts             # Create post
GET    /api/social/posts             # List posts
GET    /api/social/integrations      # Available integrations
GET    /api/social/suggestions       # AI suggestions
```

**Flywheel:**
```
GET    /api/flywheel/progress        # Overall progress
POST   /api/flywheel/progress        # Save progress
PATCH  /api/flywheel/[phase]         # Update phase
POST   /api/flywheel/[phase]/complete # Complete phase
GET    /api/flywheel/phases          # List all phases
```

---

## 6. User Journeys

### 6.1 New User Onboarding

**5-Phase Flywheel Setup:**

```
Phase 1: UNDERSTAND (Brand Brain Setup)
├── Welcome & Introduction
├── Connect Facebook/Social OR Enter Website
├── AI analyzes brand from source
├── Review extracted brand info
├── Set voice & tone preferences
├── Add content pillars
├── Add target audiences
└── Review & Confirm

Phase 2: CREATE (Content Factory Setup)
├── Choose content templates
├── Set hashtag preferences
├── Configure media settings
├── Select content types
├── Generate first content
└── Review & Edit

Phase 3: DISTRIBUTE (Social Connections)
├── Connect social accounts
│   ├── Twitter/X
│   ├── LinkedIn
│   ├── Facebook Pages
│   └── Instagram
├── Configure per-platform settings
└── Test connection

Phase 4: LEARN (Analytics Setup)
├── Analytics introduction
├── Set performance goals
├── Choose key metrics
├── Configure reporting
└── Review dashboard

Phase 5: AUTOMATE (Autopilot Setup)
├── Autopilot introduction
├── Set posting frequency
├── Choose content mix
├── Configure approval mode
├── Set notifications
└── Activate flywheel
```

### 6.2 Content Creation Flow

```
1. User clicks "Create Content"
2. Select content type (Post, Thread, Story, etc.)
3. Choose topic/category OR let AI suggest
4. AI generates content using:
   - Brand Brain voice settings
   - Context Engine relevant info
   - Platform-specific optimization
5. Review generated content
6. Edit if needed
7. Choose action:
   - Publish Now → Goes live immediately
   - Schedule → Pick date/time
   - Add to Queue → Approval workflow
   - Save Draft → Edit later
```

### 6.3 Analytics & Learning Flow

```
1. Posts are published
2. Cron job fetches metrics (hourly)
3. Data aggregated daily
4. Weekly AI analysis:
   - Best performing content types
   - Optimal posting times
   - High-engagement hashtags
   - Topic performance
5. Insights stored in BrandLearning
6. Future content incorporates learnings
```

---

## 7. Technical Stack

### 7.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 | App framework |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| HeroUI | Latest | Component library |
| Zustand | 5.x | State management |
| React Query | 5.x | Data fetching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### 7.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 15 | REST API |
| Prisma | 5.x | ORM |
| PostgreSQL | 16 | Database |
| Redis (Upstash) | - | Queues & cache |
| BullMQ | 5.7.0 | Job queue |
| OpenAI | 4.x | AI API |

### 7.3 Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Vercel | Next.js hosting |
| Database | DigitalOcean | Managed PostgreSQL |
| Workers | DigitalOcean | Background jobs |
| Voice | Render | Voice AI service |
| Storage | Cloudflare R2 | Media storage |
| Auth | Clerk | Authentication |

### 7.4 AI Models

| Model | Provider | Usage |
|-------|----------|-------|
| GPT-4o | OpenAI | Content generation |
| GPT-4o-mini | OpenAI | Quick tasks |
| DALL-E 3 | OpenAI | Image generation |
| Whisper | OpenAI | Voice transcription |

---

## 8. Feature Specifications

### 8.1 Brand Brain Features

| Feature | Status | Description |
|---------|--------|-------------|
| Website Analysis | ✅ | Scrape and analyze company website |
| Document Upload | ✅ | PDF, Word, text file processing |
| Social Import | ✅ | Import from Facebook page |
| Voice Settings | ✅ | Tone, formality, emoji preferences |
| Content Pillars | ✅ | Define content themes |
| Audience Personas | ✅ | Target audience profiles |
| Competitor Tracking | ✅ | Monitor competitor content |
| AI Summary | ✅ | Auto-generate brand summary |
| Industry Templates | ✅ | Pre-built industry profiles |

### 8.2 Content Factory Features

| Feature | Status | Description |
|---------|--------|-------------|
| Single Post | ✅ | Generate one post |
| Batch Generation | ✅ | Generate multiple posts |
| Platform Adaptation | ✅ | Auto-optimize per platform |
| Hashtag Suggestions | ✅ | AI-powered hashtags |
| Image Generation | ✅ | DALL-E 3 integration |
| Content Queue | ✅ | Approval workflow |
| Templates | ✅ | Reusable content templates |
| A/B Variations | 🔄 | Multiple versions for testing |

### 8.3 Publishing Features

| Feature | Status | Description |
|---------|--------|-------------|
| Manual Publish | ✅ | Publish immediately |
| Scheduled Publish | ✅ | Pick date/time |
| Auto-Schedule | ✅ | Optimal time selection |
| Multi-Platform | ✅ | Post to multiple accounts |
| Rate Limiting | ✅ | Prevent API throttling |
| Retry Logic | ✅ | Auto-retry failed posts |
| Publishing Logs | ✅ | Track all activity |

### 8.4 Analytics Features

| Feature | Status | Description |
|---------|--------|-------------|
| Post Metrics | ✅ | Per-post performance |
| Platform Breakdown | ✅ | Metrics by platform |
| Engagement Tracking | ✅ | Likes, comments, shares |
| AI Insights | 🔄 | Pattern analysis |
| Learning Loop | 🔄 | Auto-improve content |
| Export Reports | 📋 | CSV/PDF export |

### 8.5 Voice AI Features

| Feature | Status | Description |
|---------|--------|-------------|
| Voice Agents | ✅ | Create AI agents |
| Voice Personas | ✅ | Custom personalities |
| SIP Integration | ✅ | Phone system connect |
| Call Logging | ✅ | Record all calls |
| Transcription | ✅ | Speech-to-text |
| Lead Capture | ✅ | Save caller info |
| Outbound Campaigns | ✅ | Automated calling |

**Legend:** ✅ Complete | 🔄 In Progress | 📋 Planned

---

## 9. Security & Compliance

### 9.1 Authentication

- **Provider:** Clerk
- **Methods:** Email, Google, GitHub OAuth
- **Session:** JWT tokens
- **MFA:** Optional 2FA support

### 9.2 Data Security

| Data Type | Protection |
|-----------|------------|
| OAuth Tokens | AES-256-GCM encryption |
| Passwords | Not stored (Clerk-managed) |
| API Keys | Environment variables |
| PII | Encrypted at rest |
| Media | Signed URLs, private buckets |

### 9.3 API Security

- Rate limiting per user/IP
- Request validation with Zod
- CORS configuration
- Webhook signature verification
- SQL injection prevention (Prisma)

### 9.4 Compliance Considerations

- GDPR data deletion support
- User data export capability
- Audit logging
- Data retention policies
- Cookie consent

---

## 10. Deployment Architecture

### 10.1 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                              │
│                      (DNS & CDN)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│        VERCEL           │    │     DIGITALOCEAN        │
│   (Next.js Frontend)    │    │    (App Platform)       │
│                         │    │                         │
│  • leads.epic.dm        │    │  • Workers              │
│  • API Routes           │    │  • n8n Workflows        │
│  • Edge Functions       │    │  • Background Jobs      │
└────────────┬────────────┘    └────────────┬────────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│  DIGITALOCEAN           │  │      UPSTASH            │
│  Managed PostgreSQL     │  │   (Redis Queue)         │
│                         │  │                         │
│  • Primary Database     │  │  • Job Queues           │
│  • Read Replicas        │  │  • Session Cache        │
│  • Auto Backups         │  │  • Rate Limiting        │
└─────────────────────────┘  └─────────────────────────┘
```

### 10.2 Environment Configuration

| Environment | Domain | Database | Purpose |
|-------------|--------|----------|---------|
| Production | leads.epic.dm | DO PostgreSQL | Live users |
| Staging | staging.leads.epic.dm | DO PostgreSQL | Testing |
| Development | localhost:3000 | Local PostgreSQL | Development |

### 10.3 CI/CD Pipeline

```
GitHub Push
    │
    ▼
┌─────────────────┐
│  GitHub Actions │
│  • Lint         │
│  • Type Check   │
│  • Unit Tests   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│ Vercel │  │   DO   │
│ Deploy │  │ Deploy │
└────────┘  └────────┘
```

---

## Appendix

### A. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI
OPENAI_API_KEY=sk-...

# Social OAuth
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
META_APP_ID=...
META_APP_SECRET=...

# Storage
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=...

# Queue
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Encryption
ENCRYPTION_KEY=... (32 bytes, base64)
```

### B. Development Commands

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio

# Build & Deploy
pnpm build          # Build all apps
pnpm lint           # Lint all apps
```

### C. Contact

- **Production URL:** https://leads.epic.dm
- **GitHub:** github.com/epicdm/epic-ai

---

*Document Version: 2.0*
*Last Updated: January 2026*
*Generated by: Comprehensive Codebase Analysis*
