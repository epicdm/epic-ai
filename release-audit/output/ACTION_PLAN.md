# Epic AI Staging - Production Launch Action Plan

**Generated:** 2026-01-17
**Status:** NO-GO - Critical blockers identified
**Audit Completion:** 100%

---

## Executive Summary

The comprehensive production readiness audit of `staging.leads.epic.dm` has identified **2 critical blockers** that must be resolved before production launch:

1. **CRITICAL (P0):** Google OAuth login completely broken due to Clerk misconfiguration
2. **HIGH (P1):** Missing /help page causing 404 errors

### Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Infrastructure | ✅ Healthy | Vercel + DigitalOcean all operational |
| Database | ✅ Healthy | PostgreSQL + Redis working correctly |
| Email/Password Auth | ✅ Working | Clerk authentication functional |
| OAuth Authentication | ❌ **BROKEN** | Redirect loop via clerk.shared.lcl.dev |
| Site Coverage | ⚠️ Partial | 46/47 pages working (missing /help) |
| Performance | ✅ Good | No timeout issues |

---

## Critical Blocker #1: OAuth Redirect Loop

### The Problem

Google OAuth login is completely broken on staging due to Clerk configuration using test/development credentials instead of production credentials.

### Evidence

**Current Vercel Environment Variables:**
```bash
CLERK_SECRET_KEY="sk_test_LV2QYhp1Uj3MIy8GRdkS7QfCxrOq18KPZPPIaaDIcr"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_bmF0aXZlLWd1cHB5LTM4LmNsZXJrLmFjY291bnRzLmRldiQ"
```

**Problem:**
- Both keys are `*_test_*` (development instance) instead of `*_live_*` (production)
- Test instance `native-guppy-38.clerk.accounts.dev` has OAuth callbacks configured for `clerk.shared.lcl.dev`
- This is Clerk's **local development domain** and should NEVER appear in staging/production

**User Impact:**
- ✅ Email/password login works
- ❌ Google OAuth login → infinite redirect loop
- ❌ LinkedIn OAuth likely broken
- ❌ Facebook OAuth likely broken

### Solution Options

#### Option 1: Create Production Clerk Instance (RECOMMENDED) ✅

**Pros:**
- Proper production setup
- Clean separation of dev/staging/prod
- Scalable for future growth
- Best security practices

**Cons:**
- Requires Clerk paid plan
- More configuration steps
- 30-45 minutes to complete

**Steps:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new **Production** application
3. Configure Google OAuth:
   - Authorized Redirect URIs:
     - `https://staging.leads.epic.dm/sso-callback`
     - `https://leads.epic.dm/sso-callback` (for future production)
   - Authorized JavaScript Origins:
     - `https://staging.leads.epic.dm`
     - `https://leads.epic.dm`
4. Update allowed origins in Clerk Settings → Domains
5. Get production keys (`pk_live_*` and `sk_live_*`)
6. Update Vercel environment variables:
   ```bash
   vercel env rm CLERK_SECRET_KEY preview
   vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview

   vercel env add CLERK_SECRET_KEY preview
   # Paste: sk_live_xxxxx

   vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview
   # Paste: pk_live_xxxxx

   # Redeploy staging
   vercel --prod --scope epiccommunicationsinc-1396s-projects
   ```

#### Option 2: Fix Test Instance OAuth Config (QUICK WORKAROUND) ⚠️

**Pros:**
- Faster fix (10-15 minutes)
- Works with existing free tier
- No new keys needed

**Cons:**
- Mixing dev/staging in same instance (not best practice)
- Test instance has limitations
- Must fix again before production launch

**Steps:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select `native-guppy-38` instance
3. Update Google OAuth settings:
   - Add redirect URI: `https://staging.leads.epic.dm/sso-callback`
   - Keep existing local redirects for dev
4. Update allowed origins:
   - Add: `https://staging.leads.epic.dm`
5. Redeploy staging (no env var changes needed)

#### Option 3: Hybrid Approach (RECOMMENDED FOR IMMEDIATE FIX)

**Plan:**
1. Implement Option 2 NOW to unblock staging (10-15 min)
2. Implement Option 1 before production launch (30-45 min)
3. Keep dev using local test instance separately

### Verification Steps

After implementing fix:

1. **Check Environment Variables**
   ```bash
   vercel env ls
   # Should show: pk_live_* and sk_live_* (Option 1)
   # OR: pk_test_* and sk_test_* (Option 2, but Clerk config updated)
   ```

2. **Test OAuth Flow**
   - Open DevTools → Network → Preserve Log
   - Navigate to https://staging.leads.epic.dm
   - Click "Sign in with Google"
   - **Expected flow:**
     ```
     staging.leads.epic.dm
       → accounts.google.com (OAuth)
       → clerk callback (your instance)
       → staging.leads.epic.dm/sso-callback
       → staging.leads.epic.dm/dashboard
     ```
   - **Bad flow (current):**
     ```
     staging.leads.epic.dm
       → accounts.google.com
       → clerk.shared.lcl.dev (WRONG!)
       → redirect loop
     ```

3. **Verify No lcl.dev References**
   - In DevTools Network tab, filter for "lcl"
   - Should see: **0 requests** to `*.lcl.dev` domains

4. **Test Complete Login**
   - Clear cookies for staging.leads.epic.dm
   - Sign in with Google
   - Should land on /dashboard without loops
   - Session should persist (refresh page → still logged in)

---

## Critical Blocker #2: Missing /help Page

### The Problem

The help link in mobile navigation (line 378 of mobile-nav.tsx) points to `/help` which doesn't exist, resulting in a 404 error.

### Solution: Page Created ✅

**Action Taken:**
- Created `/opt/epic-ai/apps/web/src/app/help/page.tsx`
- Comprehensive help page with:
  - Documentation links
  - Video tutorials
  - Community links
  - FAQ section
  - Email support contact
  - Live chat integration
  - Additional resources

**Status:** RESOLVED (requires deployment)

---

## Deployment Checklist

### Before Deploying Fixes

- [ ] Choose OAuth fix approach (Option 1, 2, or 3)
- [ ] Update Clerk OAuth configuration
- [ ] Update Vercel environment variables (if Option 1)
- [ ] Verify help page created

### Deploy to Staging

```bash
# Push changes
git add apps/web/src/app/help/page.tsx
git commit -m "fix: add help page to resolve 404 error"
git push origin staging

# If using Option 1, update Vercel env vars first
vercel env add CLERK_SECRET_KEY preview
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview

# Redeploy
vercel --prod --scope epiccommunicationsinc-1396s-projects
```

### Post-Deployment Verification

- [ ] Test /help page loads correctly
- [ ] Test Google OAuth login flow (no redirect loop)
- [ ] Verify no `lcl.dev` redirects in DevTools Network tab
- [ ] Test email/password login still works
- [ ] Test all OAuth providers (LinkedIn, Facebook if configured)
- [ ] Test complete user journey: signup → onboarding → dashboard
- [ ] Clear browser cache and test in incognito mode

### Re-run Audit

```bash
cd /opt/epic-ai/release-audit
npm run audit:staging
```

Expected results after fixes:
- Pages crawled: 47 (including /help)
- Critical issues: 0
- High issues: 0
- Medium issues: ~124 (RSC prefetch aborts - false positives)
- Overall verdict: **CONDITIONAL GO** or **GO**

---

## Production Launch Preparation

### After Staging Fixes Verified

- [ ] Create production Clerk instance (if not already done)
- [ ] Configure production Clerk OAuth for `leads.epic.dm`
- [ ] Update production Vercel environment variables
- [ ] Point to production PostgreSQL database
- [ ] Point to production Redis instance
- [ ] Verify DNS configuration for leads.epic.dm
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure error alerts
- [ ] Test complete production deployment
- [ ] Run final production audit

---

## Risk Assessment

### High Risk Items
- OAuth misconfiguration affects all users trying to sign in via social login
- Production launch blocked until fixes deployed

### Medium Risk Items
- Missing help page causes poor user experience
- Users may contact support unnecessarily

### Low Risk Items
- Next.js RSC prefetch aborts (124 "errors" - all false positives)
- Generic page titles (SEO impact)

---

## Timeline Estimate

| Task | Time | Owner |
|------|------|-------|
| **OAuth Fix (Option 2)** | 10-15 min | DevOps |
| **OAuth Fix (Option 1)** | 30-45 min | DevOps |
| **Help Page Deploy** | 5 min | Already created, needs deploy |
| **Testing & Verification** | 15-20 min | QA |
| **Re-run Audit** | 5 min | Automated |
| **Total (Quick Fix)** | 35-45 min | - |
| **Total (Production Fix)** | 55-85 min | - |

---

## Success Criteria

### Staging Ready When:
- ✅ Google OAuth login works without redirect loop
- ✅ /help page accessible (no 404)
- ✅ No `lcl.dev` references in network requests
- ✅ All 47 pages crawlable
- ✅ Email/password authentication still working
- ✅ Re-run audit shows 0 critical issues

### Production Ready When:
- ✅ All staging fixes verified
- ✅ Production Clerk instance configured
- ✅ Production environment variables set
- ✅ Production database/Redis configured
- ✅ Monitoring and alerts configured
- ✅ Manual smoke tests passed
- ✅ Final production audit shows GO status

---

## Contact & Support

**Questions about fixes:**
- Technical: DevOps team
- Clerk configuration: Backend team
- Deployment: Platform team

**Reference Documents:**
- `CRITICAL_BLOCKER_CLERK_CONFIG.md` - Detailed OAuth fix instructions
- `FINAL_GO_NO_GO_REPORT.md` - Complete audit findings
- `report.json` - Raw audit data
- `report.md` - Detailed issue listing

---

## Appendix: Quick Command Reference

### Check Vercel Env Vars
```bash
vercel env ls
```

### Pull Current Staging Env
```bash
vercel env pull --environment=preview .env.staging
```

### Test OAuth Flow (Browser DevTools)
```javascript
// In console after clicking "Sign in with Google"
// Watch Network tab for redirects
// Should NOT see any requests to *.lcl.dev
```

### Clear Clerk Session
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
sessionStorage.clear();
```

---

**Report Generated:** 2026-01-17
**Audit System:** release-audit v1.0.0
**Next Action:** Fix Clerk OAuth configuration (see options above)
