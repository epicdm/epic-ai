# Local Development Setup Guide

This guide provides step-by-step instructions for setting up Epic AI locally on your development machine.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Steps](#detailed-setup-steps)
- [Verification](#verification)
- [Optional Features](#optional-features)
- [Windows-Specific Notes](#windows-specific-notes)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | 20.x or later | [nodejs.org](https://nodejs.org/) or via nvm |
| **pnpm** | 10.24.0+ | `npm install -g pnpm@10.24.0` |
| **Docker Desktop** | Latest | [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Recommended

| Tool | Purpose | Installation |
|------|---------|--------------|
| **VS Code** | IDE with excellent TypeScript support | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Prisma Extension** | Database schema highlighting | VS Code marketplace |
| **ESLint Extension** | Code linting | VS Code marketplace |

### Verify Prerequisites

```bash
# Check Node.js version (requires 20.x+)
node --version

# Check pnpm version (requires 10.24.0+)
pnpm --version

# Check Docker is running
docker --version
docker compose version
```

---

## Quick Start

For experienced developers, here's the minimal setup:

```bash
# 1. Clone and enter the repository
git clone <repository-url>
cd epic-ai

# 2. Install dependencies
pnpm install

# 3. Set up environment
copy .env.example .env.local        # Windows
# cp .env.example .env.local        # macOS/Linux

# 4. Edit .env.local and add Clerk keys (REQUIRED)
# CLERK_SECRET_KEY="sk_test_..."
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# 5. Start Docker services
docker compose up -d postgres redis

# 6. Wait for containers to be healthy (~30 seconds)
docker compose ps

# 7. Push database schema
pnpm db:push

# 8. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Detailed Setup Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd epic-ai
```

### Step 2: Install Dependencies

Install all dependencies using pnpm:

```bash
pnpm install
```

**Expected output:**
- Progress bar showing package downloads
- Prisma client generation (postinstall hook)
- Total installation time: 1-3 minutes

**Common warnings (safe to ignore):**
- Peer dependency warnings for React 19
- `WARN deprecated` messages for transitive dependencies

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
# Windows (Command Prompt)
copy .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

**Edit `.env.local`** and configure the required variables:

```bash
# REQUIRED - Get from https://dashboard.clerk.com
CLERK_SECRET_KEY="sk_test_YOUR_KEY_HERE"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"

# Pre-configured for local Docker (no changes needed)
DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/epic_ai?schema=public"
```

> **Note:** You need a free [Clerk](https://clerk.com) account to get authentication keys. Create a new application in the Clerk dashboard to get your keys.

### Step 4: Start Docker Services

Start PostgreSQL and Redis containers:

```bash
docker compose up -d postgres redis
```

Wait for containers to be healthy:

```bash
docker compose ps
```

**Expected output:**
```
NAME              STATUS                   PORTS
epic-ai-postgres  running (healthy)        0.0.0.0:5432->5432/tcp
epic-ai-redis     running (healthy)        0.0.0.0:6379->6379/tcp
```

> **Important:** Wait until both containers show `healthy` status before proceeding (typically 15-30 seconds).

### Step 5: Initialize Database

Push the Prisma schema to create database tables:

```bash
pnpm db:push
```

**Expected output:**
```
Your database is now in sync with your Prisma schema.
```

### Step 6: Start Development Server

Start the Next.js development server:

```bash
pnpm dev
```

**Expected output:**
```
> turbo dev

   ➜ Local:   http://localhost:3000
   ➜ Ready in Xs
```

### Step 7: Verify Setup

Open [http://localhost:3000](http://localhost:3000) in your browser.

**You should see:**
- Epic AI landing page with navigation
- "AI Marketing Engine - From Social to Sale" hero text
- Sign In / Get Started buttons

**If you see errors:**
- Check Clerk keys are correctly configured in `.env.local`
- Ensure Docker containers are healthy
- Check terminal for error messages

---

## Verification

### Verify All Services

| Service | How to Verify | Expected Result |
|---------|---------------|-----------------|
| Web App | Visit http://localhost:3000 | Landing page renders |
| PostgreSQL | `docker exec epic-ai-postgres pg_isready` | "accepting connections" |
| Redis | `docker exec epic-ai-redis redis-cli ping` | "PONG" |
| Database Schema | `pnpm db:studio` | Opens Prisma Studio at http://localhost:5555 |

### Health Check Commands

```bash
# Check all Docker containers
docker compose ps

# Check PostgreSQL
docker exec epic-ai-postgres pg_isready -U epic -d epic_ai

# Check Redis
docker exec epic-ai-redis redis-cli ping

# View database tables (opens browser)
pnpm db:studio

# List database tables via CLI
docker exec epic-ai-postgres psql -U epic -d epic_ai -c "\dt"
```

---

## Optional Features

### Background Workers

The workers service processes background jobs (content generation, social posting).

**Start workers:**
```bash
pnpm --filter @epic-ai/workers dev
```

**Requirements:**
- Redis must be running
- `REDIS_URL` environment variable (defaults to `redis://localhost:6379`)

### Voice Service (Experimental)

The voice service is optional and disabled by default.

**Start via Docker:**
```bash
docker compose up voice-service
```

**Requirements:**
- LiveKit account and credentials
- Magnus Billing account (for telephony)
- Set `NEXT_PUBLIC_ENABLE_VOICE_AI="true"` in `.env.local`

### Prisma Studio

Visual database browser:

```bash
pnpm db:studio
```

Opens at [http://localhost:5555](http://localhost:5555)

---

## Windows-Specific Notes

### Terminal Recommendations

| Terminal | Recommended | Notes |
|----------|-------------|-------|
| **Windows Terminal** | Yes | Best experience, supports tabs |
| **PowerShell 7+** | Yes | Modern PowerShell with improved syntax |
| **Git Bash** | Yes | Unix-like commands (`cp`, `ls`) |
| **CMD** | Acceptable | Use Windows commands (`copy`, `dir`) |
| **WSL2** | Optional | Full Linux environment if preferred |

### Docker Desktop Requirements

1. **Install Docker Desktop for Windows**
   - Download from [docker.com](https://docker.com/products/docker-desktop)
   - Enable WSL2 backend (recommended) during installation

2. **Verify Docker is running**
   - Look for Docker whale icon in system tray
   - Run `docker ps` to verify connectivity

3. **Resource allocation**
   - Docker Desktop > Settings > Resources
   - Recommended: 4GB+ RAM, 2+ CPUs

### Path Considerations

- Use forward slashes `/` in configuration files
- Environment variables work with both `/` and `\` paths
- Git may convert line endings - configure with:
  ```bash
  git config core.autocrlf input
  ```

### Port Conflicts

If you have other services using required ports:

| Port | Service | Alternative |
|------|---------|-------------|
| 3000 | Next.js | `pnpm dev -- -p 3001` |
| 5432 | PostgreSQL | Edit `docker-compose.yml` ports |
| 6379 | Redis | Edit `docker-compose.yml` ports |

### Firewall Notes

- Docker may prompt for firewall access on first run
- Allow connections for proper container networking
- Corporate VPNs may interfere with Docker networking

---

## Troubleshooting

### Installation Issues

#### `pnpm install` fails

**Error:** `EACCES: permission denied`
```bash
# Fix: Run terminal as Administrator or fix npm permissions
npm config set prefix ~/.npm-global
```

**Error:** `node-gyp` build failures
```bash
# Windows: Install build tools
npm install --global windows-build-tools

# Or install Visual Studio Build Tools manually
```

**Error:** `pnpm` command not found
```bash
# Reinstall pnpm
npm install -g pnpm@10.24.0

# Verify installation
pnpm --version
```

### Docker Issues

#### Containers won't start

**Error:** `port is already allocated`
```bash
# Find process using the port
netstat -ano | findstr :5432    # Windows
lsof -i :5432                    # macOS/Linux

# Kill the process or change the port in docker-compose.yml
```

**Error:** `Cannot connect to Docker daemon`
```bash
# Ensure Docker Desktop is running
# Windows: Check system tray for Docker icon
# Restart Docker Desktop if necessary
```

#### Containers not healthy

```bash
# Check container logs
docker compose logs postgres
docker compose logs redis

# Restart containers
docker compose down
docker compose up -d postgres redis
```

### Database Issues

#### `pnpm db:push` fails

**Error:** `Connection refused`
```bash
# Ensure PostgreSQL container is running and healthy
docker compose ps

# Wait for healthy status, then retry
docker compose up -d postgres
# Wait 30 seconds...
pnpm db:push
```

**Error:** `database "epic_ai" does not exist`
```bash
# Create database manually
docker exec epic-ai-postgres createdb -U epic epic_ai

# Retry push
pnpm db:push
```

### Development Server Issues

#### `pnpm dev` fails

**Error:** `CLERK_SECRET_KEY is required`
```bash
# Ensure .env.local exists and has Clerk keys
# Edit .env.local and add:
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

**Error:** `Cannot find module '@epic-ai/database'`
```bash
# Regenerate Prisma client
pnpm db:generate

# Or reinstall dependencies
pnpm install
```

#### Page shows error/blank screen

1. **Check browser console** (F12 > Console tab) for JavaScript errors
2. **Check terminal** for server-side errors
3. **Verify Clerk keys** are correctly configured
4. **Clear Next.js cache:**
   ```bash
   # Delete .next folder
   rm -rf apps/web/.next    # macOS/Linux
   rmdir /s /q apps\web\.next    # Windows

   # Restart dev server
   pnpm dev
   ```

### Environment Variable Issues

#### Variables not being read

1. **Check file location:** `.env.local` must be in the project root
2. **Check file name:** Must be exactly `.env.local` (not `.env.local.txt`)
3. **Restart dev server:** Changes require restart
4. **Check for quotes:** Don't use quotes around values unless they contain spaces

#### Verify environment is loaded

```bash
# Check which env vars are set (PowerShell)
Get-ChildItem Env: | Where-Object { $_.Name -match "CLERK|DATABASE" }

# Check which env vars are set (Bash)
env | grep -E "CLERK|DATABASE"
```

---

## Service URLs Summary

| Service | URL | Notes |
|---------|-----|-------|
| Web Application | http://localhost:3000 | Main application |
| Prisma Studio | http://localhost:5555 | Database browser (run `pnpm db:studio`) |
| PostgreSQL | localhost:5432 | Database connection |
| Redis | localhost:6379 | Job queue |
| Voice Service | http://localhost:5000 | Optional (Docker) |

---

## Next Steps

After successful setup:

1. **Create a Clerk test user** - Sign up at http://localhost:3000/sign-up
2. **Explore the dashboard** - After sign-in, visit http://localhost:3000/dashboard
3. **Read the architecture docs** - See [ARCHITECTURE.md](./ARCHITECTURE.md)
4. **Configure optional features** - See [ENVIRONMENT.md](./ENVIRONMENT.md)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variable reference
- [README.md](../README.md) - Project overview
