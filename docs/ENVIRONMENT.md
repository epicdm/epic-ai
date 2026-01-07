# Environment Variable Reference

This document provides a comprehensive reference for all environment variables used in Epic AI. Variables are organized by category and indicate whether they are required or optional.

## Quick Start

1. Copy the example file: `cp .env.example .env.local`
2. Fill in the **Required** variables (marked with `REQUIRED`)
3. Configure **Optional** variables based on features you need

---

## Required Variables (Minimum Setup)

These variables are **required** for the application to start and function:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/epic_ai` |
| `CLERK_SECRET_KEY` | Clerk authentication secret key | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (client-side) | `pk_test_...` |

---

## Database Configuration

### PostgreSQL

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **REQUIRED** | - | Full PostgreSQL connection string with schema |

**Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

**Examples:**
```bash
# Local development
DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/epic_ai?schema=public"

# Production (Render)
DATABASE_URL="postgresql://epic_ai_db_user:PASSWORD@dpg-xxx.oregon-postgres.render.com:5432/epic_ai_db"

# DigitalOcean Managed
DATABASE_URL="postgresql://user:password@host:25060/epic_ai?sslmode=require"
```

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Optional* | - | Redis connection string for job queues |
| `UPSTASH_REDIS_REST_URL` | Optional | - | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | - | Upstash Redis REST token |

*Required if using background workers (`apps/workers`)

**Examples:**
```bash
# Local Redis
REDIS_URL="redis://localhost:6379"

# Production (Render)
REDIS_URL="redis://red-xxx:PASSWORD@oregon-redis.render.com:6379"

# Upstash (REST API)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

---

## Authentication (Clerk)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLERK_SECRET_KEY` | **REQUIRED** | - | Server-side Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **REQUIRED** | - | Client-side Clerk public key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional | `/sign-in` | Sign-in page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional | `/sign-up` | Sign-up page path |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Optional | `/dashboard` | Redirect after sign-in |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Optional | `/onboarding` | Redirect after sign-up |
| `CLERK_WEBHOOK_SECRET` | Optional | - | Webhook verification secret |

**Get credentials from:** [Clerk Dashboard](https://dashboard.clerk.com/)

---

## AI / LLM Services

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Optional* | - | OpenAI API key for content generation |
| `DEEPGRAM_API_KEY` | Optional | - | Deepgram API key for speech-to-text |

*Required for AI content generation features

**Get credentials from:**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Deepgram: [console.deepgram.com](https://console.deepgram.com)

---

## Voice AI (LiveKit + Magnus)

These variables enable the voice AI features (phone calls, voice agents).

> **Feature Flag:** Controlled by `NEXT_PUBLIC_ENABLE_VOICE_AI`

### LiveKit Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LIVEKIT_URL` | Conditional* | `wss://your-livekit.livekit.cloud` | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Conditional* | - | LiveKit API key |
| `LIVEKIT_API_SECRET` | Conditional* | - | LiveKit API secret |

*Required if `NEXT_PUBLIC_ENABLE_VOICE_AI=true`

### Magnus Billing (Telephony)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAGNUS_API_URL` | Conditional* | `https://your-magnus-server.com/mbilling/api` | Magnus Billing API endpoint |
| `MAGNUS_API_KEY` | Conditional* | - | Magnus API key |
| `MAGNUS_TENANT_ID` | Conditional* | - | Magnus tenant identifier |
| `MAGNUS_DEFAULT_RATE` | Conditional* | - | Default rate ID for calls |
| `MAGNUS_DEFAULT_TRUNK` | Conditional* | - | Default SIP trunk ID |

*Required if `NEXT_PUBLIC_ENABLE_VOICE_AI=true`

### Voice Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VOICE_SERVICE_URL` | Optional | `http://localhost:5000` | Internal voice service URL |
| `PORT` | Optional | `8000` | Voice service port (Python) |
| `FLASK_DEBUG` | Optional | `false` | Flask debug mode |
| `LOG_LEVEL` | Optional | `INFO` | Logging level |

---

## Social Platform OAuth

Configure OAuth credentials for native social media integrations.

### X/Twitter (OAuth 2.0 with PKCE)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWITTER_CLIENT_ID` | Optional | - | Twitter OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | Optional | - | Twitter OAuth 2.0 client secret |
| `TWITTER_CALLBACK_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/auth/callback/twitter` | OAuth callback URL |

**Setup:** [developer.twitter.com](https://developer.twitter.com)

### LinkedIn

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINKEDIN_CLIENT_ID` | Optional | - | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | Optional | - | LinkedIn OAuth client secret |
| `LINKEDIN_CALLBACK_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin` | OAuth callback URL |

**Setup:** [developer.linkedin.com](https://developer.linkedin.com)

### Meta (Facebook/Instagram)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `META_APP_ID` | Optional | - | Meta App ID |
| `META_APP_SECRET` | Optional | - | Meta App secret |
| `META_CALLBACK_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/auth/callback/meta` | OAuth callback URL |

**Setup:** [developers.facebook.com](https://developers.facebook.com)

### TikTok

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TIKTOK_CLIENT_KEY` | Optional | - | TikTok client key |
| `TIKTOK_CLIENT_SECRET` | Optional | - | TikTok client secret |
| `TIKTOK_CALLBACK_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok` | OAuth callback URL |

**Setup:** [developers.tiktok.com](https://developers.tiktok.com)

### Google (YouTube + Ads)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | - | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google` | OAuth callback URL |

**Setup:** [console.cloud.google.com](https://console.cloud.google.com)

---

## Ad Platforms

Configure ad platform integrations for campaign management.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `META_ADS_ACCESS_TOKEN` | Optional | - | Meta Ads system user access token |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Optional | - | Google Ads developer token |
| `GOOGLE_ADS_CLIENT_ID` | Optional | - | Google Ads OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | Optional | - | Google Ads OAuth client secret |

---

## Payments (Stripe)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Optional* | - | Stripe secret key (server-side) |
| `STRIPE_WEBHOOK_SECRET` | Optional* | - | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional* | - | Stripe public key (client-side) |

*Required for billing functionality

**Get credentials from:** [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

---

## Storage (DigitalOcean Spaces / S3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DO_SPACES_KEY` | Optional* | - | DigitalOcean Spaces access key |
| `DO_SPACES_SECRET` | Optional* | - | DigitalOcean Spaces secret key |
| `DO_SPACES_BUCKET` | Optional | `epic-ai-media` | Storage bucket name |
| `DO_SPACES_REGION` | Optional | `nyc3` | Spaces region |
| `DO_SPACES_ENDPOINT` | Optional | `https://nyc3.digitaloceanspaces.com` | Spaces endpoint URL |
| `DO_SPACES_CDN_ENDPOINT` | Optional | `https://epic-ai-media.nyc3.cdn.digitaloceanspaces.com` | CDN endpoint URL |

*Required for media upload functionality

---

## Email (Resend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Optional | - | Resend API key for transactional email |

**Get credentials from:** [resend.com/api-keys](https://resend.com/api-keys)

---

## Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOKEN_ENCRYPTION_KEY` | Optional* | - | 32-byte hex key for token encryption |
| `OAUTH_ENCRYPTION_KEY` | Optional | - | OAuth token encryption key |
| `NEXTAUTH_SECRET` | Optional | - | NextAuth.js secret (if used) |

*Required for social platform OAuth token storage

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## App Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` | Public application URL |
| `NEXTAUTH_URL` | Optional | `http://localhost:3000` | NextAuth.js base URL |

**Production values:**
```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXTAUTH_URL="https://your-domain.com"
```

---

## Feature Flags

Control feature availability across the application:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_VOICE_AI` | Optional | `false` | Enable voice AI features |
| `NEXT_PUBLIC_ENABLE_ADS` | Optional | `true` | Enable ad platform integrations |
| `NEXT_PUBLIC_ENABLE_CONTENT` | Optional | `true` | Enable content generation features |

**Usage:**
```bash
# Enable all features
NEXT_PUBLIC_ENABLE_VOICE_AI="true"
NEXT_PUBLIC_ENABLE_ADS="true"
NEXT_PUBLIC_ENABLE_CONTENT="true"

# Minimal setup (disable experimental features)
NEXT_PUBLIC_ENABLE_VOICE_AI="false"
```

---

## Environment Files by Location

The project uses multiple `.env` files for different contexts:

| File | Location | Purpose |
|------|----------|---------|
| `.env.example` | Root | Template with all variables |
| `.env.local` | Root | Local development overrides |
| `.env.production` | Root | Production values (Vercel) |
| `apps/web/.env.example` | Web app | Web-specific variables |
| `apps/voice-service/.env.example` | Voice service | Python service variables |

**Loading Priority (Next.js):**
1. `.env.local` (highest priority, gitignored)
2. `.env.development` or `.env.production`
3. `.env` (lowest priority)

---

## Configuration by Deployment Target

### Local Development

Minimum required for local development:

```bash
# Database
DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/epic_ai?schema=public"

# Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Vercel (Production)

Set these in Vercel Environment Variables:

```bash
# Required
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# Recommended
OPENAI_API_KEY="sk-..."
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### Docker (Voice Service)

```bash
# Required for voice service
PORT=8000
LIVEKIT_URL="wss://..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
```

---

## Troubleshooting

### Common Issues

**1. "Missing required environment variable"**
- Ensure all **REQUIRED** variables are set
- Check variable names for typos
- Verify `.env.local` file exists and is readable

**2. Database connection failed**
- Verify `DATABASE_URL` format and credentials
- Check if PostgreSQL is running
- For remote databases, ensure network access is allowed

**3. Authentication not working**
- Verify Clerk keys match your application
- Check `NEXT_PUBLIC_CLERK_*` URLs are correct
- Ensure Clerk webhook secret matches if using webhooks

**4. Feature appears disabled**
- Check corresponding feature flag (`NEXT_PUBLIC_ENABLE_*`)
- Verify service-specific variables are set (e.g., `OPENAI_API_KEY` for content)

### Validation

Check your environment configuration:

```bash
# Print all Epic AI env vars (redacted)
env | grep -E "^(DATABASE|CLERK|OPENAI|STRIPE|NEXT_PUBLIC)" | sed 's/=.*/=***/'

# Verify database connection
npx prisma db pull

# Test Clerk configuration
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" https://api.clerk.dev/v1/users?limit=1
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Local development setup guide
- [RELEASE_READINESS.md](./RELEASE_READINESS.md) - Production deployment checklist
