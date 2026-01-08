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

This section covers Windows-specific considerations, workarounds, and best practices for developing on Windows.

### Terminal Recommendations

| Terminal | Recommended | Notes |
|----------|-------------|-------|
| **Windows Terminal** | ⭐ Best | Modern terminal with tabs, themes, and profiles |
| **PowerShell 7+** | ⭐ Recommended | Modern shell with cross-platform support |
| **Git Bash** | ⭐ Recommended | Unix-like commands, great for git workflows |
| **CMD** | Acceptable | Use Windows commands (`copy`, `dir`) |
| **WSL2** | Optional | Full Linux environment if preferred |

#### PowerShell vs Git Bash: Command Differences

| Task | PowerShell | Git Bash | CMD |
|------|------------|----------|-----|
| Copy file | `Copy-Item src dst` | `cp src dst` | `copy src dst` |
| List files | `Get-ChildItem` or `ls` | `ls` | `dir` |
| Create directory | `New-Item -ItemType Directory name` | `mkdir name` | `mkdir name` |
| Delete directory | `Remove-Item -Recurse dir` | `rm -rf dir` | `rmdir /s /q dir` |
| View file | `Get-Content file` | `cat file` | `type file` |
| Set env var (session) | `$env:VAR="value"` | `export VAR=value` | `set VAR=value` |
| Find text in files | `Select-String -Path * -Pattern "text"` | `grep -r "text" .` | `findstr /s "text" *` |

**Recommendation:** Use Git Bash or Windows Terminal with PowerShell 7+ for the best experience with this project.

### Docker Desktop Requirements

#### Installation

1. **Download Docker Desktop for Windows**
   - Get from [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)
   - Requires Windows 10/11 Pro, Enterprise, or Education (64-bit) with Hyper-V
   - Windows 10/11 Home users must use WSL2 backend

2. **Choose Backend: WSL2 vs Hyper-V**

   | Backend | Pros | Cons |
   |---------|------|------|
   | **WSL2** (Recommended) | Faster, lower resource usage, better file system performance | Requires WSL2 installation |
   | **Hyper-V** | Native Windows virtualization | Higher memory usage, slower for file-heavy operations |

3. **Enable WSL2 Backend (Recommended)**
   ```powershell
   # Install WSL2 (run as Administrator)
   wsl --install

   # Set WSL2 as default
   wsl --set-default-version 2
   ```

4. **After Installation**
   - Restart your computer after Docker Desktop installation
   - Look for Docker whale icon in system tray (should turn from animating to static)
   - Run `docker ps` to verify connectivity

#### Resource Allocation

Configure Docker Desktop resources for optimal performance:

1. Open Docker Desktop > Settings > Resources
2. Recommended minimum settings:
   - **CPUs:** 2 (4+ recommended)
   - **Memory:** 4 GB (8 GB recommended)
   - **Swap:** 1 GB
   - **Disk image size:** 64 GB

**For WSL2 backend:** Resources are managed differently. Create/edit `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

Then restart WSL: `wsl --shutdown`

#### Troubleshooting Docker on Windows

| Issue | Solution |
|-------|----------|
| "Docker daemon not running" | Start Docker Desktop from Start menu, wait for whale icon to stabilize |
| "Hyper-V not enabled" | Enable in Windows Features or use WSL2 backend |
| "WSL2 installation incomplete" | Run `wsl --update` in elevated PowerShell |
| Slow container startup | Switch to WSL2 backend, increase allocated resources |
| Containers can't reach internet | Check Windows Firewall, disable VPN temporarily |

### Path Considerations

Windows has unique path handling that can cause issues. Here are the key considerations:

#### Forward vs Backslashes

| Context | Use | Example |
|---------|-----|---------|
| Configuration files (`.env`, `package.json`) | Forward slashes `/` | `./apps/web/src` |
| Windows command line | Either works | `cd apps\web` or `cd apps/web` |
| Node.js/JavaScript | Forward slashes `/` | `path.join('apps', 'web')` |
| PowerShell | Either works | `./apps/web` or `.\apps\web` |
| Git Bash | Forward slashes `/` | `./apps/web` |

#### Long Path Support

Windows traditionally limits paths to 260 characters (MAX_PATH). Node.js projects with deep `node_modules` can exceed this.

**Enable Long Path Support (Recommended):**

1. **Via Group Policy (Windows 10/11 Pro/Enterprise):**
   - Run `gpedit.msc`
   - Navigate to: Computer Configuration > Administrative Templates > System > Filesystem
   - Enable "Enable Win32 long paths"

2. **Via Registry (All Windows versions):**
   ```powershell
   # Run PowerShell as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

3. **Via Git config:**
   ```bash
   git config --system core.longpaths true
   ```

#### Case Sensitivity

Windows file system is case-insensitive by default, but the codebase may have case-sensitive imports.

**Potential issues:**
- `import Button from './Button'` works even if file is `button.tsx`
- Can cause build failures on Linux/macOS or in Docker

**Recommendations:**
- Always match exact case in imports
- Use ESLint with case-sensitive plugin
- Run builds in Docker to catch case issues early

### Line Endings (CRLF vs LF)

Windows uses CRLF (`\r\n`) while Linux/macOS use LF (`\n`). This can cause issues with:
- Git showing all files as modified
- Shell scripts failing to execute in Docker
- Prettier/ESLint conflicts

#### Git Configuration (Recommended)

```bash
# Configure for this repository (recommended)
git config core.autocrlf input
git config core.eol lf

# Or configure globally
git config --global core.autocrlf input
```

#### .gitattributes

The project should include a `.gitattributes` file. If missing, create one:

```gitattributes
# Set default behavior to automatically normalize line endings
* text=auto eol=lf

# Explicitly declare text files to be normalized
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.css text eol=lf
*.scss text eol=lf
*.html text eol=lf
*.yml text eol=lf
*.yaml text eol=lf

# Denote files that should remain as CRLF on Windows
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf

# Denote binary files
*.png binary
*.jpg binary
*.gif binary
*.ico binary
*.woff binary
*.woff2 binary
*.ttf binary
*.eot binary
```

### File Watching Limitations

Windows has limitations with file system watching that can affect hot reload:

#### Symptoms
- Changes not detected by dev server
- Need to restart `pnpm dev` frequently
- "Too many open files" errors

#### Solutions

1. **Increase watchers (for WSL2):**
   ```bash
   # In WSL2 terminal
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Use polling mode (if watching fails):**
   Add to `.env.local`:
   ```bash
   WATCHPACK_POLLING=true
   ```
   Note: Polling uses more CPU but is more reliable.

3. **Exclude node_modules from Windows Defender:**
   - Open Windows Security > Virus & threat protection > Manage settings
   - Add exclusion for your project's `node_modules` folder
   - This significantly improves file watching and installation speed

### Native Module Compilation

Some npm packages require native compilation. On Windows, this needs additional tools.

#### Install Windows Build Tools

```powershell
# Option 1: Via npm (requires Admin PowerShell)
npm install --global windows-build-tools

# Option 2: Install Visual Studio Build Tools manually
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Select "Desktop development with C++" workload
```

#### Common Packages Requiring Build Tools

| Package | Purpose | Notes |
|---------|---------|-------|
| `sharp` | Image processing | Used for Next.js image optimization |
| `bcrypt` | Password hashing | May fail without build tools |
| `node-gyp` | Native module builder | Core dependency |
| `@prisma/engines` | Prisma binaries | Usually downloads pre-built |

#### If Build Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s /q node_modules
pnpm install

# Or use pnpm's built-in clean
pnpm store prune
pnpm install
```

### Port Conflicts

Windows commonly has services using the same ports needed by this project.

#### Check for Port Conflicts

```powershell
# PowerShell: Check if port is in use
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Get process using port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

#### Common Port Conflicts

| Port | Service | Common Conflicts | Resolution |
|------|---------|------------------|------------|
| 3000 | Next.js | Other Node.js apps, Ruby on Rails | Use `pnpm dev -- -p 3001` |
| 5432 | PostgreSQL | Local PostgreSQL installation | Stop local PostgreSQL or change Docker port |
| 6379 | Redis | Local Redis, Windows Subsystem | Stop local Redis or change Docker port |
| 5555 | Prisma Studio | Various apps | Usually no conflicts |

#### Change Docker Ports

Edit `docker-compose.yml` to use different ports:

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Use 5433 on host instead of 5432
  redis:
    ports:
      - "6380:6379"  # Use 6380 on host instead of 6379
```

Then update `.env.local`:
```bash
DATABASE_URL="postgresql://epic:epicpassword@localhost:5433/epic_ai?schema=public"
REDIS_URL="redis://localhost:6380"
```

### Windows Firewall & Network

#### Firewall Configuration

Docker may prompt for firewall access on first run. Allow both:
- **Private networks** - For local development
- **Public networks** - Only if needed for testing

#### Corporate VPN Issues

VPNs can interfere with Docker networking:

| Symptom | Solution |
|---------|----------|
| Containers can't reach internet | Disconnect VPN or add exclusion for Docker networks |
| Docker commands hang | Restart Docker after VPN connect/disconnect |
| DNS resolution fails | Set explicit DNS in Docker settings |

**Docker Desktop network settings:**
1. Settings > Resources > Network
2. Try disabling "Use kernel networking for UDP"
3. Or use fixed DNS: 8.8.8.8, 8.8.4.4

### Environment Variables on Windows

#### Setting Environment Variables

```powershell
# PowerShell (session only)
$env:DATABASE_URL = "postgresql://epic:epicpassword@localhost:5432/epic_ai"

# PowerShell (permanent for user)
[Environment]::SetEnvironmentVariable("DATABASE_URL", "your-value", "User")

# CMD (session only)
set DATABASE_URL=postgresql://epic:epicpassword@localhost:5432/epic_ai
```

#### .env.local File Encoding

Ensure `.env.local` is saved with:
- **Encoding:** UTF-8 (without BOM)
- **Line endings:** LF (not CRLF)

In VS Code:
1. Click "CRLF" in status bar → Select "LF"
2. Click "UTF-8" in status bar → "Save with Encoding" → "UTF-8"

### pnpm-Specific Windows Considerations

#### Global Store Location

pnpm uses a global content-addressable store. On Windows:
- Default location: `%LOCALAPPDATA%\pnpm\store`
- Shared across all projects

#### Symlink Support

pnpm uses symlinks by default. Ensure symlinks are enabled:

```powershell
# Check if symlinks work (requires Admin or Developer Mode)
fsutil behavior query SymlinkEvaluation
```

**Enable Developer Mode (Windows 10/11):**
1. Settings > Update & Security > For developers
2. Enable "Developer Mode"
3. Restart terminal

**Alternative (disable symlinks):**
```bash
pnpm config set node-linker hoisted
```

### Windows Performance Tips

1. **Exclude from Windows Defender:**
   - Add project folder to exclusions
   - Add `node_modules` to exclusions
   - Add pnpm store to exclusions

2. **Disable Windows Search indexing:**
   - Right-click project folder > Properties > Advanced
   - Uncheck "Allow files in this folder to have contents indexed"

3. **Use SSD:**
   - Place project and Docker data on SSD
   - Move Docker data: Settings > Resources > Disk image location

4. **Close unnecessary apps:**
   - Browser DevTools consumes significant resources
   - Close other Electron apps (Slack, Discord, VS Code extensions)

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
