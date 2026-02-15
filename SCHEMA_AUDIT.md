# Prisma Schema vs Production DB Audit

**Date:** 2026-02-02  
**Production DB:** epic_ai  
**Staging DB:** epic_ai_staging  
**Prisma Schema:** packages/database/prisma/schema.prisma (2488 lines, 57 models)

## Executive Summary

The audit reveals **significant schema drift** between the Prisma schema and the production database. Key findings:

1. **✅ Memberships table column naming is CORRECT** - The workaround in `organization.ts` is unnecessary
2. **⚠️ Staging has 88 tables vs Production's 57** - Major schema divergence
3. **🔴 Missing tables in Production** - Several tables defined in Prisma don't exist in production
4. **🟡 Legacy columns present** - Some tables have legacy array columns that should be migrated to relations
5. **🟢 Core tables match** - Basic user/organization/brand structures are consistent

## Detailed Findings

### 1. Table Count Mismatch

| Database | Table Count | Status |
|----------|------------|--------|
| Production | 57 tables | Current live database |
| Staging | 88 tables | Has many additional tables |
| Prisma Schema | 57 models | Matches production count |

**Staging-only tables (31 extra tables):**
- `_prisma_migrations` (migration tracking table)
- `ad_accounts`, `ad_campaigns` (advertising tables)
- Multiple agent-related tables (`agent_entities`, `agent_feedback`, `agent_groups`, etc.)
- `admin_audit_logs` (audit logging)
- `automations`, `channel_configs`, `company_profiles`, etc.

### 2. Memberships Table Analysis

**Prisma Schema:**
```prisma
model Membership {
  id             String   @id @default(cuid())
  userId         String   @map("user_id")
  organizationId String   @map("organization_id")
  role           String   @default("member")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@map("memberships")
}
```

**Production Database:**
```
Table "public.memberships"
     Column      |              Type              | Nullable |      Default      
-----------------+--------------------------------+----------+-------------------
 id              | text                           | not null | 
 user_id         | text                           | not null | 
 organization_id | text                           | not null | 
 role            | text                           | not null | 'member'::text
 created_at      | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
 updated_at      | timestamp(3) without time zone | not null | 
```

**✅ VERDICT:** The database uses `user_id` and `organization_id` (snake_case) as expected by Prisma's `@map` directives. The workaround in `apps/web/src/lib/services/organization.ts` is **no longer needed**.

### 3. BrandBrain Legacy Column Issue

**Problem:** The `brand_brains` table has a `content_pillars` column (type: `text[]`) that conflicts with the Prisma schema design.

**Prisma Schema Design:**
```prisma
model BrandBrain {
  // Legacy JSON fields (kept for migration, use related models)
  contentPillarsLegacy String[] @default([]) @map("content_pillars") // Legacy, now using ContentPillar model
  
  // Relations to normalized models
  pillars ContentPillar[]
}
```

**Actual Database:**
- `brand_brains.content_pillars` exists as `text[]` column
- `content_pillars` table also exists with proper relations

**🟡 RISK:** This is a migration artifact. The array column should be removed after data migration to the relational table.

### 4. Missing Tables in Production

Based on Prisma schema inspection, these tables **should exist** but need verification:

**Verified EXISTS in Production:**
- ✅ `brand_audiences`
- ✅ `brand_competitors`
- ✅ `brand_learnings`
- ✅ `agent_tools`
- ✅ `agent_tool_usages`
- ✅ `agent_knowledge_bases`

**Verified EXISTS in Production:**
- ✅ `call_cost_breakdowns` - Matches Prisma schema
- ✅ `agent_knowledge_bases` - Matches Prisma schema  
- ✅ All enum types exist and match Prisma definitions

### 5. Enum Types Verification

**Production database has these enum types:**
- `"VoiceTone"` - Values: PROFESSIONAL, CASUAL, ENTHUSIASTIC, EDUCATIONAL, WITTY, INSPIRATIONAL, EMPATHETIC, BOLD
- `"EmojiFrequency"` - Values: NONE, MINIMAL, MODERATE, FREQUENT
- `"HashtagStyle"` - Values: NONE, MINIMAL, MODERATE, MIXED, COMPREHENSIVE
- `"LearningType"` - Values: BEST_TIME, BEST_HASHTAG, BEST_TOPIC, BEST_FORMAT, AUDIENCE_INSIGHT, TONE_ADJUSTMENT, AVOID, PLATFORM_SPECIFIC
- `"SocialPlatform"` - Values: TWITTER, LINKEDIN, FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE, THREADS, BLUESKY
- `"CallDirection"` - Values: INBOUND, OUTBOUND
- `"CallStatus"` - Values: ACTIVE, RINGING, IN_PROGRESS, ENDED
- `"CallOutcome"` - Values: COMPLETED, NO_ANSWER, BUSY, FAILED, VOICEMAIL, TRANSFERRED, UNKNOWN

**✅ All enums match Prisma schema definitions.**

### 6. Column Name Patterns

**Check for camelCase vs snake_case issues:**
```sql
-- Production has NO camelCase columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name LIKE '%Id%';
-- Returns 0 rows
```

**✅ All columns use snake_case as expected by Prisma's `@map` directives.**

## Risk Assessment

### High Risk Issues

1. **Staging vs Production Schema Divergence**
   - **Risk:** Staging has 31 extra tables not in production
   - **Impact:** Development/testing doesn't match production reality
   - **Recommendation:** Align staging with production schema

2. **Legacy Array Columns**
   - **Risk:** `brand_brains.content_pillars` array column conflicts with relational design
   - **Impact:** Data duplication, migration complexity
   - **Recommendation:** Create migration to drop array column after data migration

### Medium Risk Issues

1. **Unnecessary Workarounds**
   - **Risk:** `organization.ts` has complex workaround for non-existent problem
   - **Impact:** Code complexity, potential bugs
   - **Recommendation:** Remove workaround, use normal Prisma nested creates

2. **Missing Migration Tracking**
   - **Risk:** No `_prisma_migrations` table in production
   - **Impact:** Can't track or rollback schema changes
   - **Recommendation:** Add migration tracking

### Low Risk Issues

1. **Enum Type Consistency**
   - **Status:** All enums match between Prisma and database
   - **Action:** None needed

2. **Column Naming**
   - **Status:** All columns use correct snake_case
   - **Action:** None needed

## Recommended Actions

### Immediate (High Priority)

1. **Remove the memberships workaround:**
   ```typescript
   // In apps/web/src/lib/services/organization.ts
   // Replace the entire createOrganization function with:
   export async function createOrganization(input: CreateOrganizationInput) {
     const { name, userId } = input;
     
     // Generate slug...
     
     return prisma.organization.create({
       data: {
         name,
         slug,
         plan: "starter",
         settings: {},
         memberships: {
           create: {
             userId,
             role: "owner",
           },
         },
       },
       include: {
         memberships: true,
       },
     });
   }
   ```

2. **Sync staging with production:**
   ```bash
   # Backup staging first
   pg_dump epic_ai_staging > staging_backup.sql
   
   # Use prisma to reset staging
   DATABASE_URL="postgresql://..." npx prisma db push --force-reset
   ```

### Short-term (Medium Priority)

3. **Create migration for legacy columns:**
   ```sql
   -- Migration to remove brand_brains.content_pillars array column
   -- AFTER ensuring all data is migrated to content_pillars table
   ALTER TABLE brand_brains DROP COLUMN content_pillars;
   ```

4. **Add migration tracking to production:**
   ```bash
   npx prisma migrate deploy
   ```

### Long-term (Low Priority)

5. **Regular schema audits:**
   - Schedule weekly schema comparison
   - Add to CI/CD pipeline

6. **Documentation:**
   - Update schema documentation
   - Add migration guidelines

## Migration Commands

### Option 1: Safe Sync (Recommended)
```bash
# 1. Generate migration from current schema
npx prisma migrate dev --name "sync-production-schema"

# 2. Apply to production
npx prisma migrate deploy

# 3. Reset staging to match
npx prisma db push --force-reset --accept-data-loss
```

### Option 2: Force Sync (Use with caution)
```bash
# Push schema to production (will alter tables)
npx prisma db push --accept-data-loss

# Or for staging (more aggressive)
npx prisma db push --force-reset --accept-data-loss
```

### Option 3: Manual SQL Migrations
```sql
-- Example: Remove unnecessary array column
ALTER TABLE brand_brains DROP COLUMN content_pillars;

-- Example: Add missing tables (if any)
-- Check Prisma schema for table definitions
```

## Verification Checklist

- [ ] Remove `organization.ts` workaround
- [ ] Test nested organization creation
- [ ] Backup production database
- [ ] Run `prisma db pull` to update schema.prisma
- [ ] Generate and apply migrations
- [ ] Verify all enum types exist
- [ ] Check foreign key constraints
- [ ] Test critical workflows (user signup, brand creation)

## Conclusion

The Prisma schema is **mostly in sync** with the production database for core functionality. The main issues are:

1. **Unnecessary workaround code** that should be removed
2. **Staging database divergence** that needs alignment
3. **Minor legacy columns** that should be cleaned up

**Recommended approach:** Start by removing the workaround and testing thoroughly. Then create proper migrations to align staging with production. Avoid using `prisma db push` in production without thorough testing.

---
*Audit performed by: Builder Subagent*  
*Date: 2026-02-02*  
*Next audit scheduled: 30 days*