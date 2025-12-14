# Project Memory

## Key Decisions Log

### 2024-12-06: Project Initialization
- Using Turborepo + pnpm for monorepo
- Next.js 15 with App Router
- PostgreSQL on Render (not Railway)
- HeroUI for components
- Domain: leads.epic.dm
- GitHub: epicdm/epic-ai

### 2024-12: Consolidation & Architecture Updates
- Social module uses native OAuth 2.0 (Twitter, LinkedIn, Meta)
- Voice module ported from ai.epic.dm
- Telephony via Magnus Billing (replacing FreeSWITCH/FusionPBX)
- Voice AI via LiveKit Cloud
- Unified persona system for voice + social
- Lead hub aggregates all sources
- n8n for automation workflows (DigitalOcean)

## Architecture Decisions
- Native OAuth for social platforms (no third-party wrappers)
  - Twitter/X: OAuth 2.0 with PKCE
  - LinkedIn: OAuth 2.0
  - Meta (Facebook/Instagram): OAuth 2.0 via Graph API
- Token encryption: AES-256-GCM
- Magnus Billing for telephony (DID management, SIP trunks)
- LiveKit for real-time voice AI

## Resolved Decisions
- [x] Social integration: Native OAuth 2.0 (direct platform APIs)
- [x] Phone provider: Magnus Billing
- [x] File storage: Cloudflare R2 (S3-compatible)

## Blockers
- None currently

## Links
- HeroUI: https://heroui.com
- LiveKit: https://livekit.io
- Magnus Billing: https://www.magnusbilling.org/
- Twitter Developer: https://developer.twitter.com/
- LinkedIn Developer: https://developer.linkedin.com/
- Meta Developer: https://developers.facebook.com/
