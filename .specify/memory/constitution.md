<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version change: N/A → 1.0.0 (Initial ratification)

  Modified principles: N/A (Initial version)

  Added sections:
  - Core Principles (7 principles)
  - Technology & Architecture Constraints
  - Development Workflow
  - Governance

  Removed sections: N/A (Initial version)

  Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Updated Constitution Check with principle table
  - .specify/templates/spec-template.md: ✅ Requirements section aligns
  - .specify/templates/tasks-template.md: ✅ Phase structure aligns
  - .specify/templates/checklist-template.md: ✅ No changes required

  Follow-up TODOs: None
  ============================================================================
-->

# Epic AI Constitution

## Core Principles

### I. Flywheel-First Architecture

All features MUST feed into the self-improving flywheel cycle:
Brand Brain → Content Factory → Publishing Engine → Analytics → Learning Loop.

- New features MUST integrate with at least one existing flywheel module
- Data flow MUST be bidirectional: outputs improve inputs over time
- AI learnings MUST be persisted to Brand Brain for continuous improvement
- Isolated features that do not contribute to the flywheel SHOULD be rejected

**Rationale**: The flywheel is the core value proposition—the more users engage,
the smarter the system becomes. Features outside this loop dilute focus.

### II. Type Safety (NON-NEGOTIABLE)

All code MUST use strict TypeScript with no escape hatches.

- The `any` type is FORBIDDEN; use `unknown` with type guards instead
- All data structures MUST have explicit interface/type definitions
- Runtime validation MUST use Zod schemas at system boundaries
- API responses MUST be typed end-to-end (request → handler → response)

**Rationale**: Type safety prevents entire categories of bugs and enables
confident refactoring across a large codebase with multiple contributors.

### III. Graceful Error Handling

All operations MUST fail gracefully with actionable feedback.

- Database calls MUST be wrapped in try-catch blocks
- API routes MUST return structured error responses (never raw exceptions)
- Errors MUST be logged with sufficient context for debugging
- User-facing errors MUST be human-readable without exposing internals
- Redirect logic MUST include loop detection to prevent infinite redirects

**Rationale**: Marketing platforms handle user data and time-sensitive publishing.
Silent failures or cryptic errors damage trust and cause lost content.

### IV. Security by Default

All credentials and sensitive data MUST be protected at rest and in transit.

- OAuth tokens MUST be encrypted with AES-256-GCM before database storage
- Secrets MUST use environment variables (never hardcoded)
- API routes MUST verify authentication via Clerk before processing
- User data MUST be scoped to organizations (multi-tenant isolation)
- OWASP Top 10 vulnerabilities MUST be actively prevented

**Rationale**: The platform stores OAuth tokens for multiple social accounts.
A single credential leak could compromise all connected user accounts.

### V. Modular Service Architecture

Each flywheel module MUST be a self-contained service with clear boundaries.

- Services live in `apps/web/src/lib/services/{module-name}/`
- Services MUST expose functions, not classes, for tree-shaking
- Cross-service dependencies MUST flow through well-defined interfaces
- Database access MUST go through Prisma (no raw SQL except migrations)
- Shared code MUST live in `packages/` (database, shared, ui)

**Rationale**: The 7 core modules (Brand Brain, Context Engine, etc.) must evolve
independently while maintaining clear contracts for integration.

### VI. Server-First Components

React components MUST default to Server Components unless client interactivity
is required.

- Server Components are the DEFAULT; use `"use client"` only when necessary
- Data fetching SHOULD happen in Server Components, not client-side
- Client components MUST be leaf nodes in the component tree when possible
- State management (Zustand) is for client-only interactive state
- Forms MUST use React Hook Form + Zod for consistent validation

**Rationale**: Server Components reduce bundle size, improve SEO, and prevent
data fetching waterfalls. The platform generates public-facing content.

### VII. Observability & Continuous Improvement

All significant operations MUST be observable and contribute to system learning.

- Publishing operations MUST log success/failure with platform details
- Analytics MUST be collected for all posted content (metrics → Brand Brain)
- AI operations MUST log prompt/response patterns for quality improvement
- Performance bottlenecks MUST be identified via structured logging
- Console.logs MUST be removed before production deployment

**Rationale**: The learning loop cannot function without visibility into what
content performs well. Observability enables the flywheel to self-improve.

## Technology & Architecture Constraints

### Approved Stack

| Layer | Technology | Non-Negotiable |
|-------|------------|----------------|
| Frontend Framework | Next.js 15 (App Router) | Yes |
| UI Library | React 19 + TypeScript | Yes |
| Styling | Tailwind CSS + HeroUI | No |
| Authentication | Clerk | Yes |
| Database | PostgreSQL + Prisma ORM | Yes |
| Cache/Queue | Redis (Upstash) | No |
| AI | OpenAI GPT-4o | No |
| Voice | LiveKit + Deepgram | No |
| Monorepo | Turborepo + pnpm | Yes |

### Deployment Targets

- **Web Application**: Vercel (production: leads.epic.dm)
- **Background Workers**: DigitalOcean App Platform
- **Database**: Render managed PostgreSQL
- **Voice Service**: Python Flask on Render

### Forbidden Patterns

- Direct DOM manipulation outside React lifecycle
- Synchronous blocking operations in API routes
- Storing secrets in code or version control
- Bypassing Prisma for direct database access
- Creating redirect loops between authenticated routes

## Development Workflow

### Code Review Requirements

- All PRs MUST pass TypeScript strict mode compilation
- All PRs MUST pass ESLint with zero warnings
- PRs affecting flywheel modules MUST include integration verification
- Security-sensitive changes REQUIRE explicit review of credential handling

### Testing Expectations

- API routes SHOULD have contract tests for request/response shapes
- Service functions SHOULD have unit tests for business logic
- Flywheel integrations SHOULD have end-to-end smoke tests
- Test failures MUST block merge to main/staging branches

### Documentation Standards

- New services MUST be documented in CLAUDE.md under "Core Modules"
- API endpoints MUST have JSDoc comments describing purpose and auth requirements
- Complex business logic MUST have inline comments explaining "why" not "what"

## Governance

### Amendment Process

1. Propose amendment via PR to `.specify/memory/constitution.md`
2. Document rationale and impact on existing code
3. Update version number following semantic versioning:
   - MAJOR: Backward-incompatible changes to core principles
   - MINOR: New principles or sections added
   - PATCH: Clarifications and typo fixes
4. Ensure all dependent templates remain consistent
5. Obtain approval from project maintainers

### Compliance Review

- All PRs SHOULD reference relevant constitution principles
- Violations MUST be documented with justification if unavoidable
- Repeated violations MAY trigger constitution review for practicality

### Versioning Policy

This constitution follows semantic versioning (MAJOR.MINOR.PATCH).
Breaking changes to principles require a major version bump.

**Version**: 1.0.0 | **Ratified**: 2025-12-16 | **Last Amended**: 2025-12-16
