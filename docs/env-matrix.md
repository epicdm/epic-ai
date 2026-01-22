# Environment Matrix

This file documents the current dev/staging/prod environment assumptions for `@epic-ai/web`.
It is based on repo env files and DO/Vercel topology. Values are sanitized; fill secrets in Vercel/DO.

## Summary
- **Core API**: Next.js `/api/*` routes in `apps/web` (deployed on Vercel).
- **Voice stack**: DO App `epic-ai-platform` (exposes `/voice`) + LiveKit.
- **DB/Redis**: DO Postgres + DO Valkey.

## Environment matrix (web app)

### Development (local)
- **Frontend + API**: `pnpm --filter @epic-ai/web dev --hostname 0.0.0.0 --port 3000`
- **DB**: Local Postgres (`DATABASE_URL` from `.env.local`)
- **Redis**: Local Redis (`REDIS_URL` from `.env.local`)
- **Auth**: Clerk test keys
- **Voice**: DO voice base via `MAGNUS_BASE_URL` + LiveKit keys
- **App URL**: `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### Staging (Vercel)
- **Frontend + API**: Vercel staging deployment (repo `epicdm/epic-ai`, branch `staging`)
- **DB**: DO Postgres `epic_ai_staging`
  - From `.env.staging`: `postgresql://.../epic_ai_staging?sslmode=require`
- **Redis**: DO Valkey (if enabled)
- **Auth**: Clerk test keys
- **Voice**: `MAGNUS_BASE_URL=https://voice00.epic.dm`, LiveKit cloud URL
- **App URL**: Vercel staging URL (set in Vercel env)

### Production (Vercel)
- **Frontend + API**: Vercel production deployment
- **DB**: DO Postgres `epic_ai`
  - From `apps/web/.env.vercel.prod`: `postgresql://.../epic_ai?sslmode=require&pgbouncer=true`
- **Redis**: DO Valkey
- **Auth**: Clerk live keys
- **Voice**: `MAGNUS_BASE_URL=https://voice00.epic.dm`, LiveKit cloud URL
- **App URL**: Production domain (set in Vercel env)

## Critical env keys by service

### Web (Vercel)
- `DATABASE_URL`
- `REDIS_URL` (if used)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `VOICE_SERVICE_URL`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_SIP_DOMAIN`
- `MAGNUS_BASE_URL`, `MAGNUS_API_KEY`, `MAGNUS_SECRET_KEY`

### Voice (DO: epic-ai-platform)
- `DATABASE_URL`
- `REDIS_URL`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `MAGNUS_PUBLIC_URL`, `MAGNUS_SIP_SERVER`

## Notes
- The web app calls external vendor APIs directly (Meta/Google Ads) from server routes.
- There is no external “core API” base URL; web API is internal to Next.js.
- Staging uses Clerk test keys; production must use Clerk live keys.
