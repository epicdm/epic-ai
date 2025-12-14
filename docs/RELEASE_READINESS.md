# Release Readiness: Epic AI 2.0 (Core Web)

## Status: PRE-RELEASE
**Date:** $(date +%Y-%m-%d)
**Auditor:** Cascade (Execution PM)

---

## 1. Environment Configuration
The following environment variables are **CRITICAL** for production. Missing them will cause boot failure or security incidents.

| Variable | Description | Required? | Default/Note |
|----------|-------------|-----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | YES | Must use connection pooling (Transaction Mode) |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex string for AES-256 | YES | Generate with `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | Auth secret | YES | |
| `NEXT_PUBLIC_APP_URL` | Canonical URL | YES | `https://leads.epic.dm` |

### 🛑 Deployment Blocker
- [ ] **Encryption Key Rotation:** Ensure `TOKEN_ENCRYPTION_KEY` is set in Vercel/DO before deploying the new `SocialPublisher` code.
- [ ] **Database Migrations:** Run `prisma migrate deploy` **before** code promotion.

---

## 2. Rollback Plan
If `SocialPublisher` causes data corruption or crash loops:

1. **Revert** Vercel/DO deployment to previous commit.
2. **Database:** The new `PublishResult` table is additive. No schema rollback needed immediately unless logic is fundamentally broken.
3. **Emergency Switch:**
   - Set env `DISABLE_SOCIAL_PUBLISHING=true` (Feature flag to be implemented if risk is high).

---

## 3. Known Limitations (v2.0.0)
- **Twitter Media:** Only supports public URLs for media upload. Local/Private S3 URLs will fail.
- **LinkedIn:** Only supports simple text posts in this iteration. Rich media support coming in v2.1.
- **Rate Limits:** We handle 429s by marking as `RATE_LIMITED` but do not yet have an exponential backoff worker (manual retry required).

---

## 4. Verification Steps
Run the smoke test script after deployment:

```bash
cd apps/web
npx tsx scripts/verify-publish.ts
```

If the script returns `Verification COMPLETE`, the core pipe is functional.
