# Voice Agent Organization Context Bug Analysis

## Root Cause Explanation

The bug occurs in `apps/web/src/app/api/voice/agents/route.ts` where `getCurrentOrganization()` sometimes returns `null` even when the user has organization memberships. This causes voice agents to not appear in the dashboard.

### The Problem Flow:

1. **API Route Calls `getCurrentOrganization()`** (`/api/voice/agents/route.ts:295`)
   - Calls `getCurrentUser()` → `getAuthWithBypass()` → `clerkAuth()`
   - Queries database for user with memberships and organizations
   - Returns `null` if no user or empty memberships

2. **Fallback Logic Activates** (lines 314-350)
   - When `getCurrentOrganization()` returns `null`, the code queries the user directly
   - This second query often finds memberships that the first query didn't find
   - The code then queries agents across all user organizations as a workaround

3. **The Contradiction**:
   - `getCurrentOrganization()` returns `null`
   - But manual user query finds memberships with organizations
   - This suggests either:
     a) The Prisma query in `getCurrentUser()` is failing silently
     b) There's a timing/race condition
     c) The `organization` relation on memberships is null

### Key Code References:

1. **`getCurrentOrganization()`** (`apps/web/src/lib/auth.ts:145-156`)
   ```typescript
   export async function getCurrentOrganization() {
     const user = await getCurrentUser();
     if (!user || user.memberships.length === 0) {
       return null;
     }
     return user.memberships[0].organization; // Could be null!
   }
   ```

2. **`getCurrentUser()`** (`apps/web/src/lib/auth.ts:117-134`)
   ```typescript
   export async function getCurrentUser() {
     const { userId } = await getAuthWithBypass();
     if (!userId) return null;
     
     const user = await prisma.user.findUnique({
       where: { id: userId },
       include: {
         memberships: {
           include: {
             organization: true, // Includes organization relation
           },
         },
       },
     });
     return user;
   }
   ```

3. **Bug Workaround in Voice Agents Route** (`apps/web/src/app/api/voice/agents/route.ts:314-350`)
   ```typescript
   if (!org) {
     // User has memberships but getCurrentOrganization() returned null
     // This is the bug! Let's get all org IDs and query agents
     const orgIds = user.memberships.map(m => m.organizationId);
     // ... fallback query logic
   }
   ```

### Root Cause Hypothesis:

After deeper analysis, the most likely issue is a **race condition in UAT bypass mode** combined with **missing error handling**. Here's the sequence:

1. **UAT Bypass Mode**: When `NODE_ENV=development` and `UAT_AUTH_BYPASS=true`, `getAuthWithBypass()` returns `UAT_TEST_USER_ID`
2. **Race Condition**: `ensureUATTestData()` is called to create test user/org/membership
3. **Timing Issue**: If `getCurrentOrganization()` is called while `ensureUATTestData()` is still running (or failed), it queries for a user that doesn't exist yet
4. **Missing Error Handling**: `getCurrentUser()` has no try-catch, so if Prisma query fails, it throws but the error might be swallowed
5. **Fallback Works**: The manual query in the fallback might succeed because `ensureUATTestData()` has completed by then

**Evidence**:
- `getAuthWithBypass()` is called twice (once in route, once in `getCurrentOrganization()`)
- `ensureUATTestData()` creates data asynchronously
- No error handling in `getCurrentUser()`
- Console logs show fallback finding memberships that `getCurrentOrganization()` didn't find

**Alternative Possibility**: Clerk session inconsistency where `clerkAuth()` returns different results on sequential calls, though less likely.

## Proposed Fix

### Option 1: Fix race condition in UAT bypass mode

```typescript
// apps/web/src/lib/auth.ts
export async function getAuthWithBypass(): Promise<{ userId: string | null; isUATBypass: boolean }> {
  const result = await clerkAuth();

  if (result.userId) {
    return { userId: result.userId, isUATBypass: false };
  }

  if (isUATBypassEnabled) {
    // Ensure UAT test user and org exist in database BEFORE returning
    // This prevents race conditions
    try {
      await ensureUATTestData();
    } catch (error) {
      console.error("[getAuthWithBypass] Failed to ensure UAT test data:", error);
      // Still return test user ID - the fallback logic will handle missing data
    }
    return { userId: UAT_TEST_USER_ID, isUATBypass: true };
  }

  return { userId: null, isUATBypass: false };
}
```

### Option 2: Add error handling and caching to `getCurrentUser()`

```typescript
// apps/web/src/lib/auth.ts
export async function getCurrentUser() {
  const { userId } = await getAuthWithBypass();
  
  if (!userId) {
    return null;
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
    
    if (!user) {
      console.warn(`[getCurrentUser] User ${userId} not found in database`);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("[getCurrentUser] Database error:", error);
    return null;
  }
}
```

### Option 3: Memoize `getAuthWithBypass()` to avoid duplicate calls

```typescript
// apps/web/src/lib/auth.ts
let authCache: { userId: string | null; isUATBypass: boolean } | null = null;

export async function getAuthWithBypass(): Promise<{ userId: string | null; isUATBypass: boolean }> {
  // Return cached result if available (for same request)
  if (authCache !== null) {
    return authCache;
  }
  
  const result = await clerkAuth();

  if (result.userId) {
    authCache = { userId: result.userId, isUATBypass: false };
    return authCache;
  }

  if (isUATBypassEnabled) {
    try {
      await ensureUATTestData();
    } catch (error) {
      console.error("[getAuthWithBypass] Failed to ensure UAT test data:", error);
    }
    authCache = { userId: UAT_TEST_USER_ID, isUATBypass: true };
    return authCache;
  }

  authCache = { userId: null, isUATBypass: false };
  return authCache;
}

// Clear cache at the end of each request (Next.js middleware or route handler)
export function clearAuthCache() {
  authCache = null;
}
```

## Risk Assessment

### Low Risk:
- Options 1 and 2 add error handling and fix race conditions
- They don't change the API, just make it more robust
- Backward compatible

### Medium Risk:
- Option 3 (caching) could cause issues if not properly cleared between requests
- Need to ensure cache invalidation works correctly in Next.js

### Recommended Approach:
1. **Immediate fix**: Implement Option 1 (fix race condition) + Option 2 (error handling)
2. **Testing**: Add logging to monitor the issue
3. **If persists**: Consider Option 3 (caching) but with request-scoped cache

## Code Diff for Comprehensive Fix

```diff
// apps/web/src/lib/auth.ts
export async function getAuthWithBypass(): Promise<{ userId: string | null; isUATBypass: boolean }> {
  const result = await clerkAuth();

  if (result.userId) {
    return { userId: result.userId, isUATBypass: false };
  }

  if (isUATBypassEnabled) {
    // Ensure UAT test user and org exist in database
+    try {
      await ensureUATTestData();
+    } catch (error) {
+      console.error("[getAuthWithBypass] Failed to ensure UAT test data:", error);
+      // Continue anyway - fallback logic will handle missing data
+    }
    return { userId: UAT_TEST_USER_ID, isUATBypass: true };
  }

  return { userId: null, isUATBypass: false };
}

export async function getCurrentUser() {
  const { userId } = await getAuthWithBypass();

  if (!userId) {
    return null;
  }

+  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

+    if (!user) {
+      console.warn(`[getCurrentUser] User ${userId} not found in database`);
+      return null;
+    }
+
+    return user;
+  } catch (error) {
+    console.error("[getCurrentUser] Database error:", error);
+    return null;
+  }
}
```

This fix addresses both the race condition (by catching errors in `ensureUATTestData()`) and adds proper error handling to `getCurrentUser()`. It also adds logging to help diagnose issues.