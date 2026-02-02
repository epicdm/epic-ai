# OpenClaw SaaS Redesign Plan

## Vision
Transform "Epic AI - AI Marketing Platform" into **OpenClaw — AI Agent Platform**
The core pivot: from marketing tool → agent builder + management platform

## What We Keep
- Next.js 16 + Clerk + Prisma + HeroUI stack (solid, works)
- Voice agent infrastructure (LiveKit, SIP, Magnus integration)
- Knowledge base management
- Lead management & analytics
- Content generation (reframed as agent skill)
- Brand brain (reframed as agent personality)
- Onboarding wizard (restructured)
- AI Assistant sidebar

## What Changes

### 1. Branding
- "Epic AI" → "OpenClaw"
- Logo: 🐾 OpenClaw (claw mark icon)
- Colors: Keep sky blue primary, add midnight accent
- Tagline: "AI Agents That Actually Work"
- Domain: ai.epic.dm → openclaw.ai (when ready)

### 2. Landing Page (Complete Redesign)
**Hero:** "Every Business Deserves an AI Team"
- Subtext: Build, deploy, and manage AI agents across voice, chat, and messaging
- CTA: Start Free / Watch Demo
- Social proof: "Powered by Caribbean telecom infrastructure"

**Feature Grid (4 cards):**
1. Voice Agents — AI that answers your phone, books appointments, qualifies leads
2. Multi-Channel — One agent, every channel: phone, WhatsApp, web chat, SMS, email
3. Skills Marketplace — Install capabilities like apps. Collections, scheduling, CRM sync
4. Your Infrastructure — Self-host or cloud. You own your data and agents

**How It Works (3 steps):**
1. Create an Agent — Name, personality, voice, instructions, knowledge base
2. Connect Channels — Assign a phone number, WhatsApp, web widget
3. Let It Work — Agent handles calls, captures leads, books meetings 24/7

**Pricing (4 tiers):**
- Free: Self-host, unlimited agents, BYOD
- Starter $97/mo: 1 managed agent, 1 DID, 500 min
- Business $497/mo: 5 agents, 5 DIDs, 3K min
- Agency $1,997/mo: Unlimited, white-label, 25 DIDs, 15K min

**Bottom CTA:** "Open source. Caribbean built. Global ambition."

### 3. Dashboard Navigation (Restructured)

**OLD: Flywheel (marketing-centric)**
Understand → Create → Distribute → Learn → Automate

**NEW: Agent-centric**
```
📊 Dashboard (overview: agents, calls, leads at a glance)

🤖 AGENTS
  ├── My Agents (list, create, manage)
  ├── Templates (pre-built agent configs)
  └── Knowledge Bases (shared across agents)

📞 CHANNELS
  ├── Phone Numbers (DIDs, SIP trunks)
  ├── Calls (history, recordings, transcripts)
  └── Messaging (WhatsApp, web chat — future)

📈 BUSINESS
  ├── Leads (captured by agents)
  ├── Analytics (call stats, conversion, usage)
  └── Content (AI-generated, social — kept but demoted)

⚡ AUTOMATE
  ├── Automations (workflows, triggers)
  └── Campaigns (outbound voice/sms)

⚙️ Settings
  ├── Organization
  ├── Brand & Voice (personality for agents)
  ├── Billing & Usage
  └── API Keys
```

### 4. Dashboard Main Page
- Active Agents count + status
- Today's calls + lead captures
- Minutes used / remaining
- Quick actions: Create Agent, View Calls, Check Leads
- Recent activity feed

### 5. Agent Builder (Enhanced)
Keep existing voice agent form but restructure:
- Step 1: Identity (name, role, personality)
- Step 2: Voice & Language (voice selection, accent, language)
- Step 3: Instructions (system prompt, behaviors, escalation rules)
- Step 4: Knowledge (attach knowledge bases, documents)
- Step 5: Channels (assign phone number, web widget)
- Step 6: Test & Deploy

## Implementation Order

### Phase 1: Rebrand + Landing (this PR)
1. ✅ Find/replace Epic AI → OpenClaw in key files
2. ✅ Redesign landing page
3. ✅ Update metadata, title, description
4. ✅ Update brand colors if needed

### Phase 2: Dashboard Restructure
1. Restructure sidebar navigation
2. Redesign dashboard main page
3. Move voice to top-level "Agents"
4. Add Channels section

### Phase 3: Bug Fixes
1. Voice agent org-context null bug
2. Clean up raw SQL workaround
3. Fix any broken social setup flows

### Phase 4: New Features
1. Agent templates gallery
2. Usage/billing dashboard
3. API keys management
4. Web chat widget embed
