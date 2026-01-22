# Env Setup Checklist (dev/staging/prod)

Use this checklist to keep local dev, Vercel staging, and Vercel production in sync.

## 1) Local dev
- [ ] Copy base envs: `.env.example` → `.env.local`
- [ ] Set `NEXT_PUBLIC_APP_URL` to your dev URL (e.g., `http://localhost:3000`)
- [ ] Set `DATABASE_URL` to local Postgres
- [ ] Set `REDIS_URL` to local Redis (or disable feature flags if optional)
- [ ] Set Clerk **test** keys
- [ ] Set voice envs: `MAGNUS_BASE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_SIP_DOMAIN`
- [ ] Run `pnpm -w install`
- [ ] Run `pnpm --filter @epic-ai/web dev --hostname 0.0.0.0 --port 3000`

## 2) Staging (Vercel)
- [ ] Ensure deployment branch is `staging`
- [ ] Verify staging DB points to `epic_ai_staging`
- [ ] Verify Clerk **test** keys
- [ ] Verify voice envs (Magnus + LiveKit) are set
- [ ] Confirm any third-party API keys needed by server routes are set
- [ ] Run smoke tests: login → dashboard → voice module

## 3) Production (Vercel)
- [ ] Ensure deployment branch is `main`
- [ ] Verify production DB points to `epic_ai`
- [ ] Verify Clerk **live** keys
- [ ] Verify voice envs (Magnus + LiveKit) are set
- [ ] Confirm API keys for third-party integrations are set
- [ ] Run smoke tests: landing → sign in → dashboard → core modules

## 4) Optional validation (CLI)
- [ ] `vercel env ls` (check all required keys)
- [ ] `vercel env pull` (verify local mapping if needed)
- [ ] Re-check `docs/env-matrix.md` for drift
