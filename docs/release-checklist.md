# Go-Live Release Checklist

**Purpose:** Consolidated gates and validation steps for safe deployment to production.
**Last Updated:** 2025-01-27
**Status:** Ready for production validation

---

## 1. Environments

| Environment | Frontend | Database | Cache | Purpose |
|---|---|---|---|---|
| **Development** | Local (port 3000 or 3002) | PostgreSQL local (5432) | Redis local (6379) | Developer machines, hot reload |
| **Staging** | Vercel (staging branch) | DigitalOcean `epic_ai_staging` | DO Valkey staging | Pre-production validation, Clerk test keys |
| **Production** | Vercel (main branch) | DigitalOcean `epic_ai` | DO Valkey production | Live users, Clerk live keys, SLA-backed |

### Production Architecture
```
┌─────────────────┐
│ Vercel (IAD1)   │  Next.js frontend @ leads.epic.dm
│ - Web app       │  - Serverless functions (30s default, 60s for voice/content)
│ - API routes    │  - 4 cron jobs (content gen, publish, scrape, analytics)
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
    ┌────▼─────┐         ┌─────▼──────┐
    │    DO     │         │    DO      │
    │ PostgreSQL│         │  Valkey    │
    │ epic_ai   │         │  Production│
    └───────────┘         └────────────┘
```

**Critical Path for Go-Live:**
1. Test deployment on staging (staging branch push)
2. Validate all env vars in staging are correct
3. Run smoke tests against staging endpoints
4. Merge to main branch → triggers production deployment
5. Monitor observability dashboards for 30 minutes
6. If issues detected, execute rollback plan

---

## 2. Required Environment Variables (by Service)

### Web Service (Next.js on Vercel)

**Database & Cache:**
- `DATABASE_URL` - PostgreSQL connection string (with pgbouncer for pooling in prod)
- `REDIS_URL` - Valkey connection string

**Authentication:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable (staging: test key, prod: live key)
- `CLERK_SECRET_KEY` - Clerk secret key (staging: test key, prod: live key)
- `CLERK_WEBHOOK_SECRET` - Clerk webhook signing secret

**App URLs:**
- `NEXT_PUBLIC_APP_URL` - Application URL (dev: http://localhost:3000, staging: https://staging.leads.epic.dm, prod: https://leads.epic.dm)

**AI & LLM:**
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o, content generation, analytics

**Voice Service:**
- `LIVEKIT_URL` - LiveKit WebSocket endpoint (wss://...)
- `LIVEKIT_API_KEY` - LiveKit API credentials
- `LIVEKIT_API_SECRET` - LiveKit API credentials
- `LIVEKIT_SIP_DOMAIN` - SIP domain for telephony
- `MAGNUS_API_KEY` - Magnus Billing API key (DID/SIP management)
- `MAGNUS_SECRET_KEY` - Magnus Billing API secret
- `MAGNUS_BASE_URL` - Magnus API endpoint (https://voice.epic.dm or staging equivalent)
- `DEEPGRAM_API_KEY` - Deepgram STT API key

**Social Media OAuth:**
- `META_APP_ID` - Meta (Facebook/Instagram) app ID
- `META_APP_SECRET` - Meta app secret
- `TWITTER_CLIENT_ID` - TODO (if Twitter enabled)
- `TWITTER_CLIENT_SECRET` - TODO (if Twitter enabled)
- `LINKEDIN_CLIENT_ID` - TODO (if LinkedIn enabled)
- `LINKEDIN_CLIENT_SECRET` - TODO (if LinkedIn enabled)

**Security & Encryption:**
- `TOKEN_ENCRYPTION_KEY` - AES-256-GCM key for encrypting OAuth tokens (32-byte hex string)

**Feature Flags:**
- `NEXT_PUBLIC_ENABLE_VOICE_AI` - Enable/disable voice agents UI
- `NEXT_PUBLIC_ENABLE_ADS` - Enable/disable ads platform UI
- `NEXT_PUBLIC_ENABLE_CONTENT` - Enable/disable content factory UI
- `NEXT_PUBLIC_ENABLE_AGENT_OS` - Enable/disable Agent OS features

**Storage (Optional for R2 uploads):**
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - R2 credentials
- `R2_SECRET_ACCESS_KEY` - R2 credentials
- `R2_BUCKET_NAME` - R2 bucket name

**Development Only (Staging/Dev):**
- `E2E_UAT_BYPASS=true` - Bypass Clerk auth in test environments
- `MOCK_SOCIAL_API=false` - Set to true to mock social API calls in dev

### Voice Service (Python Flask on DigitalOcean App Platform)

**Database & Cache:**
- `DATABASE_URL` - Same PostgreSQL connection string as web
- `REDIS_URL` - Same Valkey connection string as web

**Voice Infrastructure:**
- `LIVEKIT_URL` - LiveKit endpoint (must match web service)
- `LIVEKIT_API_KEY` - LiveKit credentials (must match web service)
- `LIVEKIT_API_SECRET` - LiveKit credentials (must match web service)
- `MAGNUS_API_KEY` - Magnus Billing credentials
- `MAGNUS_SECRET_KEY` - Magnus Billing credentials
- `MAGNUS_BASE_URL` - Magnus endpoint

**AI & LLM:**
- `OPENAI_API_KEY` - OpenAI API key (must match web service)

---

## 3. Build & Test Gates

### Build Command (Root)

```bash
pnpm db:generate && pnpm build
```

**Steps:**
1. `pnpm db:generate` - Generate Prisma client (required before build)
2. `pnpm build` - Turbo builds all apps (@epic-ai/database, @epic-ai/web, packages/*)

**Expected Output:**
- ✅ No TypeScript errors
- ✅ No ESLint warnings (must fix before merge)
- ✅ `.next` folder generated in `apps/web/`
- ✅ All output directories populated

### Test Gate (E2E Validation)

```bash
pnpm validate
```

**This runs:** `pnpm lint && pnpm build && pnpm test:e2e`

**Playwright E2E Tests (`apps/web/playwright.config.ts`):**
- Base URL: Depends on `PLAYWRIGHT_BASE_URL` env var (dev: http://localhost:3000, staging: http://localhost:3002 via docker, CI: http://localhost:3002)
- Browser: Chromium (headless)
- Retries: 2 on failure
- Timeout: 30 seconds per test
- Total tests: 166 across chromium and mobile-chrome

**Critical E2E Test Coverage:**
- ✅ Auth flows (Clerk login, sign-up with UAT bypass)
- ✅ Onboarding wizard completion
- ✅ Brand Brain configuration
- ✅ Content Factory generation
- ✅ Social publishing workflows
- ✅ Analytics dashboard loading
- ✅ Voice agent setup (if enabled)
- ✅ Telephony callback flows (if enabled)

### Local Validation Prerequisites & Status

⚠️ **BLOCKED LOCALLY - E2E Tests Currently Failing**

**Current Test Status (Evidence from 34 executed tests):**
- ✅ **API-only tests PASS:** Tests 4, 6, 7, 9 all pass in 300-500ms (fetch endpoints, AI learnings, dashboard data, brand brain)
- ✅ **Simple page renders PASS:** Tests 15-16 pass in 1.7-5.1s (sign-in page, sign-up page)
- ❌ **Interactive/navigation tests FAIL:** Tests 1-3, 5, 8, 10-14, 17-32 timeout at 30-46 seconds

**Root Cause:** Playwright tests timeout on interactive page navigation and element interactions. The issue is NOT infrastructure-related (Next.js server starts successfully in 2.9s, endpoints return 200 status). The blocker is UI element finding/interaction timeouts.

**Blocker Categories:**
1. **Authentication/Session Tests** (Tests 10-14): UAT bypass cookie persistence, dashboard access checks - all timeout at 31.7-31.9s
2. **Flywheel Phase Navigation** (Tests 17-28): Setup hub, phase navigation (UNDERSTAND, CREATE, DISTRIBUTE, LEARN, AUTOMATE) - all timeout at 31.8-46.9s
3. **Dashboard Analytics** (Tests 1-2, 5, 8): Analytics dashboard loading, brand analytics - timeout at 31.7-46.8s
4. **Global Navigation** (Tests 30-32): Main navigation rendering, section navigation, internal links - timeout at 31.8-31.9s

**Required to Fix Locally:**
- Debug Playwright test failures with `--debug` flag: `pnpm --filter @epic-ai/web test:e2e -- --debug`
- Investigate element selectors and wait conditions in `apps/web/e2e/**/*.spec.ts`
- Verify page load states and interactive element availability
- May require backend service dependencies (PostgreSQL, Redis) - see Docker setup below

**Docker Setup (if needed):**
```bash
# Start PostgreSQL and Redis for local testing
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Then retry E2E tests
pnpm validate
```

**Expected Result (Blocker Status):**
- ❌ Local validation BLOCKED: `pnpm validate` currently fails (159+ test failures out of 166)
- ✅ Build still passes: `pnpm db:generate && pnpm build` completes successfully
- ⚠️ CI validation required: Tests must be fixed and validated before production deployment

### Vercel Build Validation

Vercel automatically runs on every git push based on `vercel.json`:

```json
{
  "buildCommand": "pnpm db:generate && pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "apps/web/.next",
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 30 },
    "app/api/voice/agents/*/provision-phone/*.ts": { "maxDuration": 60 },
    "app/api/content/generate/**/*.ts": { "maxDuration": 60 },
    "app/api/webhooks/**/*.ts": { "maxDuration": 30 }
  }
}
```

**Gate Requirement:** Vercel build must complete with status ✅ PASSED before merge to main.

---

## 4. Database Migration Gate

### Pre-Deployment Checklist

1. **Backup Production Database**
   ```bash
   # Manual: Use DigitalOcean Dashboard → Managed Databases → epic_ai → Create backup
   # Automated: Daily backups enabled on DO cluster (TODO: confirm retention policy)
   ```

2. **Test Migration on Staging First**
   ```bash
   # On staging environment
   cd apps/web
   DATABASE_URL=postgresql://epic:pass@epic_ai_staging:5432/epic_ai \
   pnpm --filter @epic-ai/database push --skip-generate
   ```

3. **Review Prisma Schema Changes**
   - Check `packages/database/prisma/schema.prisma` for breaking changes
   - If migrations exist in `packages/database/migrations/`, verify they are backwards-compatible
   - Additive-only schema preferred (new columns with defaults, new tables)

4. **Production Migration**
   ```bash
   # Executed via DigitalOcean App Platform or manual DB connection
   DATABASE_URL=postgresql://epic:pass@epic_ai:5432/epic_ai \
   pnpm --filter @epic-ai/database push --skip-generate
   
   # Or if using migration files:
   pnpm --filter @epic-ai/database migrate deploy
   ```

5. **Verify Schema**
   ```bash
   # Check that all tables exist and data is intact
   # Use Prisma Studio: pnpm db:studio
   # Or query directly: SELECT COUNT(*) FROM "User", "Organization", etc.
   ```

**Gate Requirement:** ✅ Staging migration passes and schema matches expected state before attempting production migration.

---

## 5. Smoke Test Scripts & Endpoints

### Health Check Endpoint

```bash
curl -X GET https://leads.epic.dm/api/health
# Expected: 200 OK, { "status": "ok" }
```

### Critical Smoke Tests

**Test Authentication:**
```bash
curl -X GET https://leads.epic.dm/api/user/features \
  -H "Authorization: Bearer <clerk_token>"
# Expected: 200 OK, feature flags object
```

**Test Dashboard:**
```bash
curl -X GET https://leads.epic.dm/api/dashboard \
  -H "Authorization: Bearer <clerk_token>"
# Expected: 200 OK, dashboard stats object
```

**Test Content Generation (UAT Bypass):**
```bash
curl -X POST https://leads.epic.dm/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"test topic","brandId":"uat_test_brand"}'
# Expected: 202 Accepted or 200 OK, generated content object
```

**Test Social Publishing:**
```bash
curl -X GET https://leads.epic.dm/api/social/accounts \
  -H "Authorization: Bearer <clerk_token>"
# Expected: 200 OK, array of connected social accounts
```

**Test Agent OS (if enabled):**
```bash
curl -X GET https://leads.epic.dm/api/agent-os/agents \
  -H "Authorization: Bearer <clerk_token>"
# Expected: 200 OK, array of agents
```

**Test Voice Service (if enabled):**
```bash
curl -X GET https://leads.epic.dm/api/voice/calls \
  -H "Authorization: Bearer <clerk_token>"
# Expected: 200 OK, array of call records
```

### Automated Smoke Test Script

**Location:** `apps/web/scripts/verify-publish.ts`

```bash
cd apps/web
npx tsx scripts/verify-publish.ts
# Validates publishing endpoints, OAuth flows, and content delivery
```

**Expected:** Script completes with all checks ✅ PASSED

---

## 6. Observability (Logs & Error Tracking)

### Log Aggregation

**Vercel Logs:**
- Dashboard: https://vercel.com/epicdm/epic-ai/monitoring
- Function Logs: Real-time streaming in Vercel Dashboard
- Access: Vercel project → Deployments → [Deployment] → Logs

**DigitalOcean Logs (Voice Service/Workers):**
- Access: DigitalOcean Console → App Platform → epic-ai-voice / epic-ai-workers → Logs
- Real-time monitoring: `doctl apps logs <app-id>`

### Error Tracking (if configured)

**TODO:** Identify and configure error tracking service:
- Option A: Sentry (recommended for Next.js + backend)
- Option B: LogRocket (frontend-only)
- Option C: DigitalOcean built-in monitoring

**Setup Requirement:**
```
- Error tracking service account created
- API key/DSN configured in env vars (SENTRY_DSN, etc.)
- Error sampling configured (recommend 100% in prod first month)
- Alerts configured for critical errors (500s, auth failures)
```

### Key Metrics to Monitor Post-Deployment

1. **API Response Times:** Target <500ms median, <2s p99
2. **Error Rate:** Target <0.1% (1 error per 1000 requests)
3. **Database Connection Pool:** Monitor exhaustion
4. **Redis/Cache Hit Rate:** Monitor cache effectiveness
5. **Cron Job Success Rate:** All 4 scheduled jobs must complete successfully
6. **Voice Service Health:** LiveKit connection stability, SIP trunk status (Magnus)

### Observability Checklist

- ✅ Logs accessible and streaming (Vercel + DO)
- ✅ Error tracking integrated (Sentry or equivalent)
- ✅ Uptime monitoring configured (Uptime Robot or equivalent)
- ✅ Performance metrics visible (Vercel Analytics or equivalent)
- ✅ Alerts configured for critical failures
- ✅ On-call rotation documented (TODO)

---

## 7. Security Basics

### Secrets Management

- ✅ **No secrets in git:** Use `.env.local` for local development, Vercel Secrets for prod
- ✅ **Encryption keys rotated:** TOKEN_ENCRYPTION_KEY used for OAuth tokens must be randomly generated
- ✅ **API keys stored securely:**
  - OpenAI, Deepgram, LiveKit, Magnus, Meta, etc. all stored in Vercel Secrets
  - Never logged or exposed in error messages
  - Use `console.error()` only for generic "API call failed" messages

### Authentication & Authorization

- ✅ **Clerk integration active:** Verify Clerk webhook receiving events (CLERK_WEBHOOK_SECRET configured)
- ✅ **All protected endpoints require auth:** Use `auth()` from `@clerk/nextjs/server`
- ✅ **Organization isolation enforced:** Verify multi-tenant isolation (users can only access their org's data)
- ✅ **UAT bypass disabled in production:** `E2E_UAT_BYPASS` must be **false** or unset in prod

### CORS & CSP (Content Security Policy)

**TODO:** Verify configured in Next.js headers:
- ✅ CORS headers restrict to known domains only
- ✅ CSP headers prevent inline scripts and unsafe-eval
- ✅ X-Frame-Options: DENY (prevent clickjacking)
- ✅ X-Content-Type-Options: nosniff (prevent MIME sniffing)

### OAuth Token Handling

- ✅ **Tokens encrypted at rest:** AES-256-GCM using TOKEN_ENCRYPTION_KEY
- ✅ **Tokens sent over HTTPS only:** All connections use TLS 1.2+
- ✅ **Tokens not logged:** Never output access/refresh tokens in logs

### Database Connection Security

- ✅ **Connection pooling enabled:** pgBouncer recommended for production
- ✅ **SSL mode enforced:** `?sslmode=require` in production DATABASE_URL
- ✅ **Credential rotation:** Change database passwords quarterly

### Pre-Deployment Security Checklist

```bash
# Run security checks
pnpm lint              # ESLint catches security issues (no console.log of secrets, etc.)
pnpm build             # TypeScript strict mode catches type errors

# Manual verification
# - Search codebase for hardcoded secrets (grep -r "sk_", "pk_", passwords)
# - Verify .env files not committed (check .gitignore)
# - Confirm all API keys sourced from environment variables
```

---

## 8. Rollback Plan

### When to Rollback

- ✅ **Error Rate >1%** for >5 consecutive minutes
- ✅ **API Response Time >2s** p99 for >10 minutes
- ✅ **Critical Business Logic Broken** (auth, publishing, voice calls fail)
- ✅ **Database Migration Failed** (schema corruption, data loss)
- ✅ **Security Breach Detected** (unauthorized access, token leak)

### Rollback Steps

**Step 1: Immediate Incident Response (0-5 min)**
```bash
# Notify team in Slack #incidents channel
# Declare incident: "INCIDENT: Production rollback initiated due to [reason]"

# Assess severity:
# - Critical (auth/data loss): Rollback immediately
# - Degradation (slow APIs): Monitor for 5 min, then decide
# - Limited (specific feature): Can wait for hot-fix if non-critical
```

**Step 2: Revert via Vercel (5-10 min)**
```bash
# Option A: Redeploy previous commit
# 1. Go to https://vercel.com/epicdm/epic-ai/deployments
# 2. Find last known-good deployment (before current main commit)
# 3. Click "Promote to Production"
# ⏱ Deployment time: ~2-3 minutes

# Option B: Force revert commit
git revert <bad-commit-hash>
git push origin main  # Triggers new Vercel deployment
# ⏱ Deployment time: ~2-3 minutes
```

**Step 3: Database Rollback (if schema change caused failure)**
```bash
# ⚠️ Database rollback is DESTRUCTIVE - only if data integrity at risk

# Option A: Restore from backup (safest)
# 1. DigitalOcean Dashboard → Managed Databases → epic_ai
# 2. Select backup from before deployment
# 3. Click "Restore"
# ⏱ Restoration time: 10-30 minutes (depends on DB size)
# ⚠️ Warning: You lose 10-30 min of data (users' posts, analytics, etc.)

# Option B: Run migration rollback (if using Prisma migrations)
# NOT RECOMMENDED - requires tested down migrations
# pnpm --filter @epic-ai/database migrate resolve --rolled-back <migration-name>

# Option C: Manual SQL revert (advanced, only if tested)
# Direct SQL via psql to undo schema changes
# NOT RECOMMENDED - high risk of data corruption
```

**Step 4: Verify Rollback Success (5-15 min)**
```bash
# Health check
curl -X GET https://leads.epic.dm/api/health
# Expected: 200 OK

# Auth check
curl -X GET https://leads.epic.dm/api/user/features \
  -H "Authorization: Bearer <test_clerk_token>"
# Expected: 200 OK

# Monitor logs for errors
# Vercel Dashboard → Logs (watch for spike in 500s)

# Monitor observability dashboard
# Check error rate, response times, database connections all normalized
```

**Step 5: Post-Incident Review (30+ min after stabilization)**
```bash
# Create incident retrospective
# Document:
# - What caused the issue?
# - Why wasn't it caught in staging?
# - What changes to testing/deployment prevent recurrence?
# - Update this checklist based on learnings
```

### Rollback Scenarios

| Scenario | Action | Timeline |
|----------|--------|----------|
| **Vercel build fails** | No deployment → no rollback needed | N/A |
| **API returns 500 errors** | Revert main commit → Vercel deploys previous version | 5 min |
| **Middleware/auth broken** | Same as above | 5 min |
| **Slow API responses** | Monitor 5 min, then revert if sustained | 5-10 min |
| **Database schema broken** | Restore from backup (data loss) | 10-30 min |
| **OAuth/3rd-party integration broken** | Revert + check API keys in prod env vars | 5 min |

### Post-Rollback

- ✅ Document incident in wiki/Slack thread
- ✅ Identify root cause (typo, logic error, missing env var, etc.)
- ✅ Fix issue locally and test in staging
- ✅ Re-deploy with fix + monitoring
- ✅ Update this checklist with learnings

---

## Final Gate Checklist Before Main Deploy

- [ ] Code review approved on PR
- [ ] All required env vars configured in Vercel secrets
- [ ] Build passes locally: `pnpm db:generate && pnpm build`
- [ ] Tests pass locally: `pnpm validate`
- [ ] Staging deployment (staging branch) passes all smoke tests
- [ ] Database backup created
- [ ] Observability dashboards set up and accessible
- [ ] On-call engineer assigned and alert-aware
- [ ] Rollback plan reviewed and team trained
- [ ] Vercel build completed with ✅ PASSED status
- [ ] Merge to main branch approved
- [ ] Monitor production for 30 minutes post-deployment
- [ ] Log "Deployment Complete" in Slack #deployments channel

---

## Deployment Checklist Command

Run this before deployment:

```bash
# Local validation
pnpm db:generate && pnpm build && pnpm validate

# Check git status (ensure only intended changes)
git status

# View deployment diff (ensure only code changes, no secrets)
git diff main origin/main

# Create deployment branch and push (if using git-based workflow)
git checkout -b deploy/prod-$(date +%Y%m%d)
git push origin deploy/prod-$(date +%Y%m%d)
```

---

## Emergency Contacts

**TODO:** Document on-call rotation:
- Engineering Lead: [Name] @[slack]
- DevOps Lead: [Name] @[slack]
- CEO: [Name] @[slack]
- PagerDuty escalation: [Link]

---

**Document Version:** 1.0  
**Last Verified:** 2025-01-27  
**Next Review:** Post-first-production-deployment  
