# Epic AI Workers - Deployment Fix Handoff

## Current Status
**App ID**: `efa0a57f-ff1a-4c3c-8eac-7fab441ea098`  
**Deployment**: `3efc4050-0273-4ee9-bdc4-2d05e9560f76` (DEPLOYING - 5/9 components)  
**Console**: https://cloud.digitalocean.com/apps/efa0a57f-ff1a-4c3c-8eac-7fab441ea098

## Problem Summary

### ✅ What Works
- **Build Phase**: Successfully compiles
  - pnpm workspace dependencies install correctly
  - Prisma client generates
  - Workers build (ESM & CJS) in 70-80ms
  - All secrets configured (DATABASE_URL, REDIS_URL, OPENAI_API_KEY)

### ❌ What Fails
- **Runtime Phase**: Workers crash on startup
- **Previous deployments rolled back automatically**
- **Root Cause**: Node.js module resolution failure

## Technical Analysis

### Build Configuration (CORRECT)
```yaml
build_command: |
  corepack enable
  corepack prepare pnpm@9.0.0 --activate
  pnpm install --frozen-lockfile      # Installs to /workspace/node_modules
  cd apps/workers
  pnpm build                           # Compiles to apps/workers/dist/
```

**Result**: `node_modules/` exists at `/workspace/node_modules/`

### Runtime Configuration (FIXED - NEEDS VERIFICATION)
```yaml
# CURRENT (just deployed):
run_command: node apps/workers/dist/index.js

# PREVIOUS (caused rollback):
run_command: cd apps/workers && node dist/index.js
```

**Why Previous Failed**:
1. Changes to `/workspace/apps/workers/` directory
2. Node.js can't resolve `@epic-ai/database` from nested path
3. Worker crashes immediately
4. DigitalOcean auto-rollback to previous deployment

**Why Current Should Work**:
1. Stays in `/workspace/` (monorepo root)
2. Node.js finds dependencies at `/workspace/node_modules/`
3. Executes compiled code at `apps/workers/dist/index.js`

## Current Deployment Status

**Deployment `3efc4050-0273-4ee9-bdc4-2d05e9560f76`**:
- Phase: DEPLOYING (5/9 components)
- Build: COMPLETE ✅
- Deploy: IN PROGRESS ⏳

**Expected Timeline**: 2-5 minutes total

## Tasks for Claude Code

### 1. Monitor Deployment Completion
```bash
# Wait for deployment to finish
doctl apps list-deployments efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --format ID,Phase,Progress | head -3

# Expected: ACTIVE 5/5 or 9/9
```

### 2. Check for Rollback
If deployment shows `ERROR` or gets `SUPERSEDED`:
- Deployment rolled back again
- Runtime issue still exists
- Need deeper investigation (see Section 3)

### 3. If Deployment Succeeds (ACTIVE)

#### A. Verify Workers Are Running
```bash
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run --tail 50
```

**Look For**:
- ✅ "Epic AI Background Worker starting..."
- ✅ "Connected to Redis"
- ✅ "Registered queue: content-generation"
- ✅ "Health server listening on port 3001"

**Red Flags**:
- ❌ "Cannot find module '@epic-ai/database'"
- ❌ "ENOENT" errors
- ❌ "Connection refused"

#### B. Test Health Endpoint
```bash
# Get worker URL from deployment
doctl apps get efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --format DefaultIngress

# If workers don't have public ingress, health check is internal only
# Check logs for health check success
```

#### C. Verify Redis Connection
```bash
# Check logs for Redis connection
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run | grep -i redis

# Expected: "Connected to Redis" or similar
```

### 4. If Still Failing - Additional Fixes Needed

#### Issue A: Module Resolution Still Broken
**Symptoms**: "Cannot find module" errors in logs

**Fix Option 1** - Add NODE_PATH:
```yaml
envs:
  - key: NODE_PATH
    scope: RUN_TIME
    value: /workspace/node_modules
```

**Fix Option 2** - Use absolute path in run command:
```yaml
run_command: cd /workspace && node apps/workers/dist/index.js
```

#### Issue B: Prisma Client Not Found
**Symptoms**: "Cannot find module '@prisma/client'"

**Fix**: Add Prisma generation to build:
```yaml
build_command: |
  corepack enable
  corepack prepare pnpm@9.0.0 --activate
  pnpm install --frozen-lockfile
  cd packages/database
  pnpm exec prisma generate
  cd ../../apps/workers
  pnpm build
```

#### Issue C: Wrong Node Module Type
**Symptoms**: "ERR_REQUIRE_ESM" or "Cannot use import outside a module"

**Fix**: Check `apps/workers/package.json` has:
```json
{
  "type": "module"  // If using ESM
}
```

Or ensure build outputs CJS if no type field.

## Expected Outcomes

### Success Criteria ✅
1. **Deployment Phase**: ACTIVE (not ERROR or SUPERSEDED)
2. **Worker Logs**: Show startup messages without errors
3. **Redis**: Connection established
4. **Queues**: BullMQ queues registered (8 queues total)
5. **Health**: Port 3001 listening (check logs)
6. **No Rollback**: Deployment stays active for >5 minutes

### Success Indicators in Logs
```
Epic AI Background Worker starting...
Environment: production
Database: Connected
Redis: Connected to rediss://safe-ant-14340.upstash.io:6379
Registering processors...
✓ content-generator
✓ context-scraper
✓ rss-syncer
✓ analytics-collector
✓ token-refresher
✓ document-processor
✓ content-publisher
✓ image-generator
Health server listening on port 3001
Worker ready to process jobs
```

### Failure Indicators
```
Error: Cannot find module '@epic-ai/database'
ENOENT: no such file or directory
Connection refused (Redis)
Module not found errors
Process exit code 1
```

## Files Modified (Already Committed)

1. **`apps/workers/package.json`**:
   - Added `"packageManager": "pnpm@9.0.0"`
   - Removed `--dts` from build script
   - Commits: `d89c4c1`, `f80b58d`

2. **DigitalOcean App Spec** (via `doctl apps update`):
   - Removed `source_dir` directive
   - Build from monorepo root
   - Fixed `run_command` paths

## Configuration Summary

### Environment Variables (Configured ✅)
```bash
DATABASE_URL=postgresql://doadmin:****@db-postgresql-nyc1-47698-do-user-9581931-0.f.db.ondigitalocean.com:25060/epic_ai?sslmode=require

REDIS_URL=rediss://default:****@safe-ant-14340.upstash.io:6379

OPENAI_API_KEY=sk-proj-****

NODE_ENV=production
HEALTH_PORT=3001
```

### Deployed Components
- **content-worker**: Background job processor (always running)
- **content-scheduler**: Pre-deploy job (runs once per deployment)

## Next Steps for Claude Code

1. **Wait 2-3 minutes** for current deployment to complete
2. **Check deployment status** (Task 1)
3. **If ACTIVE**: Verify workers (Task 3)
4. **If ERROR**: Apply additional fixes (Task 4)
5. **Report results**: Share worker logs and health status

## Quick Verification Commands

```bash
# 1. Check deployment
doctl apps list-deployments efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --format ID,Phase,Progress | head -3

# 2. Get runtime logs (if ACTIVE)
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run --tail 100

# 3. Check for errors
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run | grep -i error | tail -20

# 4. Verify Redis connection
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run | grep -i redis

# 5. Check health endpoint logs
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run | grep -i health
```

## Rollback Plan

If all fixes fail:
1. Delete current app: `doctl apps delete efa0a57f-ff1a-4c3c-8eac-7fab441ea098`
2. Create new app from scratch with simpler config
3. Test workers locally first before deploying

---

**Status as of Handoff**: Deployment `3efc4050-0273-4ee9-bdc4-2d05e9560f76` is DEPLOYING (5/9). Expecting completion in 2-3 minutes. The fix applied should resolve the node_modules resolution issue.
