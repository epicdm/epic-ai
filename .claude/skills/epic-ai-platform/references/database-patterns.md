# Database Patterns & Conventions

## Prisma Schema Location
`packages/database/prisma/schema.prisma`

## Common Patterns

### 1. User-Owned Resources

Most resources belong to a user. Always include userId foreign key:

```prisma
model Brand {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [clerkId])

  name        String
  industry    String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

### 2. Organization Multi-Tenancy

For team features, use Organization model:

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique

  members     OrganizationMember[]
  brands      Brand[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [clerkId])
  role           String       @default("member") // admin, member, viewer

  @@unique([organizationId, userId])
  @@index([userId])
}
```

### 3. Encrypted Credentials

Social tokens and sensitive data are encrypted:

```prisma
model SocialAccount {
  id            String   @id @default(cuid())
  brandId       String
  brand         Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)

  platform      String   // TWITTER, LINKEDIN, FACEBOOK, INSTAGRAM
  accountId     String   // Platform's user/page ID
  accountName   String

  // Encrypted fields (AES-256-GCM)
  accessToken   String   @db.Text
  refreshToken  String?  @db.Text
  expiresAt     DateTime?

  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([brandId, platform, accountId])
  @@index([brandId])
}
```

### 4. Content Hierarchy

Content flows through variations to scheduled posts:

```prisma
model ContentItem {
  id          String   @id @default(cuid())
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)

  topic       String
  status      String   @default("DRAFT") // DRAFT, APPROVED, PUBLISHED

  variations  ContentVariation[]
  schedules   PublishingSchedule[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([brandId, status])
}

model ContentVariation {
  id             String      @id @default(cuid())
  contentItemId  String
  contentItem    ContentItem @relation(fields: [contentItemId], references: [id], onDelete: Cascade)

  platform       String      // TWITTER, LINKEDIN, FACEBOOK, INSTAGRAM
  content        String      @db.Text
  metadata       Json?       // Platform-specific data (images, hashtags, etc.)

  createdAt      DateTime    @default(now())

  @@index([contentItemId])
}
```

### 5. Scheduling & Publishing

```prisma
model PublishingSchedule {
  id             String        @id @default(cuid())
  contentItemId  String
  contentItem    ContentItem   @relation(fields: [contentItemId], references: [id], onDelete: Cascade)
  socialAccountId String
  socialAccount  SocialAccount @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)

  platform       String
  scheduledFor   DateTime
  status         String        @default("SCHEDULED") // SCHEDULED, PUBLISHED, FAILED, CANCELLED

  // Publishing metadata
  publishedAt    DateTime?
  platformPostId String?       // ID from social platform
  errorMessage   String?       @db.Text
  retryCount     Int           @default(0)

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([scheduledFor, status])
  @@index([contentItemId])
}
```

### 6. Analytics & Metrics

```prisma
model PostAnalytics {
  id             String   @id @default(cuid())
  scheduleId     String   @unique
  schedule       PublishingSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  platform       String
  platformPostId String

  // Reach metrics
  impressions    Int      @default(0)
  reach          Int      @default(0)

  // Engagement metrics
  likes          Int      @default(0)
  comments       Int      @default(0)
  shares         Int      @default(0)
  saves          Int      @default(0)
  engagementRate Float    @default(0)

  // Link metrics
  linkClicks     Int      @default(0)

  // Timing
  publishedAt    DateTime
  collectedAt    DateTime @default(now())

  @@index([platform, publishedAt])
}
```

### 7. AI Learning Storage

```prisma
model BrandLearning {
  id           String     @id @default(cuid())
  brandBrainId String
  brandBrain   BrandBrain @relation(fields: [brandBrainId], references: [id], onDelete: Cascade)

  insight      String     @db.Text
  category     String     // engagement, timing, content-type, tone, etc.
  confidence   Float      // 0.0 to 1.0
  dataPoints   Int        // Number of posts analyzed

  metadata     Json?      // Additional context

  createdAt    DateTime   @default(now())

  @@index([brandBrainId, category])
  @@index([createdAt])
}
```

## Common Query Patterns

### Fetching with Relations

```typescript
// Get brand with all related data
const brand = await prisma.brand.findUnique({
  where: { id: brandId },
  include: {
    brandBrain: {
      include: {
        audiences: true,
        contentPillars: true,
        learnings: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    },
    socialAccounts: {
      where: { isActive: true }
    },
    contentItems: {
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 20
    }
  }
});
```

### Aggregations

```typescript
// Count posts by platform
const postCounts = await prisma.publishingSchedule.groupBy({
  by: ['platform', 'status'],
  where: {
    scheduledFor: {
      gte: startDate,
      lte: endDate
    }
  },
  _count: true
});

// Average engagement rate
const avgEngagement = await prisma.postAnalytics.aggregate({
  where: {
    brandId,
    publishedAt: {
      gte: startDate
    }
  },
  _avg: {
    engagementRate: true,
    likes: true,
    comments: true
  }
});
```

### Transactions

Use transactions for operations that must succeed or fail together:

```typescript
await prisma.$transaction(async (tx) => {
  // Create content
  const content = await tx.contentItem.create({
    data: { brandId, topic: "AI trends" }
  });

  // Create variations
  await tx.contentVariation.createMany({
    data: [
      { contentItemId: content.id, platform: 'TWITTER', content: twitterPost },
      { contentItemId: content.id, platform: 'LINKEDIN', content: linkedinPost }
    ]
  });

  // Schedule publishing
  await tx.publishingSchedule.create({
    data: {
      contentItemId: content.id,
      socialAccountId,
      platform: 'TWITTER',
      scheduledFor: new Date('2024-01-25T10:00:00Z')
    }
  });
});
```

### Soft Deletes

For important records, use soft deletes instead of hard deletes:

```prisma
model ContentItem {
  // ... other fields
  deletedAt    DateTime?

  @@index([deletedAt])
}
```

```typescript
// Soft delete
await prisma.contentItem.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// Query active only
const activeContent = await prisma.contentItem.findMany({
  where: {
    brandId,
    deletedAt: null
  }
});
```

## Migration Workflow

```bash
# 1. Make schema changes in schema.prisma

# 2. Create migration
pnpm --filter @epic-ai/database migrate dev --name add_video_support

# 3. Generate client
pnpm --filter @epic-ai/database generate

# 4. Deploy to production (after testing)
pnpm --filter @epic-ai/database migrate deploy
```

## Best Practices

1. **Always index foreign keys** - Improves query performance
2. **Use cascading deletes carefully** - Consider soft deletes for audit trails
3. **Encrypt sensitive data** - Access tokens, API keys, personal info
4. **Add created/updated timestamps** - Essential for debugging
5. **Use transactions** - For multi-step operations that must be atomic
6. **Validate data with Zod** - Runtime validation before database operations
7. **Use enums for fixed values** - Status fields, platforms, roles
