# 🧪 Testing Required - Facebook Quick Setup Fix

## Status
✅ **Code Deployed**: Latest fix pushed to staging branch (commit d0cd27f)
⏳ **Awaiting Testing**: User needs to verify Facebook Quick Setup works

---

## What Was Fixed

The **aggressive raw SQL fallback** has been deployed to handle database schema mismatches:

1. **Always creates organization separately** (no nested membership)
2. **Tries 3 different column name patterns**:
   - Pattern 1: Prisma with @map directive (`userId` → `user_id`)
   - Pattern 2: Raw SQL with camelCase (`userId`, `organizationId`)
   - Pattern 3: Raw SQL with snake_case (`user_id`, `organization_id`)
3. **Cleans up** if all patterns fail
4. **Extensive logging** to identify which pattern works

**File Modified**: `apps/web/src/lib/services/organization.ts` (lines 39-96)

---

## 🧪 How to Test Facebook Quick Setup

### Step 1: Open Staging Environment
Navigate to: https://staging.leads.epic.dm/onboarding

### Step 2: Open Browser Console
- Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
- Click on the "Console" tab

### Step 3: Click "Connect with Facebook"
Look for the button: **"Quick Setup with Facebook - Auto-fill your business name, website & connect your page in one click"**

### Step 4: Check Console Logs

#### ✅ If Successful, You'll See:
```
[Quick FB Connect] Step 1: Creating organization...
[createOrganization] Creating organization: {name: "My Organization", slug: "my-organization", userId: "..."}
[createOrganization] Organization created: <org-id>
[createOrganization] Membership created for userId: <user-id>
  OR
[createOrganization] Membership created via raw SQL (camelCase)
  OR
[createOrganization] Membership created via raw SQL (snake_case)

[Quick FB Connect] Org created: <org-id>
[Quick FB Connect] Step 2: Creating brand...
[Quick FB Connect] Brand created: <brand-id>
[Quick FB Connect] Step 3: Opening Facebook OAuth popup...
[Quick FB Connect] Popup opened successfully
```

Then the Facebook OAuth popup should open and you can authorize.

#### ❌ If Still Failing, You'll See:
```
[Quick FB Connect] Org creation failed: {...error: 'Failed to create organization: ...'}
[createOrganization] All membership creation attempts failed: <error>
```

---

## 📊 Expected Results

### Success Indicators:
1. ✅ No `500 Internal Server Error` on organization creation
2. ✅ Console shows one of the three patterns succeeded
3. ✅ Facebook OAuth popup opens
4. ✅ After authorizing, business name and website auto-fill

### Which Pattern Should Succeed?

**Most Likely**: Pattern 2 or 3 (raw SQL) will succeed, indicating:
- Your production database uses actual column names (`userId`/`user_id`)
- The Prisma @map directive isn't working as expected
- Database schema needs syncing with `npx prisma db push`

**Ideal**: Pattern 1 (Prisma) succeeds, indicating:
- Database schema is correctly synced
- No workarounds needed

---

## 🔧 What to Do After Testing

### If Facebook Quick Setup Works:
1. ✅ **Success!** The workaround is functioning
2. Note which pattern succeeded (check console logs)
3. **Still Recommended**: Sync production database properly:
   ```bash
   # On DigitalOcean App Platform console:
   cd packages/database
   npx prisma db push
   ```
4. After sync, we can remove the workarounds

### If Facebook Quick Setup Still Fails:
1. Copy the full console error logs
2. Report which step failed:
   - Organization creation?
   - Brand creation?
   - OAuth popup?
3. We'll need to investigate database schema directly

---

## 🔍 Additional Debugging

If the error persists, check:

1. **Network Tab**: Look for failed API calls to `/api/onboarding/organization`
2. **Full Error Message**: Copy the complete error from console
3. **Database Schema**: We may need to inspect the actual database structure

---

## 📝 Known Issues

### Issue: Voice Agents Disappeared
**Status**: ✅ Fixed (commit 79d61c3)
- Added fallback logic to query agents across all user organizations
- Should now show all agents even if org context is temporarily unavailable

**Test**: Navigate to `/dashboard/voice` and verify agents appear

### Issue: Database Schema Out of Sync
**Status**: ⚠️ Workaround Deployed (commit d0cd27f)
- Aggressive raw SQL fallback handles column name variations
- **Permanent Fix**: Run `npx prisma db push` on production database

---

## Next Steps

1. **Test Facebook Quick Setup** (follow steps above)
2. **Test Voice Agents Dashboard** at `/dashboard/voice`
3. **Report Results**: Which pattern worked? Any errors?
4. **Plan Database Sync**: Once we confirm which pattern works

---

## Questions?

If you encounter any issues:
1. Copy full console logs (including `[createOrganization]` and `[Quick FB Connect]` messages)
2. Note which step failed
3. Check Network tab for failed API calls
4. Report back with details

---

**Last Updated**: After deploying commit d0cd27f (aggressive raw SQL fallback)
