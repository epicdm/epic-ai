# Epic AI - Dev Environment Setup (Production-Ready)

**Architecture:**
- **Backend API**: Linux server (66.118.37.12) running Docker with database, Redis, workers
- **Frontend**: Vercel (dev.leads.epic.dm)
- **DNS**: Points dev.leads.epic.dm → 66.118.37.12

---

## Phase 1: Setup Docker on Linux Server (15 minutes)

### 1.1 Install Docker

SSH into your Linux server:

```bash
ssh root@66.118.37.12

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify
docker --version
docker compose version
```

### 1.2 Clone Repository & Setup Environment

```bash
cd /home
git clone https://github.com/epicdm/epic-ai.git
cd epic-ai
git checkout staging

# Create environment file
cp .env.dev.example .env.dev

# Configure for your setup
cat > .env.dev << 'EOF'
DB_PASSWORD=your_secure_dev_password_here
CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy
OPENAI_API_KEY=sk_test_dummy
EOF
```

### 1.3 Build and Start API Docker Environment

```bash
# Build images (this takes 2-3 minutes)
docker compose -f docker-compose.api-only.yml build

# Start all services in background
docker compose -f docker-compose.api-only.yml up -d

# Wait for services to be ready
sleep 15

# Run database migrations
docker compose -f docker-compose.api-only.yml exec web npx prisma migrate deploy --skip-generate

# Verify everything is running
docker compose -f docker-compose.api-only.yml ps
```

Expected output:
```
NAME                        STATUS
epic-ai-postgres-dev        healthy
epic-ai-redis-dev           healthy
epic-ai-web-dev             healthy
epic-ai-workers-dev         healthy
epic-ai-nginx-dev           healthy
```

### 1.4 Test API is Accessible

From your local PC:

```bash
# Test health endpoint
curl http://66.118.37.12/api/health

# Expected response:
# {"status":"ok","database":"connected",...}
```

---

## Phase 2: Update DNS (5 minutes)

Update your DNS provider (Route53, Cloudflare, DigitalOcean DNS, etc.) to point dev.leads.epic.dm to your Linux server:

**Add/Update DNS Record:**
```
Host: dev.leads.epic.dm
Type: A
Value: 66.118.37.12
TTL: 300 (or default)
```

### Verify DNS Propagation

```bash
# From your local PC - wait for this to resolve to 66.118.37.12
nslookup dev.leads.epic.dm

# Or:
dig dev.leads.epic.dm

# Test API via domain
curl http://dev.leads.epic.dm/api/health
```

---

## Phase 3: Deploy Frontend to Vercel (10 minutes)

### 3.1 Prepare Environment Variables for Vercel

Log into Vercel dashboard → Your project → Settings → Environment Variables

Add these variables:

```
NEXT_PUBLIC_API_URL=https://dev.leads.epic.dm
NEXT_PUBLIC_APP_URL=https://dev.leads.epic.dm
DATABASE_URL=postgresql://... (Vercel doesn't need this for frontend)
REDIS_URL=... (Vercel doesn't need this)
UAT_AUTH_BYPASS=true
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy
```

### 3.2 Deploy Frontend

Option A: **Automatic Deployment** (recommended)
```bash
# Push to your repository (Vercel watches for changes)
cd ~/epic-ai
git add .
git commit -m "feat: setup dev environment"
git push origin staging
```

Vercel automatically redeploys when you push.

Option B: **Manual Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from epic-ai directory
vercel --prod --token YOUR_VERCEL_TOKEN
```

### 3.3 Configure Custom Domain in Vercel

In Vercel dashboard:
1. Go to Settings → Domains
2. Add custom domain: `dev.leads.epic.dm`
3. Vercel shows you the DNS configuration needed

**Update DNS Records** (add to your DNS provider):

For Vercel, typically you need:
- CNAME record pointing to Vercel's edge network

Follow Vercel's on-screen instructions for exact DNS setup.

---

## Phase 4: Verify Everything Works (5 minutes)

### 4.1 API Accessible

```bash
# From your local PC
curl https://dev.leads.epic.dm/api/health
curl https://dev.leads.epic.dm/api/agent-os/agents
```

### 4.2 Frontend Accessible

Open browser: **https://dev.leads.epic.dm**

Should see the Epic AI dashboard.

### 4.3 Test Agent Creation

From the dashboard:
1. Click "Create Agent"
2. Fill in details
3. Click "Create"
4. Should appear in list

### 4.4 Test API

```bash
# Create agent via API
curl -X POST https://dev.leads.epic.dm/api/agent-os/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "slug": "test-agent",
    "description": "Test agent",
    "channels": ["phone"]
  }'

# List agents
curl https://dev.leads.epic.dm/api/agent-os/agents
```

---

## Phase 5: Setup Auto-Restart on Server Reboot (Optional)

Create systemd service so Docker containers restart automatically:

```bash
sudo tee /etc/systemd/system/epic-ai-api.service > /dev/null <<'EOF'
[Unit]
Description=Epic AI API Environment
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/epic-ai
ExecStart=/usr/bin/docker compose -f docker-compose.api-only.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.api-only.yml down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable epic-ai-api.service
sudo systemctl start epic-ai-api.service

# Check status
sudo systemctl status epic-ai-api.service
```

Now the API automatically restarts if the server reboots!

---

## Daily Workflow

### Making Code Changes

Edit code locally or SSH into server:

```bash
# Local dev
vim apps/web/src/app/...

# Push changes
git add .
git commit -m "feat: description"
git push origin staging
```

Vercel automatically deploys frontend.

### Updating API Code

```bash
# SSH to server
ssh root@66.118.37.12
cd /home/epic-ai

# Pull latest
git pull origin staging

# Rebuild and restart API
docker compose -f docker-compose.api-only.yml down
docker compose -f docker-compose.api-only.yml build
docker compose -f docker-compose.api-only.yml up -d
docker compose -f docker-compose.api-only.yml exec web npx prisma migrate deploy --skip-generate
```

### View Logs

```bash
# From your local PC - SSH in
ssh root@66.118.37.12
cd /home/epic-ai

# View API logs
docker compose -f docker-compose.api-only.yml logs web -f

# View worker logs
docker compose -f docker-compose.api-only.yml logs workers -f

# View all
docker compose -f docker-compose.api-only.yml logs -f
```

### Database Access

```bash
# Connect to PostgreSQL
ssh root@66.118.37.12
cd /home/epic-ai

docker compose -f docker-compose.api-only.yml exec postgres \
  psql -U epic -d epic_dev

# List agents
SELECT id, name, slug, status FROM agents LIMIT 10;

# Exit
\q
```

---

## Deployment Flow to Staging/Production

Once dev is working 100%:

```bash
# 1. Commit code
git add .
git commit -m "feat: working feature"
git push origin staging

# 2. Deploy to staging (separate VM)
# ... use docker-compose.staging.yml ...

# 3. After staging QA passes, merge to main
git checkout main
git pull origin staging
git push origin main

# 4. Production auto-deploys via DigitalOcean
# Monitor at: https://cloud.digitalocean.com/apps
```

---

## Troubleshooting

### API not accessible at dev.leads.epic.dm?

```bash
# 1. Check DNS resolution
nslookup dev.leads.epic.dm
# Should return: 66.118.37.12

# 2. Check if containers are running
ssh root@66.118.37.12
docker compose -f docker-compose.api-only.yml ps

# 3. Check nginx logs
docker compose -f docker-compose.api-only.yml logs nginx

# 4. Test locally on server
curl http://localhost/api/health
```

### Migrations failing?

```bash
# Check migration status
docker compose -f docker-compose.api-only.yml exec web \
  npx prisma migrate status

# View schema
docker compose -f docker-compose.api-only.yml exec web \
  npx prisma studio

# Check postgres
docker compose -f docker-compose.api-only.yml exec postgres \
  psql -U epic -d epic_dev -c "SELECT * FROM _prisma_migrations;"
```

### Database connection issues?

```bash
# Check database is healthy
docker compose -f docker-compose.api-only.yml exec postgres pg_isready -U epic

# Check connection string
docker compose -f docker-compose.api-only.yml config | grep DATABASE_URL

# Restart postgres
docker compose -f docker-compose.api-only.yml restart postgres
sleep 10
docker compose -f docker-compose.api-only.yml exec web npx prisma migrate deploy --skip-generate
```

### Out of disk space?

```bash
ssh root@66.118.37.12

# Check usage
docker system df

# Clean up
docker system prune -a --volumes

# Check again
df -h
```

---

## Your Architecture

```
┌─────────────────────────────────────────┐
│          Your Local PC                  │
│  Edit code → git push → auto-deploy     │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│  Vercel (Edge)   │  │  Your Server     │
│ dev.leads.epic.dm   │ 66.118.37.12     │
│  (Frontend)      │  │   (API/Backend)  │
│                  │  │                  │
│ - UI Components  │  │ - PostgreSQL     │
│ - Pages          │  │ - Redis          │
│ - API calls  ────┼──┼→ - Workers       │
│              │  │ - nginx (proxy)  │
└──────────────────┘  └──────────────────┘
```

Everything works independently but connected!

