# Epic AI - Docker Development Quick Start

Run the entire app (web + workers + database + redis) in Docker Compose. Everything is containerized and matches production exactly.

## Prerequisites

- **Docker** and **Docker Compose** installed on your Linux server
- That's it! No Node.js, pnpm, or PostgreSQL needed locally

## Setup (5 minutes)

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/epicdm/epic-ai.git
cd epic-ai
git checkout staging
```

### 2. Create Environment File

```bash
cp .env.dev.example .env.dev
```

Edit `.env.dev` if needed (defaults are fine for dev):
```bash
DB_PASSWORD=devpassword
CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy
```

### 3. Build and Start All Services

```bash
# Build custom dev images
docker compose -f docker-compose.dev.yml build

# Start all services (postgres, redis, web, workers)
docker compose -f docker-compose.dev.yml up -d

# Wait 10 seconds for database to be ready
sleep 10

# Run migrations
docker compose -f docker-compose.dev.yml exec web npx prisma migrate deploy --skip-generate
```

### 4. Verify Everything Works

```bash
# Check all containers are healthy
docker compose -f docker-compose.dev.yml ps

# Expected output:
# NAME                        STATUS
# epic-ai-postgres-dev        healthy
# epic-ai-redis-dev           healthy
# epic-ai-web-dev             healthy
# epic-ai-workers-dev         healthy
# epic-ai-nginx-dev           healthy
```

### 5. Access the App

Open your browser:

```
http://localhost:3000
```

Or if accessing from another PC:

```
http://<your-server-ip>:3000
```

You should see the Epic AI dashboard with UAT auth bypass enabled (no login required).

---

## Development Workflow

### Make Code Changes

Edit files on your Linux server (via SSH terminal or VS Code Remote SSH).

The app **automatically hot-reloads**:

```bash
# SSH into server (from your local PC)
ssh user@server-ip
cd ~/epic-ai

# Edit files
vim apps/web/src/app/(dashboard)/dashboard/page.tsx

# Changes appear in browser automatically!
```

### View Logs

```bash
# Web logs (Next.js)
docker compose -f docker-compose.dev.yml logs web -f

# Workers logs (BullMQ)
docker compose -f docker-compose.dev.yml logs workers -f

# Database logs
docker compose -f docker-compose.dev.yml logs postgres -f

# All logs
docker compose -f docker-compose.dev.yml logs -f
```

### Restart Services

```bash
# Restart one service
docker compose -f docker-compose.dev.yml restart web

# Restart all
docker compose -f docker-compose.dev.yml restart

# Full rebuild
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d
```

### Access Database

```bash
# Interactive PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U epic -d epic_dev

# List tables
\dt

# Query agents
SELECT id, name, slug, status FROM agents LIMIT 10;

# Exit
\q
```

### Clear Data

```bash
# Stop containers
docker compose -f docker-compose.dev.yml down

# Remove volumes (deletes database data)
docker volume rm epic-ai_postgres_dev epic-ai_redis_dev

# Start fresh
docker compose -f docker-compose.dev.yml up -d
sleep 10
docker compose -f docker-compose.dev.yml exec web npx prisma migrate deploy --skip-generate
```

---

## Testing Agent OS

Once the app is running:

### 1. Create Agent via UI

```
1. Open http://localhost:3000
2. Click "Create Agent"
3. Fill in:
   - Name: "Test Agent"
   - Slug: "test-agent"
   - Description: "Test voice agent"
   - Channels: Select "phone"
4. Click "Create"
5. Agent should appear in list
```

### 2. Test Agent OS API

```bash
# From your local PC or server terminal

# List agents
curl http://localhost/api/agent-os/agents

# Create agent
AGENT_ID=$(curl -X POST http://localhost/api/agent-os/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"API Agent","slug":"api-agent","description":"Test","channels":["phone"]}' \
  | jq -r '.data.id')

echo "Created: $AGENT_ID"

# Get agent details
curl http://localhost/api/agent-os/agents/$AGENT_ID

# Update agent
curl -X PATCH http://localhost/api/agent-os/agents/$AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{"roleCard":{"name":"Support Bot","purpose":"Help customers"}}'
```

### 3. Check Health

```bash
# API health
curl http://localhost/api/health

# Workers health
curl http://localhost/health/workers
```

---

## Deployment Flow

Once dev is working 100%:

### Deploy to Staging

```bash
# 1. Commit code
git add .
git commit -m "feat: working agent os"
git push origin staging

# 2. SSH to staging VM (from your local PC)
ssh deploy@staging-vm-ip
cd /home/deploy/epic-ai
git pull origin staging

# 3. Use docker-compose.staging.yml
docker compose -f docker-compose.staging.yml down
docker build -f Dockerfile.web -t epic-ai-web:staging .
docker build -f Dockerfile.workers -t epic-ai-workers:staging .
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml exec web npx prisma migrate deploy --skip-generate
```

### Deploy to Production

Once staging is verified:

```bash
# Merge staging → main
git checkout main
git pull origin staging
git push origin main

# DigitalOcean auto-deploys via webhook
# Monitor at: https://cloud.digitalocean.com/apps
```

---

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker compose -f docker-compose.dev.yml logs

# Rebuild images
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

### Port already in use?

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it (if safe)
kill -9 <PID>

# Or change port in docker-compose.dev.yml
# Change "3000:3000" to "3002:3000" to use port 3002
```

### Database won't connect?

```bash
# Wait for postgres to be fully ready
sleep 20

# Check postgres is healthy
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U epic

# Check logs
docker compose -f docker-compose.dev.yml logs postgres
```

### Hot-reload not working?

Make sure you're editing files on the Linux server (not local PC):

```bash
# DON'T edit locally - changes won't sync
# DO SSH in and edit:
ssh user@server-ip
cd ~/epic-ai/apps/web/src
vim app/...
# Changes appear immediately in browser
```

### Out of disk space?

```bash
# Check usage
docker system df

# Clean up old images/containers
docker system prune -a --volumes

# Check remaining
df -h
```

---

## Your Ideal Setup

```
Your Local PC
    ↓ SSH
Linux Server (staging.epic.dm or similar)
    ├─ Docker Engine
    ├─ docker-compose.dev.yml (dev environment)
    │   ├─ PostgreSQL (5432)
    │   ├─ Redis (6379)
    │   ├─ Next.js Web (3000)
    │   ├─ BullMQ Workers (3001)
    │   └─ nginx (80)
    │
    └─ docker-compose.staging.yml (staging environment)
        ├─ PostgreSQL (5432)
        ├─ Redis (6379)
        ├─ Next.js Web (3000)
        ├─ BullMQ Workers (3001)
        └─ nginx (80)

Production (DigitalOcean App Platform)
    ├─ Next.js Web
    ├─ BullMQ Workers
    ├─ PostgreSQL (Managed)
    └─ Redis (Managed)
```

You can run **both dev and staging** on the same Linux server using different ports/compose files!

---

## Commands Reference

```bash
# Start dev
docker compose -f docker-compose.dev.yml up -d

# Stop dev
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f [service]

# Restart service
docker compose -f docker-compose.dev.yml restart [service]

# Execute command in container
docker compose -f docker-compose.dev.yml exec [service] [command]

# Database migrations
docker compose -f docker-compose.dev.yml exec web npx prisma migrate deploy --skip-generate

# Database console
docker compose -f docker-compose.dev.yml exec postgres psql -U epic -d epic_dev
```

---

## VS Code Remote SSH Development

Want to edit code from your local PC?

1. Install **Remote - SSH** extension in VS Code
2. Press `Ctrl+Shift+P` → "Remote-SSH: Connect to Host"
3. Enter `user@server-ip`
4. Open `/home/user/epic-ai` folder
5. Edit files in VS Code - changes hot-reload in running container!
6. Open integrated terminal with `Ctrl+` to run commands

Your local PC keyboard → VS Code → SSH → Linux server → Docker container → Hot reload in browser!

