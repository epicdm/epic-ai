# Epic AI 2.0 - Quick Reference Guide

> **One-page cheat sheet for power users**

---

## Getting Started (5 Minutes)

### 1️⃣ Sign Up & Onboarding
1. Go to **https://leads.epic.dm** → Sign up with Google/Email
2. Complete **5-Phase Flywheel Wizard**:
   - **UNDERSTAND**: Set Brand Brain (voice, audiences, pillars)
   - **CREATE**: Choose content preferences
   - **DISTRIBUTE**: Connect social accounts (OAuth)
   - **LEARN**: Enable analytics
   - **AUTOMATE**: Set up first workflow
3. You're done! Dashboard activates with live metrics

---

## The Dashboard (Your Command Center)

**URL**: `/dashboard`

### At-a-Glance Metrics
| Section | What It Shows |
|---------|---------------|
| **Flywheel Health** | 0-100% score (completeness of setup) |
| **Organic Metrics** | Impressions, engagements, avg. engagement rate |
| **Paid Metrics** | Ad spend, clicks, conversions, CPA |
| **Lead Stats** | Total leads, new, contacted, qualified, converted |
| **Voice AI** | Call count, minutes used, active agents |
| **AI Insights** | Top recommendations with confidence scores |

### Quick Actions
- **Create Content** → Generate AI posts
- **Schedule Post** → Publish now or later
- **New Lead** → Add manual lead
- **Create Agent** → Set up voice AI

---

## Creating Content (30 Seconds)

### Basic Flow
1. **Navigate**: `/dashboard/content/generate`
2. **Enter Topic**: "How to improve customer retention"
3. **Select Platforms**: ✅ Twitter, ✅ LinkedIn, ✅ Facebook, ✅ Instagram
4. **(Optional)** Add context sources (website, PDFs)
5. **Click "Generate with AI"**
6. **Review**: AI creates 4 platform-specific variations
7. **Approve** → Sends to publishing queue

### Platform Variations
- **Twitter**: 280 chars, punchy, casual
- **LinkedIn**: Professional, 3K chars, thought-leadership
- **Facebook**: Conversational, story-based
- **Instagram**: Visual-focused + auto-generated image + hashtags

---

## Publishing & Scheduling

### Manual Publish
1. Go to **Content Queue** (`/dashboard/content`)
2. Click post → **Publish Now**
3. Select accounts → **Confirm**
4. ✅ Published (see results in ~30 seconds)

### Auto-Schedule
1. Click **Schedule**
2. Choose:
   - **Specific time**: Pick date/time
   - **Optimal time**: AI chooses best time based on audience
3. **Save** → Cron job publishes automatically

### Publishing Status
- 🟡 **DRAFT** - Not yet approved
- 🟠 **PENDING** - Scheduled, waiting to publish
- 🟢 **PUBLISHED** - Live on platform
- 🔴 **FAILED** - Check error log

---

## Voice AI Agents

### Creating an Agent
1. **Navigate**: `/dashboard/voice/agents/new`
2. **Fill form**:
   - **Name**: "Sales Qualifier"
   - **Role**: Inbound lead qualification
   - **Personality**: Professional, friendly, efficient
   - **Knowledge Base**: Upload PDFs, link website
3. **Create conversation flow** (optional script)
4. **Test** → Call test number
5. **Activate** → Provision phone number

### Using Agents
- **Inbound Calls**: Agent answers, qualifies, logs
- **Outbound Calls**: Trigger via automation
- **Transfer to Human**: Agent says "Let me connect you"
- **Call Logs**: See all conversations in `/dashboard/voice/calls`

---

## Analytics & Insights

### Viewing Metrics
1. **Dashboard** → See high-level stats
2. **Analytics** (`/dashboard/analytics`) → Detailed view
3. **Time Periods**: 7d, 30d, 90d
4. **Filters**: Platform, content type, campaign

### AI Insights
**Where**: Dashboard → "AI Insights" panel

**Example Insights**:
> "LinkedIn posts on Tuesday 10am get 34% more engagement. Confidence: 87%"

> "Customer success stories outperform product features by 2.3x. Confidence: 92%"

**How it works**: AI analyzes all your data weekly, identifies patterns, saves to Brand Brain

---

## Cross-Channel Journeys

### Viewing Journeys
**URL**: `/dashboard/journeys`

**Shows**: Visual map of customer touchpoints
- Social post → Comment → Lead created → Voice call → Qualified → Converted

### Creating Journey Workflows
1. **Navigate**: `/dashboard/automations`
2. **New Automation**
3. **Trigger**: "Social post gets 10+ comments"
4. **Step 1**: Create lead from commenters
5. **Step 2**: Voice agent calls lead
6. **Step 3**: Log outcome to CRM
7. **Save** → Runs automatically

---

## Lead Management

### Adding Leads
**Manual**:
1. `/dashboard/leads` → **New Lead**
2. Fill form (name, email, phone, source)
3. **Save**

**Automatic**:
- Social comments → Auto-create lead
- Voice calls → Auto-log lead
- Ad clicks → Auto-track lead

### Lead Workflow
1. **New** → Just created
2. **Contacted** → Reached out (voice call, DM)
3. **Qualified** → Met criteria (budget, timeline, fit)
4. **Converted** → Became customer

---

## Brand Brain Settings

**URL**: `/dashboard/brand`

### Key Configurations
| Setting | Purpose | Example |
|---------|---------|---------|
| **Company Name** | Your brand name | "Epic AI" |
| **Industry** | Business category | "SaaS, Marketing Tech" |
| **Voice & Tone** | How AI writes | "Professional, friendly, innovative" |
| **Formality Level** | 1-5 scale | 3 (balanced) |
| **Audiences** | Target personas | "Marketing managers at SMBs" |
| **Content Pillars** | Topics you post about | "AI trends, case studies, tips" |
| **Competitors** | Companies to track | "HubSpot, Buffer, Jasper" |
| **Do Not Mention** | Banned topics | "Politics, religion" |
| **Must Mention** | Required themes | "Customer success, ROI" |

### Updating Brand Brain
- Settings are **live** → Next content generation uses new settings
- AI learns from performance → Suggestions appear in Insights

---

## Team Collaboration

### User Roles
| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, delete organization |
| **Admin** | Manage content, users, settings (no billing) |
| **Member** | Create/approve content, view analytics |
| **Viewer** | Read-only access |

### Inviting Team Members
1. `/dashboard/settings` → **Team**
2. **Invite User** → Enter email
3. Select role → **Send Invite**
4. User receives email → Accepts → Gains access

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Quick search |
| `Cmd/Ctrl + N` | New content |
| `Cmd/Ctrl + S` | Save draft |
| `Esc` | Close modal |
| `?` | Show shortcuts |

---

## Common Workflows

### Workflow 1: Daily Content Posting
```
1. /dashboard/content/generate
2. Enter topic → Generate
3. Review 4 variations → Approve
4. Schedule for optimal time → Save
5. Repeat 2-3x/day
```

### Workflow 2: Social Engagement → Lead
```
1. User comments on your post
2. Epic AI auto-creates lead
3. Voice agent calls lead within 5 min
4. Agent qualifies lead
5. Qualified lead appears in /dashboard/leads
6. Sales team follows up
```

### Workflow 3: Weekly Performance Review
```
1. /dashboard/analytics
2. Review top-performing content
3. Check AI Insights for recommendations
4. Update Brand Brain based on learnings
5. Plan next week's content around insights
```

---

## Troubleshooting

### Content Not Publishing
- **Check OAuth**: Go to `/dashboard/social/accounts` → Reconnect if expired
- **Check scheduling**: Ensure time is in future, not past
- **Check rate limits**: Some platforms limit posts/day (Twitter: 50, LinkedIn: 100)

### Voice Agent Not Answering
- **Check status**: `/dashboard/voice/agents` → Ensure "Active"
- **Check phone number**: Verify provisioned correctly
- **Test call**: Use test button to diagnose

### Analytics Not Updating
- **Wait 1 hour**: Metrics collected hourly via cron
- **Check API permissions**: Social accounts need "read insights" permission
- **Manual refresh**: Click "Sync Now" in `/dashboard/analytics`

### AI Insights Not Appearing
- **Minimum data**: Need 30+ posts to generate insights
- **Check Brand Brain**: Ensure setup is complete (100% health)
- **Wait 7 days**: Insights generated weekly

---

## Best Practices

### Content Creation
✅ **Do**:
- Use content pillars for consistency
- Add context sources (website, PDFs) for accuracy
- Review AI outputs before approving
- A/B test different tones and topics

❌ **Don't**:
- Copy-paste same content to all platforms
- Over-rely on AI without review
- Ignore analytics and insights
- Post off-brand topics

### Voice Agents
✅ **Do**:
- Train with knowledge base documents
- Test before activating
- Set clear conversation goals
- Enable transfer to human for complex issues

❌ **Don't**:
- Launch without testing
- Overpromise ("We can do everything!")
- Skip call logging/review
- Ignore customer feedback on agent quality

### Analytics
✅ **Do**:
- Check insights weekly
- Apply learnings to Brand Brain
- Track cross-channel journeys
- Measure ROI (time saved, leads generated)

❌ **Don't**:
- Obsess over vanity metrics (likes, follows)
- Ignore low-performing content patterns
- Change strategy too frequently (give AI time to learn)

---

## API & Integrations

### Available APIs
- **Content API**: `/api/content` (create, approve, schedule)
- **Social API**: `/api/social` (connect accounts, publish)
- **Voice API**: `/api/voice` (agents, calls)
- **Leads API**: `/api/leads` (CRUD operations)

### Webhooks
**Setup**: `/dashboard/settings` → **Webhooks**

**Events**:
- `content.published` → Fires when post goes live
- `lead.created` → New lead added
- `call.completed` → Voice call ends
- `insight.generated` → New AI insight

---

## Billing & Usage

### Viewing Usage
**URL**: `/dashboard/settings/billing`

**Shows**:
- Current plan (Starter, Pro, Agency)
- AI credits used (posts generated, voice minutes)
- Overages (if any)
- Next billing date

### Upgrading Plan
1. `/dashboard/settings/billing` → **Upgrade**
2. Select new plan
3. **Confirm** → Prorated billing

---

## Support

### Self-Help
- **Knowledge Base**: https://docs.epic.dm
- **Community**: https://community.epic.dm
- **Status Page**: https://status.epic.dm

### Contact Support
- **Email**: support@epic.dm (response: 24 hours)
- **Chat**: In-app chat (bottom right) (response: 4 hours)
- **Priority Support**: (Pro/Agency plans) - 1 hour response

---

## Keyboard-Accessible Navigation

| URL | Page |
|-----|------|
| `/dashboard` | Main dashboard |
| `/dashboard/content` | Content queue |
| `/dashboard/content/generate` | Create content |
| `/dashboard/social` | Social accounts |
| `/dashboard/voice` | Voice agents |
| `/dashboard/analytics` | Analytics |
| `/dashboard/leads` | Lead management |
| `/dashboard/automations` | Workflows |
| `/dashboard/brand` | Brand Brain |
| `/dashboard/calendar` | Publishing calendar |
| `/dashboard/settings` | Settings |

---

## Pro Tips

### 💡 Tip 1: Batch Content Creation
Create 7 days of content in one sitting:
1. List 7 topics
2. Generate all 7 → Approve all
3. Schedule throughout the week
4. **Result**: 28 posts (7 topics × 4 platforms) in 30 minutes

### 💡 Tip 2: Use Context Sources
Upload your:
- Latest whitepaper → AI references it
- Product docs → Accurate feature descriptions
- Customer testimonials → Real stories in content

### 💡 Tip 3: Monitor Synergy Rate
Check `/dashboard/journeys` for "Synergy Rate"
- **High (>60%)**: Channels work well together
- **Low (<30%)**: Optimize cross-channel workflows

### 💡 Tip 4: Train Voice Agents with FAQs
Upload a FAQ PDF to agent knowledge base → Agent answers common questions accurately

### 💡 Tip 5: Track Learning Loop Progress
Brand Brain improves weekly. Check "AI Insights" every Monday → Apply recommendations → Measure improvement

---

**Questions?** Email **support@epic.dm** or visit **https://docs.epic.dm**

*Last updated: January 2026*
