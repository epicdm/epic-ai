# Epic AI - Staging Deployment Guide

This guide covers deploying the Agent OS MVP to a staging VM for final testing before production launch.

## Overview

**Target:** DigitalOcean Droplet or similar (1 vCPU, 2GB RAM, $12/month)
**OS:** Ubuntu 22.04 LTS
**Services:** PostgreSQL, Redis, Next.js web, BullMQ workers, nginx
**Domain:** `staging.epic.dm` (optional)

---

## Phase 1: VM Setup (30 minutes)

### 1.1 Create Droplet

On DigitalOcean or your provider:
- **Size:** 1 vCPU, 2GB RAM ($12/month)
- **OS:** Ubuntu 22.04 LTS
- **Region:** nyc3 (same as prod)
- **Enable:** IPv6, Monitoring

### 1.2 Initial System Setup

```bash
# SSH into droplet
ssh root@<STAGING_IP>

# Update system
apt update && apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker --version

# Install Docker Compose
apt install -y docker-compose-plugin
docker compose version

# Create deploy user
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Configure sudo for deploy user
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
chmod 0440 /etc/sudoers.d/deploy

# Switch to deploy user
su - deploy
```

### 1.3 Clone Repository

```bash
cd /home/deploy
git clone https://github.com/epicdm/epic-ai.git
cd epic-ai

# Checkout staging branch
git checkout staging
```

### 1.4 Create Environment File

```bash
cat > .env.staging << 'EOF'
# Database
DB_PASSWORD=your_secure_password_here

# Clerk (for staging - can use test keys)
CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy

# OpenAI (optional for staging)
OPENAI_API_KEY=sk_test_dummy

# App URLs
APP_URL=http://staging.epic.dm

# Voice Service (optional)
VOICE_SERVICE_URL=http://voice-service:8000
EOF

# Secure the file
chmod 600 .env.staging
```

---

## Phase 2: Deploy Services (15 minutes)

### 2.1 Build Docker Images

```bash
# Build web image
docker build -f Dockerfile.web -t epic-ai-web:staging .

# Build workers image
docker build -f Dockerfile.workers -t epic-ai-workers:staging .

# Verify images
docker images | grep epic-ai
```

### 2.2 Start Services

```bash
# Start all services with docker-compose
docker compose -f docker-compose.staging.yml up -d

# Verify containers are running
docker compose -f docker-compose.staging.yml ps

# Expected output:
# NAME                        STATUS
# epic-ai-postgres-staging    healthy
# epic-ai-redis-staging       healthy
# epic-ai-web-staging         healthy
# epic-ai-workers-staging     healthy
# epic-ai-nginx-staging       healthy
```

### 2.3 Initialize Database

```bash
# Run Prisma migrations
docker compose -f docker-compose.staging.yml exec web \
  npx prisma migrate deploy --skip-generate

# Seed optional test data (if migrations needed)
# docker compose -f docker-compose.staging.yml exec web \
#   npx prisma db seed
```

---

## Phase 3: Verify Deployment (10 minutes)

### 3.1 Check Health Endpoints

```bash
# Health check - API
curl http://localhost/api/health

# Expected response:
# {"status":"ok","database":"connected",...}

# Health check - Workers
curl http://localhost/health/workers

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### 3.2 Test Agent OS API

```bash
# List agents (should return empty array)
curl -X GET http://localhost/api/agent-os/agents

# Expected response:
# {"data":[],"confidence":{},"gaps":[],"warnings":[]}

# Create an agent
curl -X POST http://localhost/api/agent-os/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "slug": "test-agent",
    "description": "MVP test agent",
    "channels": ["phone", "web"]
  }'

# Expected response:
# {"data":{"id":"...","name":"Test Agent",...},...}
```

### 3.3 View Logs

```bash
# Web logs
docker compose -f docker-compose.staging.yml logs web --tail=50 -f

# Workers logs
docker compose -f docker-compose.staging.yml logs workers --tail=50 -f

# All logs
docker compose -f docker-compose.staging.yml logs -f
```

---

## Phase 4: Configure Domain (Optional)

### 4.1 Update DNS

In your DNS provider (Route53, Cloudflare, DigitalOcean DNS):

```
staging.epic.dm    A    <STAGING_IP>
```

### 4.2 Test Domain Access

```bash
curl http://staging.epic.dm/api/health
```

---

## Phase 5: Test Agent OS MVP

### 5.1 Web UI Testing

1. Open browser: `http://staging.epic.dm`
2. You should see the Epic AI dashboard (UAT bypass enabled)
3. Navigate to Agent OS section
4. Click "Create Agent"
5. Fill in:
   - Name: "Test Voice Agent"
   - Slug: "test-voice-agent"
   - Channels: Select "phone"
6. Click "Create"
7. Verify agent appears in list
8. Click agent to view details
9. Update agent configuration
10. Verify state machine works (INIT → DRAFT → CONFIGURED)

### 5.2 API Testing

```bash
# Create agent via API
AGENT_ID=$(curl -X POST http://staging.epic.dm/api/agent-os/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Agent",
    "slug": "api-test-agent",
    "description": "Created via API",
    "channels": ["phone"]
  }' | jq -r '.data.id')

echo "Created agent: $AGENT_ID"

# Get agent details
curl http://staging.epic.dm/api/agent-os/agents/$AGENT_ID

# Update agent configuration
curl -X PATCH http://staging.epic.dm/api/agent-os/agents/$AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "roleCard": {
      "name": "Customer Support Bot",
      "purpose": "Help customers with questions"
    }
  }'

# List all agents
curl http://staging.epic.dm/api/agent-os/agents
```

---

## Ongoing Operations

### Monitor Services

```bash
# Check container status
docker compose -f docker-compose.staging.yml ps

# Check resource usage
docker stats

# Check disk space
df -h
```

### Update Code

When you have new code in `staging` branch:

```bash
cd /home/deploy/epic-ai

# Pull latest code
git fetch origin staging
git checkout staging
git pull origin staging

# Rebuild and restart services
docker compose -f docker-compose.staging.yml down
docker build -f Dockerfile.web -t epic-ai-web:staging .
docker build -f Dockerfile.workers -t epic-ai-workers:staging .
docker compose -f docker-compose.staging.yml up -d

# Run migrations if schema changed
docker compose -f docker-compose.staging.yml exec web \
  npx prisma migrate deploy --skip-generate
```

### View Database

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.staging.yml exec postgres \
  psql -U epic -d epic_staging

# List tables
\dt

# Query agents
SELECT id, name, slug, status FROM agents LIMIT 10;

# Exit
\q
```

### Restart Service

```bash
# Restart specific service
docker compose -f docker-compose.staging.yml restart web

# Restart all services
docker compose -f docker-compose.staging.yml restart

# Full rebuild
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d
```

---

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker compose -f docker-compose.staging.yml logs

# Common issues:
# - Port already in use: docker ps to find conflicting container
# - Out of memory: increase swap (touch /tmp/swapfile)
# - Database connection: wait 10s for postgres to be ready
```

### Database migrations failing?

```bash
# Check migration status
docker compose -f docker-compose.staging.yml exec web \
  npx prisma migrate status

# View schema
docker compose -f docker-compose.staging.yml exec web \
  npx prisma studio

# Manual fix (if needed)
docker compose -f docker-compose.staging.yml exec postgres \
  psql -U epic -d epic_staging -c "SELECT * FROM _prisma_migrations;"
```

### Workers not processing jobs?

```bash
# Check workers logs
docker compose -f docker-compose.staging.yml logs workers -f

# Check Redis
docker compose -f docker-compose.staging.yml exec redis \
  redis-cli KEYS '*'

# Clear queue if needed
docker compose -f docker-compose.staging.yml exec redis \
  redis-cli FLUSHDB
```

### Out of disk space?

```bash
# Check usage
docker system df

# Clean up images/containers
docker system prune -a --volumes

# Remove specific container
docker compose -f docker-compose.staging.yml down
docker volume prune
```

---

## Backup & Recovery

### Backup Database

```bash
# Create backup
docker compose -f docker-compose.staging.yml exec postgres \
  pg_dump -U epic epic_staging > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to storage
# scp backup_*.sql your-storage-server:/backups/
```

### Restore Database

```bash
# Restore from backup
docker compose -f docker-compose.staging.yml exec postgres \
  psql -U epic epic_staging < backup_20260127_120000.sql
```

---

## Security Notes

### For Staging (Development Testing):
- ✅ UAT_AUTH_BYPASS=true (no auth needed)
- ✅ Self-signed SSL (http only is OK)
- ✅ Weak passwords acceptable
- ✅ No backups required

### Before Production:
- ❌ Remove UAT_AUTH_BYPASS
- ✅ Set strong Clerk keys
- ✅ Use real SSL certificates
- ✅ Enable automated backups
- ✅ Restrict access by IP
- ✅ Set up monitoring/alerting

---

## Next Steps

Once staging is verified:
1. ✅ Run full QA on staging
2. ✅ Get stakeholder sign-off
3. ✅ Deploy to production (`main` branch)
4. ✅ Monitor production for 24 hours
5. ✅ Launch to users

---

## Support

If deployment fails:
1. Check logs: `docker compose logs`
2. Check system resources: `docker stats`
3. Verify environment variables: `docker compose config | grep -A 20 web:`
4. Restart services: `docker compose restart`
5. Nuclear option: `docker compose down && docker compose up -d`
