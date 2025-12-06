# Project Memory

## Key Decisions Log

### 2024-12-06: Project Initialization
- Using Turborepo + pnpm for monorepo
- Next.js 15 with App Router
- PostgreSQL on Render (not Railway)
- HeroUI for components
- Domain: leads.epic.dm
- GitHub: epicdm/epic-ai

### Architecture Decisions
- Social module will wrap Postiz (open-source)
- Voice module will port from ai.epic.dm
- Unified persona system for voice + social
- Lead hub aggregates all sources
- n8n for automation workflows

## Pending Decisions
- [ ] Exact Postiz integration method (embed vs API)
- [ ] Phone provider (Telnyx vs Twilio)
- [ ] File storage (R2 vs S3)

## Blockers
- None currently

## Links
- Postiz: https://github.com/gitroomhq/postiz-app
- HeroUI: https://heroui.com
- LiveKit: https://livekit.io
