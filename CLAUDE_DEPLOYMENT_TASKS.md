# Epic AI - Deployment Verification Tasks for Claude Code

## Current Situation
- Deployment `c636294d` is DEPLOYING (6/10 components) with DO Redis
- Currently still using old Upstash Redis (showing quota errors in logs)
- Need to wait for new deployment to complete and verify

---

## Task 1: Monitor Deployment Completion

**Check deployment status every 60 seconds until ACTIVE:**
```bash
doctl apps list-deployments efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --format ID,Phase,Progress | head -3
```

**Expected**: Phase changes from `DEPLOYING` to `ACTIVE`

**If shows ERROR**: Check build logs with:
```bash
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type build --deployment c636294d-6443-4b67-bfbf-f6eb05dfd460
```

---

## Task 2: Verify DO Redis Connection

**Once deployment is ACTIVE, check runtime logs:**
```bash
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type run --tail 50
```

**Look for**:
- ✅ **Success**: No "max requests limit exceeded" errors
- ✅ **Success**: Logs show connection to `db-valkey-nyc1-14146`
- ❌ **Failure**: Still shows "upstash.io" or quota errors

---

## Task 3: Verify epic-ai-production

**Check production app deployment:**
```bash
doctl apps list-deployments a7d1f082-d6ca-4e9b-92ed-33f2cff1a77e --format ID,Phase,Progress | head -3
```

**Should show**: `ACTIVE 9/9`

**Check logs:**
```bash
doctl apps logs a7d1f082-d6ca-4e9b-92ed-33f2cff1a77e --type run --tail 30
```

---

## Task 4: Test Frontend

**Verify frontend is accessible:**
```bash
curl -I https://leads.epic.dm
```

**Expected**: HTTP 200 OK

---

## Report Back

**Once complete, report:**

1. **Deployment Status**: 
   - epic-ai-platform: ACTIVE or ERROR?
   - epic-ai-production: ACTIVE or ERROR?

2. **Redis Status**:
   - Still seeing Upstash errors? YES/NO
   - Logs show DO Redis connection? YES/NO

3. **Frontend Status**:
   - https://leads.epic.dm returns 200? YES/NO

4. **Any Errors**: Copy paste any error messages

---

## If Deployment Fails

**Get detailed error:**
```bash
doctl apps logs efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --type build --deployment c636294d-6443-4b67-bfbf-f6eb05dfd460 | grep -i error | tail -20
```

**Check if rollback occurred:**
```bash
doctl apps list-deployments efa0a57f-ff1a-4c3c-8eac-7fab441ea098 --format ID,Phase,Progress,Cause | head -5
```

Report the error details.

---

## Expected Timeline
- **Deployment**: 3-5 more minutes
- **Verification**: 1-2 minutes
- **Total**: ~5-7 minutes

**Start monitoring now and report back when done.**
