# Specification: Epic AI Repository Analysis and Local Development Setup

## Overview

Analyze the epic-ai monorepo to produce an internal architecture map and validate local Windows development setup. This investigation task will document all apps and packages with their purposes, identify production-critical vs experimental components, map required environment variables and services, and verify the complete installation and startup workflow. The deliverable is a concise summary and readiness checklist for developers.

## Workflow Type

**Type**: investigation

**Rationale**: This is primarily a discovery and documentation task. No code changes are expected beyond minimal fixes required to achieve local development parity. The focus is on understanding the existing system, validating setup procedures, and producing documentation.

## Task Scope

### Services Involved
- **web** (primary) - Next.js 15 frontend application, main user interface
- **workers** (supporting) - Background job processing with BullMQ
- **voice-service** (optional) - Python Flask backend for voice AI features
- **database** (infrastructure) - Prisma schema and PostgreSQL management
- **shared** (library) - Shared utilities and Zod validation schemas
- **ui** (library) - Shared React component library

### This Task Will:
- [x] Map all apps and packages with their purposes
- [x] Document production-critical vs experimental components
- [x] Identify required environment variables and external services
- [x] Validate `pnpm install` workflow on Windows
- [x] Verify docker-compose services start correctly
- [x] Identify correct dev/start commands for each app
- [x] Produce summary and readiness checklist

### Out of Scope:
- Refactoring existing code architecture
- Adding new features or enhancements
- Optimizing build or runtime performance
- Changing dependency versions
- Modifying database schema

## Service Context

### Web Application (apps/web)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js 15 with React 19
- UI Library: HeroUI + Tailwind CSS
- Authentication: Clerk
- State Management: Zustand
- Forms: React Hook Form + Zod
- Key directories: `src/app/`, `src/components/`, `src/lib/`

**Entry Point:** `src/app/layout.tsx`

**How to Run:**
```bash
pnpm --filter @epic-ai/web dev
# Or via turbo from root:
pnpm dev
```

**Port:** 3000

**Status:** Production-critical

---

### Workers (apps/workers)

**Tech Stack:**
- Language: TypeScript
- Runtime: Node.js with tsx
- Queue: BullMQ
- Scheduler: node-cron
- Key directories: `src/queues/`, `src/lib/`

**Entry Point:** `src/index.ts`

**How to Run:**
```bash
pnpm --filter @epic-ai/workers dev
```

**Port:** N/A (background process)

**Status:** Production-critical

---

### Voice Service (apps/voice-service)

**Tech Stack:**
- Language: Python
- Framework: Flask
- Voice: LiveKit, OpenAI, Deepgram
- Telephony: Magnus Billing
- Key directories: `src/`, `agents/`

**Entry Point:** Dockerfile / Flask app

**How to Run:**
```bash
docker-compose up voice-service
```

**Port:** 5000

**Status:** Optional/Experimental (disabled by default via feature flag)

---

### Database Package (packages/database)

**Tech Stack:**
- Language: TypeScript
- ORM: Prisma 6.x
- Database: PostgreSQL 16
- Key directories: `prisma/`, `src/`

**Entry Point:** `src/index.ts`

**How to Run:**
```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Open Prisma Studio
pnpm db:studio
```

**Status:** Production-critical

---

### Shared Package (packages/shared)

**Tech Stack:**
- Language: TypeScript
- Validation: Zod
- Build: tsup

**Entry Point:** `src/index.ts`

**Status:** Production-critical (dependency of web and workers)

---

### UI Package (packages/ui)

**Tech Stack:**
- Language: TypeScript
- Framework: React 19
- Build: tsup

**Entry Point:** `src/index.ts`

**Status:** Production-critical (dependency of web)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| N/A | N/A | This is an investigation task - no modifications expected |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `package.json` | Root monorepo configuration, scripts, workspaces |
| `turbo.json` | Build pipeline configuration, task dependencies |
| `docker-compose.yml` | Local service orchestration pattern |
| `.env.example` | Environment variable documentation |
| `apps/web/.env.example` | Web-specific environment configuration |
| `apps/voice-service/.env.example` | Voice service configuration |
| `README.md` | Existing documentation structure |

## Patterns to Follow

### Monorepo Package References

From `apps/web/package.json`:

```json
{
  "dependencies": {
    "@epic-ai/database": "workspace:*",
    "@epic-ai/shared": "workspace:*",
    "@epic-ai/ui": "workspace:*"
  }
}
```

**Key Points:**
- Packages use `workspace:*` protocol for internal dependencies
- Build order: database -> shared -> ui -> web (enforced by turbo.json)

### Environment Variable Pattern

From `.env.example`:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/epic_ai?schema=public"

# Required for authentication
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
```

**Key Points:**
- Local development uses docker-compose PostgreSQL
- Clerk authentication requires API keys (can use demo keys for testing)
- Feature flags control optional features like Voice AI

## Requirements

### Functional Requirements

1. **Repository Map Documentation**
   - Description: Create comprehensive map of all apps/packages with purposes
   - Acceptance: All 6 services documented with tech stack, entry points, and roles

2. **Local Installation Validation**
   - Description: Verify `pnpm install` completes successfully on Windows
   - Acceptance: No errors during installation, all dependencies resolved

3. **Docker Services Validation**
   - Description: Verify docker-compose services start correctly
   - Acceptance: PostgreSQL and Redis containers healthy, ports accessible

4. **Development Server Validation**
   - Description: Verify `pnpm dev` starts the web application
   - Acceptance: Web app accessible at http://localhost:3000

5. **Database Schema Validation**
   - Description: Verify Prisma schema can be pushed to local database
   - Acceptance: `pnpm db:push` completes without errors

6. **Readiness Checklist**
   - Description: Produce actionable checklist for developers
   - Acceptance: Step-by-step guide that new developers can follow

### Edge Cases

1. **Missing Docker** - Document fallback for developers without Docker (cloud database options)
2. **Port Conflicts** - Document how to change default ports if 3000, 5432, or 6379 are in use
3. **Windows Path Issues** - Identify any path-related issues specific to Windows
4. **Missing Environment Variables** - Document which vars are truly required vs optional

## Implementation Notes

### DO
- Run actual `pnpm install` and document any warnings or errors
- Start docker-compose services and verify health checks pass
- Run `pnpm dev` and verify the web app loads in browser
- Document the minimum required environment variables for local dev
- Note any Windows-specific considerations discovered

### DON'T
- Modify the codebase beyond critical blocking fixes
- Add new dependencies or upgrade existing ones
- Change the project structure or architecture
- Create new features or enhance existing ones

## Development Environment

### Start Services

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
copy .env.example .env.local

# 3. Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# 4. Wait for services to be healthy
docker-compose ps

# 5. Push database schema
pnpm db:push

# 6. Start development server
pnpm dev
```

### Service URLs
- Web Application: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Voice Service (optional): http://localhost:5000
- Prisma Studio: http://localhost:5555 (via `pnpm db:studio`)

### Required Environment Variables

**Minimum for local development:**
| Variable | Purpose | Default Value |
|----------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://epic:epicpassword@localhost:5432/epic_ai` |
| `CLERK_SECRET_KEY` | Auth (backend) | Required from Clerk dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth (frontend) | Required from Clerk dashboard |
| `NEXT_PUBLIC_APP_URL` | App base URL | `http://localhost:3000` |

**Optional for full features:**
| Variable | Purpose | Feature |
|----------|---------|---------|
| `OPENAI_API_KEY` | AI content generation | Content features |
| `STRIPE_SECRET_KEY` | Payment processing | Billing |
| `LIVEKIT_*` | Voice AI | Voice features |
| `TWITTER_*`, `LINKEDIN_*`, etc. | Social integrations | Social posting |

## Success Criteria

The task is complete when:

1. [x] All apps and packages documented with purposes and tech stacks
2. [x] Production-critical vs experimental components identified
3. [x] Required environment variables documented with defaults
4. [ ] `pnpm install` verified working on Windows (needs validation)
5. [ ] `docker-compose up -d` starts healthy containers (needs validation)
6. [ ] `pnpm db:push` successfully pushes schema (needs validation)
7. [ ] `pnpm dev` starts web app at localhost:3000 (needs validation)
8. [ ] Readiness checklist produced
9. [ ] No console errors during validation steps
10. [ ] Summary document created

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| N/A | N/A | This is an investigation task - no unit tests required |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Database connectivity | web <-> postgres | Prisma can connect to PostgreSQL |
| Redis connectivity | workers <-> redis | BullMQ can connect to Redis |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Installation | 1. Clone repo 2. Run `pnpm install` | No errors, all deps installed |
| Docker Services | 1. Run `docker-compose up -d` 2. Check health | Both containers healthy |
| Database Setup | 1. Run `pnpm db:push` | Schema pushed successfully |
| Dev Server | 1. Run `pnpm dev` 2. Open browser | App loads at localhost:3000 |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Sign In Page | `http://localhost:3000/sign-in` | Page renders (may show Clerk error without keys) |
| Dashboard | `http://localhost:3000/dashboard` | Redirects to sign-in if not authenticated |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Schema exists | `pnpm db:studio` | Prisma Studio opens, shows tables |
| Tables created | `docker exec epic-ai-postgres psql -U epic -d epic_ai -c "\dt"` | Lists all Prisma-defined tables |

### QA Sign-off Requirements
- [ ] All installation steps documented and verified
- [ ] Docker services start without errors
- [ ] Database schema pushes successfully
- [ ] Development server starts and responds
- [ ] Minimum required environment variables documented
- [ ] Readiness checklist is actionable and complete
- [ ] No blocking issues for local development on Windows
- [ ] Summary document is concise and accurate

---

## Appendix: Architecture Summary

### Component Classification

| Component | Type | Status | Required for Local Dev |
|-----------|------|--------|------------------------|
| apps/web | Application | Production-critical | Yes |
| apps/workers | Application | Production-critical | Optional (for background jobs) |
| apps/voice-service | Application | Experimental | No (feature-flagged off by default) |
| packages/database | Library | Production-critical | Yes |
| packages/shared | Library | Production-critical | Yes (built automatically) |
| packages/ui | Library | Production-critical | Yes (built automatically) |
| PostgreSQL | Infrastructure | Production-critical | Yes |
| Redis | Infrastructure | Production-critical | Yes (for workers/queues) |

### Dependency Graph

```
apps/web
  ├── @epic-ai/database
  ├── @epic-ai/shared
  └── @epic-ai/ui
        └── react

apps/workers
  ├── @epic-ai/database
  └── @epic-ai/shared

apps/voice-service (standalone Python)
```

### Port Allocation

| Service | Port | Configurable |
|---------|------|--------------|
| Web (Next.js) | 3000 | Yes (next dev -p PORT) |
| PostgreSQL | 5432 | Yes (docker-compose.yml) |
| Redis | 6379 | Yes (docker-compose.yml) |
| Voice Service | 5000 | Yes (docker-compose.yml) |
| Prisma Studio | 5555 | Default |
