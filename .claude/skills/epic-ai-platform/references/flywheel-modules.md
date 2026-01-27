# Flywheel Modules Deep Dive

## Module 1: Brand Brain (PKG-020)

**Location**: `apps/web/src/lib/services/brand-brain/`

### Core Components

The Brand Brain stores all brand intelligence and voice settings:

```typescript
interface BrandBrain {
  id: string;
  brandId: string;

  // Voice & Tone
  voiceTone: string[];           // e.g., ["professional", "friendly", "witty"]
  formalityLevel: number;         // 1-5 scale
  emojiPreference: boolean;
  hashtagStrategy: string;
  wordsToAvoid: string[];

  // Target Audiences
  audiences: BrandAudience[];     // Personas with demographics

  // Content Strategy
  contentPillars: ContentPillar[]; // Main themes
  competitors: BrandCompetitor[];  // Competitors to track

  // AI Learning
  learnings: BrandLearning[];     // AI-generated insights
}
```

### Key Operations

**Retrieve Brand Brain**:
```typescript
const brandBrain = await prisma.brandBrain.findUnique({
  where: { brandId },
  include: {
    audiences: true,
    contentPillars: true,
    competitors: true,
    learnings: {
      orderBy: { createdAt: 'desc' },
      take: 10
    }
  }
});
```

**Add AI Learning**:
```typescript
await prisma.brandLearning.create({
  data: {
    brandBrainId: brandBrain.id,
    insight: "Posts with emojis get 23% more engagement",
    category: "engagement",
    confidence: 0.87,
    dataPoints: 45
  }
});
```

---

## Module 2: Context Engine (PKG-021)

**Location**: `apps/web/src/lib/services/context-engine/`

### Purpose
Feed external information to keep content relevant and informed.

### Data Sources

1. **Website Scraping**
   ```typescript
   await prisma.contextSource.create({
     data: {
       brandId,
       type: 'WEBSITE',
       url: 'https://company.com/blog',
       updateFrequency: 'DAILY'
     }
   });
   ```

2. **RSS Feeds**
   ```typescript
   await prisma.contextSource.create({
     data: {
       brandId,
       type: 'RSS',
       url: 'https://news.com/feed',
       updateFrequency: 'HOURLY'
     }
   });
   ```

3. **Document Uploads**
   ```typescript
   // PDFs, Word docs, etc.
   await prisma.contextItem.create({
     data: {
       contextSourceId,
       title: doc.title,
       content: extractedText,
       metadata: { fileType: 'PDF', pages: 12 }
     }
   });
   ```

---

## Module 3: Native Social Connectors (PKG-022)

**Location**: `apps/web/src/app/api/social/connect/`

### Supported Platforms

| Platform | OAuth Type | API |
|----------|-----------|-----|
| Twitter/X | OAuth 2.0 with PKCE | Twitter API v2 |
| LinkedIn | OAuth 2.0 | LinkedIn API |
| Facebook | OAuth 2.0 | Facebook Graph API |
| Instagram | OAuth 2.0 | Instagram Graph API |

### Connection Flow

1. **Initiate OAuth** - User clicks "Connect Twitter"
2. **Redirect to Platform** - Platform shows authorization screen
3. **Callback with Code** - Platform redirects back with auth code
4. **Exchange for Tokens** - Backend exchanges code for access/refresh tokens
5. **Store Encrypted** - Tokens stored with AES-256-GCM encryption

See `social-integration.md` for detailed implementation.

---

## Module 4: Content Factory (PKG-023)

**Location**: `apps/web/src/lib/services/content-factory/`

### Content Generation Flow

```
User Topic Input
      ↓
Brand Brain (voice, tone, audiences)
      ↓
Context Engine (recent data)
      ↓
GPT-4o Generation
      ↓
Platform-Specific Variations
```

### Platform Variations

**Twitter** (280 chars):
- Punchy and direct
- Hashtags (1-2)
- Thread-friendly format

**LinkedIn** (professional):
- Thought-leadership tone
- Industry insights
- Professional hashtags

**Facebook** (conversational):
- Friendly and engaging
- Story-driven
- Emoji-friendly

**Instagram** (visual):
- Emoji-heavy
- Visual descriptions
- Multiple hashtags (5-10)

### Implementation

```typescript
async function generateContent(topic: string, brandId: string) {
  const brandBrain = await getBrandBrain(brandId);
  const context = await getRecentContext(brandId);

  const prompt = buildPrompt({
    topic,
    voiceTone: brandBrain.voiceTone,
    formality: brandBrain.formalityLevel,
    audiences: brandBrain.audiences,
    context
  });

  const variations = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: CONTENT_SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ]
  });

  return parseVariations(variations);
}
```

---

## Module 5: Publishing Engine (PKG-024)

**Location**: `apps/web/src/lib/services/publishing-engine/`

### Features

- **Manual Scheduling** - User picks date/time
- **Auto-Scheduling** - AI determines optimal times
- **Cron Job** - Runs every minute checking for posts to publish
- **Rate Limiting** - Respects platform limits
- **Retry Logic** - Max 3 attempts with exponential backoff

### Scheduling Flow

```typescript
await prisma.publishingSchedule.create({
  data: {
    contentItemId,
    platform: 'TWITTER',
    scheduledFor: new Date('2024-01-25T10:00:00Z'),
    status: 'SCHEDULED'
  }
});
```

### Cron Job (runs every minute)

```typescript
async function publishScheduledContent() {
  const due = await prisma.publishingSchedule.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      status: 'SCHEDULED'
    },
    include: { contentItem: true, socialAccount: true }
  });

  for (const schedule of due) {
    try {
      await publishToSocial(schedule);
      await markAsPublished(schedule.id);
    } catch (error) {
      await handlePublishError(schedule, error);
    }
  }
}
```

---

## Module 6: Analytics & Learning Loop (PKG-025)

**Location**: `apps/web/src/lib/services/analytics/`

### Metrics Collected

```typescript
interface PostAnalytics {
  postId: string;
  platform: string;

  // Reach Metrics
  impressions: number;
  reach: number;

  // Engagement Metrics
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;

  // Link Metrics
  linkClicks: number;

  // Timestamps
  publishedAt: Date;
  collectedAt: Date;
}
```

### AI Learning Process

1. **Collect Metrics** - Pull from platform APIs
2. **Analyze Patterns** - AI identifies trends
3. **Generate Insights** - Create actionable learnings
4. **Store in Brand Brain** - Save for future content

```typescript
async function analyzeAndLearn(brandId: string) {
  const recentPosts = await getRecentAnalytics(brandId, 30); // Last 30 days

  const insights = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "system",
      content: "Analyze social media performance and identify patterns..."
    }, {
      role: "user",
      content: JSON.stringify(recentPosts)
    }]
  });

  // Store insights in Brand Brain
  await saveLearnings(brandId, insights);
}
```

---

## Module 7: Unified Dashboard (PKG-026)

**Location**: `apps/web/src/components/dashboard/unified-dashboard.tsx`

### Dashboard Components

1. **Flywheel Health** (0-100%)
   - Measures completeness of each module
   - Shows bottlenecks

2. **Quick Actions**
   - Generate content
   - Schedule posts
   - Connect accounts

3. **Metrics Overview**
   - Organic reach/engagement
   - Paid campaign performance
   - Lead generation

4. **AI Insights**
   - Recent learnings
   - Recommendations

5. **Recent Activity**
   - Latest posts
   - New leads
   - System events

6. **Connected Accounts**
   - Social platform status
   - Token health

### API Endpoint

```typescript
// GET /api/dashboard/unified
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  const [
    flywheelHealth,
    metrics,
    insights,
    activity,
    accounts
  ] = await Promise.all([
    calculateFlywheelHealth(userId),
    getMetrics(userId),
    getAIInsights(userId),
    getRecentActivity(userId),
    getConnectedAccounts(userId)
  ]);

  return NextResponse.json({
    flywheel: flywheelHealth,
    metrics,
    insights,
    activity,
    accounts
  });
}
```
