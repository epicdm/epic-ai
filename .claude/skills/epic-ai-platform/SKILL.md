---
name: epic-ai-platform
description: Development workflows and architecture patterns for Epic AI, a self-improving AI marketing platform. Use when working on Epic AI codebase features including Brand Brain, Content Factory, Publishing Engine, Analytics, social media integration, database operations, or any Epic AI-specific development tasks.
---

# Epic AI Platform

## Overview

Epic AI is a self-improving AI marketing platform built around a flywheel architecture where each component feeds into the next. This skill provides guidance for working with the platform's core modules, database patterns, API structure, and development workflows.

## Core Architecture: The Flywheel

```
Brand Brain → Content Factory → Publishing Engine → Analytics → Learning Loop
     ↑                                                              │
     └──────────────────── AI Improvements ─────────────────────────┘
```

The flywheel consists of 7 core modules:

1. **Brand Brain (PKG-020)** - Central intelligence storing brand voice, audiences, content pillars
2. **Context Engine (PKG-021)** - External data feeds (websites, RSS, documents)
3. **Native Social Connectors (PKG-022)** - Direct OAuth integrations (Twitter, LinkedIn, Meta)
4. **Content Factory (PKG-023)** - AI-powered content generation with brand voice
5. **Publishing Engine (PKG-024)** - Scheduling and automated publishing
6. **Analytics & Learning Loop (PKG-025)** - Metrics collection and AI insights
7. **Unified Dashboard (PKG-026)** - Command center interface

## Project Structure

```
apps/
├── web/                          # Next.js frontend (Vercel)
│   ├── src/app/(dashboard)/      # Dashboard routes
│   ├── src/app/api/              # API routes
│   ├── src/components/           # React components
│   └── src/lib/services/         # Core service modules
└── voice-service/                # Python voice backend (DigitalOcean)

packages/
├── database/                     # Prisma schema & client
├── shared/                       # Shared types & utils
└── ui/                           # Shared UI components
```

## Common Development Workflows

### 1. Creating a New Feature

1. **Plan the integration** - Determine which flywheel module(s) are involved
2. **Update database schema** - Add Prisma models if needed (`packages/database/prisma/schema.prisma`)
3. **Create API routes** - Add endpoints in `apps/web/src/app/api/`
4. **Build UI components** - Create React components in `apps/web/src/components/`
5. **Add service layer** - Implement business logic in `apps/web/src/lib/services/`
6. **Update dashboard** - Integrate into unified dashboard if applicable

### 2. Adding a New API Route

```typescript
// apps/web/src/app/api/[module]/[endpoint]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await prisma.model.findMany({
      where: { userId }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### 3. Database Operations

Always use Prisma for database operations:

```bash
# Generate Prisma client after schema changes
pnpm --filter @epic-ai/database generate

# Push schema changes to database
pnpm --filter @epic-ai/database push

# Create and run migrations
pnpm --filter @epic-ai/database migrate dev
```

### 4. Social Media Integration

OAuth flows follow this pattern:
- **Initiate**: `apps/web/src/app/api/social/connect/[platform]/route.ts`
- **Callback**: `apps/web/src/app/api/social/connect/[platform]/callback/route.ts`
- **Publishing**: `apps/web/src/lib/services/social-publishing/`

See `references/social-integration.md` for detailed OAuth patterns.

### 5. Working with Brand Brain

The Brand Brain is the central hub for all brand intelligence:

```typescript
// Retrieve brand brain
const brandBrain = await prisma.brandBrain.findUnique({
  where: { brandId },
  include: {
    audiences: true,
    contentPillars: true,
    competitors: true,
    learnings: true
  }
});

// Use in content generation
const content = await generateContent({
  brandVoice: brandBrain.voiceTone,
  formality: brandBrain.formalityLevel,
  audiences: brandBrain.audiences
});
```

## Development Standards

### TypeScript Guidelines
- Use strict TypeScript - no `any` types
- Define interfaces/types for all data structures
- Use Zod for runtime validation

### React/Next.js Patterns
- Use Server Components by default
- Mark client components with `"use client"`
- Use `@/` alias for imports from `src/`
- Handle errors gracefully with try-catch
- Prevent redirect loops

### Error Handling Pattern
```typescript
try {
  // Database operation
  const result = await prisma.model.operation();
  return NextResponse.json(result);
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json(
    { error: "Operation failed" },
    { status: 500 }
  );
}
```

## Key Files to Reference

- **Project instructions**: `/opt/epic-ai/CLAUDE.md`
- **Database schema**: `packages/database/prisma/schema.prisma`
- **Environment setup**: `.env` files (never commit these!)

## Resources

### references/
- **flywheel-modules.md** - Detailed guide for each flywheel module
- **database-patterns.md** - Common Prisma patterns and schema conventions
- **api-patterns.md** - API route patterns and error handling
- **social-integration.md** - OAuth flows and social media publishing

### scripts/
- **generate-migration.sh** - Helper for creating Prisma migrations
- **test-api.sh** - Quick API endpoint testing

Any unneeded resources can be deleted as the skill evolves.
