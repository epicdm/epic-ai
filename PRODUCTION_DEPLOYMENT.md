# Epic AI - Production Deployment Plan

## Current Blocker
**Redis Quota Exceeded** - Must upgrade Upstash before proceeding

## Once Redis Fixed - Execute These Steps:

### Step 1: Merge Staging to Main
```bash
cd /opt/epic-ai
git checkout main
git pull origin main
git merge staging --no-ff -m "chore: merge staging to main for production release"
git push origin main
```

**Changes in staging (29 commits)**:
- Bird's Eye AI Setup wizard
- 5-phase flywheel wizard system
- Social OAuth improvements (Twitter, LinkedIn, Meta)
- Dashboard UX improvements
- Database fixes and optimizations

### Step 2: Verify Database Migrations
```bash
# Check if migrations needed
cd /opt/epic-ai/packages/database
pnpm exec prisma migrate status --schema=./prisma/schema.prisma

# Apply if needed
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
```

### Step 3: Deploy to Vercel (Frontend)
```bash
# Vercel auto-deploys from main branch
# Monitor at: https://vercel.com/dashboard

# Or manual trigger:
cd /opt/epic-ai/apps/web
vercel --prod
```

### Step 4: Deploy to DigitalOcean (Workers)
```bash
# Workers auto-deploy from main branch (already configured)
# Monitor deployment:
doctl apps list-deployments efa0a57f-ff1a-4c3c-8eac-7fab441ea098

# Verify workers start successfully:
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run --tail 50
```

### Step 5: Smoke Test Production
```bash
# 1. Frontend loads
curl -I https://leads.epic.dm

# 2. Auth works (visit in browser)
open https://leads.epic.dm/sign-in

# 3. Dashboard accessible after login
open https://leads.epic.dm/dashboard

# 4. Workers processing jobs
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run | grep "Processing job"
```

## Production Apps
- **Frontend**: https://leads.epic.dm (Vercel)
- **Backend**: epic-ai-platform (DigitalOcean App efa0a57f)
- **Workers**: epic-ai-platform (DigitalOcean App efa0a57f)
- **Database**: db-postgresql-nyc1-47698 (DigitalOcean)

## Environment Variables (Verify)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Upstash connection (after upgrade)
- `OPENAI_API_KEY`: Configured
- `CLERK_SECRET_KEY`: Auth provider
- `NODE_ENV=production`

## Rollback Plan
If production fails:
```bash
# Revert main to previous state
git revert HEAD -m "rollback: revert production deployment"
git push origin main
```

---

**Status**: Waiting for Redis upgrade to proceed with deployment
