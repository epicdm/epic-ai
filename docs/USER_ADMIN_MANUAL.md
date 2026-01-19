# Epic AI 2.0 - Complete User & Admin Manual

**Version 2.0 | Last Updated: January 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Brand Brain Configuration](#4-brand-brain-configuration)
5. [Content Creation & Management](#5-content-creation--management)
6. [Social Media Management](#6-social-media-management)
7. [Publishing & Scheduling](#7-publishing--scheduling)
8. [Voice AI System](#8-voice-ai-system)
9. [Analytics & Reporting](#9-analytics--reporting)
10. [Lead Management](#10-lead-management)
11. [Automation & Workflows](#11-automation--workflows)
12. [Cross-Channel Journeys](#12-cross-channel-journeys)
13. [Paid Advertising](#13-paid-advertising)
14. [Team Collaboration](#14-team-collaboration)
15. [Settings & Configuration](#15-settings--configuration)
16. [API Reference](#16-api-reference)
17. [Admin Functions](#17-admin-functions)
18. [Troubleshooting](#18-troubleshooting)
19. [Best Practices](#19-best-practices)
20. [FAQ](#20-faq)

---

## 1. Introduction

### 1.1 What is Epic AI?

Epic AI 2.0 is a **self-improving AI marketing platform** that unifies social media management, content generation, voice automation, analytics, and customer journey tracking into a single intelligent system.

### 1.2 The Flywheel Architecture

Epic AI operates on a **5-phase flywheel model** where each phase feeds into the next:

```
┌────────────────────────────────────────────────────────┐
│                  THE EPIC AI FLYWHEEL                  │
├────────────────────────────────────────────────────────┤
│  PHASE 1: UNDERSTAND → Set up your Brand Brain        │
│  PHASE 2: CREATE → Generate AI-powered content        │
│  PHASE 3: DISTRIBUTE → Publish across platforms       │
│  PHASE 4: LEARN → Collect metrics and analyze         │
│  PHASE 5: AUTOMATE → Create intelligent workflows     │
│                                                        │
│  Output of Phase 5 → Improves Phase 1 (Learning Loop) │
└────────────────────────────────────────────────────────┘
```

**Key Benefit**: The system gets smarter over time. More usage = better insights = better content = more engagement.

### 1.3 Core Capabilities

- ✅ AI content generation for Twitter, LinkedIn, Facebook, Instagram
- ✅ Native OAuth connections (no third-party dependencies)
- ✅ Auto-scheduling with optimal time detection
- ✅ AI voice agents for customer calls
- ✅ Cross-channel journey mapping
- ✅ Unified analytics and AI-powered insights
- ✅ Lead management CRM
- ✅ Workflow automation
- ✅ Paid ads management (Meta, Google)
- ✅ Team collaboration with role-based access

### 1.4 System Requirements

**Browser Support**:
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Internet Connection**: Broadband (10+ Mbps recommended)

**Devices**: Desktop, laptop, tablet (iPad Pro+), mobile (iOS 14+, Android 10+)

---

## 2. Getting Started

### 2.1 Account Creation

1. **Navigate** to https://leads.epic.dm
2. Click **Sign Up**
3. Choose sign-up method:
   - **Google**: One-click OAuth
   - **Email**: Enter email → Verify via code → Set password
4. **Create Organization**:
   - Enter organization name (e.g., "Acme Corp")
   - Select industry from dropdown
   - (Optional) Invite team members

### 2.2 Initial Onboarding (15 Minutes)

After account creation, the **5-Phase Flywheel Wizard** launches automatically.

#### Phase 1: UNDERSTAND (Brand Brain Setup)

**Step 1: Basic Information**
- Company name
- Industry (dropdown: SaaS, E-commerce, Agency, etc.)
- Website URL
- Mission statement (AI helps generate if blank)

**Step 2: Voice & Tone**
- Select tone attributes (check all that apply):
  - ✅ Professional
  - ✅ Friendly
  - ✅ Innovative
  - □ Witty
  - □ Serious
  - □ Playful
- Set formality level (1-5 slider):
  - 1 = Very casual ("Hey! 👋")
  - 3 = Balanced
  - 5 = Very formal ("Dear Sir/Madam,")
- Sarcasm level (0-3):
  - 0 = None
  - 1 = Subtle
  - 3 = Heavy

**Step 3: Audiences**
- Define 1-3 target personas:
  - **Name**: "Marketing Mary"
  - **Description**: CMO at SMB SaaS companies
  - **Age range**: 30-45
  - **Pain points**: Limited budget, need to show ROI
  - **Goals**: Increase leads, improve conversion rate
- Mark primary audience

**Step 4: Content Pillars**
- Create 3-5 content themes:
  - **Name**: "Customer Success Stories"
  - **Description**: Real results from our customers
  - **Topics**: Case studies, testimonials, ROI stats
  - **Frequency**: 30% of content
  - **Color**: (for calendar visualization)
- Enable/disable pillars

**Step 5: Competitors**
- Add 3-5 competitors:
  - **Name**: "HubSpot"
  - **Website**: hubspot.com
  - **Strengths**: Brand recognition, ecosystem
  - **Weaknesses**: Expensive, complexity
  - **How we're different**: AI-first, all-in-one pricing

**Step 6: Content Preferences**
- **Emoji usage**: Never / Rarely / Sometimes / Often
- **Hashtag style**: None / Minimal (1-2) / Moderate (3-5) / Heavy (6+)
- **Must mention**: Keywords to always include (e.g., "ROI", "AI-powered")
- **Do not mention**: Topics to avoid (e.g., "politics", "religion")

**Result**: Brand Brain configured (33% flywheel complete)

---

#### Phase 2: CREATE (Content Factory Setup)

**Step 1: Context Sources**
- Add external knowledge sources:
  - **Website scraping**: Enter URL → AI crawls and extracts
  - **RSS feeds**: Blog feed URL for latest posts
  - **Document upload**: Upload PDFs (whitepapers, case studies)
  - **Manual notes**: Paste text directly

**Step 2: Content Calendar Preferences**
- Default posting frequency (e.g., 5x/week)
- Preferred posting times (AI suggests based on audience)
- Content mix (% per pillar)

**Step 3: Image Generation Settings**
- Enable auto-image generation for Instagram (DALL-E 3)
- Image style preference (realistic, illustrated, abstract)

**Result**: Content Factory ready (53% flywheel complete)

---

#### Phase 3: DISTRIBUTE (Social Connections)

**Connect Platforms** (OAuth flow):

**Twitter/X**:
1. Click **Connect Twitter**
2. Redirects to twitter.com
3. Authorize Epic AI app
4. Callback → Account connected ✅
5. Displays: @username, follower count, profile image

**LinkedIn**:
1. Click **Connect LinkedIn**
2. Choose account type:
   - Personal profile
   - Company page
3. Authorize
4. Callback → Connected ✅

**Facebook**:
1. Click **Connect Facebook**
2. Log in to Facebook
3. Select **Pages** to grant access (can select multiple)
4. Authorize
5. Callback → Pages connected ✅

**Instagram**:
1. ⚠️ Must connect **Facebook first** (Instagram uses Facebook API)
2. Click **Connect Instagram**
3. Select Instagram Business accounts linked to your Facebook pages
4. Authorize
5. Callback → Connected ✅

**Result**: Social accounts connected (73% flywheel complete)

---

#### Phase 4: LEARN (Analytics Setup)

**Step 1: Enable Metrics Collection**
- ✅ Impressions
- ✅ Reach
- ✅ Engagements (likes, comments, shares)
- ✅ Click-through rate
- ✅ Follower growth

**Step 2: Set Collection Frequency**
- Default: Every hour (recommended)
- Options: 30 min, 1 hour, 6 hours, daily

**Step 3: Enable AI Insights**
- ✅ Weekly pattern analysis
- ✅ Content performance scoring
- ✅ Optimal time recommendations
- ✅ Topic suggestions

**Result**: Analytics active (87% flywheel complete)

---

#### Phase 5: AUTOMATE (Workflow Setup)

**Step 1: Create First Automation**

**Example**: "Social Engagement → Lead"

1. **Trigger**: "Social post gets comment"
2. **Condition**: "Comment contains question mark OR 'interested'"
3. **Action 1**: Create lead from commenter
4. **Action 2**: Send auto-reply DM
5. **Action 3**: (Optional) Trigger voice call

**Step 2: Enable Autopilot**
- ✅ Auto-respond to comments
- ✅ Auto-create leads from high-engagement users
- ✅ Auto-schedule content at optimal times

**Result**: Flywheel activated (100% complete) 🎉

---

### 2.3 Post-Onboarding

After completing the wizard:
- Dashboard activates with live metrics
- AI begins collecting data
- First insights appear after 7 days (minimum 30 posts)
- Learning loop starts improving content quality

---

## 3. Dashboard Overview

**URL**: `/dashboard`

### 3.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo | Search | Notifications | Profile        │
├──────────────┬──────────────────────────────────────────┤
│              │  MAIN CONTENT AREA                       │
│   SIDEBAR    │  ┌────────────────────────────────────┐  │
│              │  │ Flywheel Health Score: 87%         │  │
│   - Dashboard│  │ [Progress bar]                     │  │
│   - Content  │  └────────────────────────────────────┘  │
│   - Social   │                                          │
│   - Voice    │  ┌─────────────┬─────────────┐          │
│   - Analytics│  │  ORGANIC    │   PAID      │          │
│   - Leads    │  │  Metrics    │   Metrics   │          │
│   - Settings │  └─────────────┴─────────────┘          │
│              │                                          │
│              │  AI INSIGHTS PANEL                       │
│              │  Recent Activity Feed                    │
└──────────────┴──────────────────────────────────────────┘
```

### 3.2 Key Dashboard Sections

#### A. Flywheel Health Score

**What it shows**: 0-100% completeness of flywheel setup

**Components**:
- Brand Brain setup (20%)
- Social accounts connected (20%)
- Content created (20%)
- Analytics active (20%)
- Automations running (20%)

**Color coding**:
- 🔴 0-30%: Critical (setup incomplete)
- 🟡 31-69%: Warning (partial setup)
- 🟢 70-100%: Healthy (fully operational)

#### B. Quick Actions Bar

- **+ Create Content** → `/dashboard/content/generate`
- **📅 Schedule Post** → Opens scheduling modal
- **👤 New Lead** → `/dashboard/leads?action=new`
- **🤖 Create Agent** → `/dashboard/voice/agents/new`

#### C. Organic Metrics Card

| Metric | Definition | Time Period |
|--------|------------|-------------|
| **Impressions** | Times content was displayed | Last 30d |
| **Engagements** | Likes + comments + shares + clicks | Last 30d |
| **Engagement Rate** | Engagements ÷ Impressions × 100 | Last 30d |
| **Followers** | Total across all platforms | Current |
| **Follower Growth** | New followers in period | Last 30d |

#### D. Paid Metrics Card

| Metric | Definition |
|--------|------------|
| **Ad Spend** | Total spent on Meta + Google Ads |
| **Clicks** | Clicks on ads |
| **CTR** | Click-through rate (clicks ÷ impressions) |
| **Conversions** | Goal completions (purchase, signup, etc.) |
| **CPA** | Cost per acquisition (spend ÷ conversions) |

#### E. Lead Stats Card

| Metric | Definition |
|--------|------------|
| **Total Leads** | All-time lead count |
| **New** | Leads created this period |
| **Contacted** | Leads reached out to |
| **Qualified** | Leads meeting criteria |
| **Converted** | Leads who became customers |
| **Organic vs. Paid** | Breakdown by source |

#### F. Voice AI Card

| Metric | Definition |
|--------|------------|
| **Calls This Period** | Inbound + outbound calls |
| **Minutes Used** | Total talk time |
| **Active Agents** | Number of agents live |
| **Avg. Call Duration** | Mean call length |

#### G. Cross-Channel Synergy

| Metric | Definition |
|--------|------------|
| **Journeys Active** | Multi-channel customer paths tracked |
| **Multi-Channel Campaigns** | Campaigns spanning 2+ channels |
| **Synergy Rate** | % of leads touched via multiple channels |

**Synergy Rate Interpretation**:
- 60%+ = Excellent (channels working together well)
- 40-59% = Good (moderate integration)
- <40% = Needs work (siloed channels)

#### H. AI Insights Panel

**Example Insights**:
```
💡 Top Insight (Confidence: 92%)
"LinkedIn posts published on Tuesday at 10am receive 34% more
engagement than your average. Recommendation: Shift 40% of
LinkedIn content to this time slot."

💡 Content Performance (Confidence: 87%)
"Customer success stories outperform product feature posts by
2.3x. Increase 'Customer Stories' pillar from 20% to 35% of
content mix."

💡 Voice AI (Confidence: 78%)
"Leads who receive a voice call within 5 minutes of social
engagement convert at 3.1x rate. Enable auto-call trigger."
```

**Insight Actions**:
- **Apply Now**: AI updates settings automatically
- **Schedule**: Apply on specific date
- **Dismiss**: Ignore this insight

#### I. Recent Activity Feed

**Real-time timeline** of:
- ✅ Published posts (with platform icons)
- 📞 Voice calls (agent name, duration, outcome)
- 👤 New leads (source, status)
- 📊 Milestones reached (e.g., "1,000 followers on Twitter")

**Filters**: All / Posts / Calls / Leads / Insights

---

## 4. Brand Brain Configuration

**URL**: `/dashboard/brand`

### 4.1 Brand Brain Overview

The **Brand Brain** is the core intelligence that powers all AI content generation. It stores:
- Brand identity (mission, values, voice)
- Target audiences and personas
- Content pillars and themes
- Competitor intelligence
- AI-generated learnings (from analytics)

**Think of it as**: Teaching the AI to "think like your brand."

### 4.2 Editing Brand Information

#### Basic Info Tab

**Fields**:
- **Company Name**: Legal or brand name
- **Industry**: Dropdown selection (affects AI prompts)
- **Website**: Main URL (used for context scraping)
- **Mission Statement**: 1-2 sentences (AI uses for content framing)
- **Core Values**: 3-5 values (e.g., "Innovation, Transparency, Customer-first")
- **Unique Selling Points**: What makes you different (bullets)

**Editing**:
1. Click **Edit** button
2. Modify fields
3. **Save Changes**
4. ✅ Updates apply to next content generation

---

#### Voice & Tone Tab

**Voice Attributes** (multi-select):
- □ Professional
- □ Friendly
- □ Innovative
- □ Witty
- □ Serious
- □ Playful
- □ Authoritative
- □ Conversational

**Formality Level** (1-5 slider):
```
1           2           3           4           5
Casual      Relaxed     Balanced    Formal      Very Formal

"Hey!"      "Hi there!" "Hello,"    "Greetings," "Dear Sir/Madam,"
```

**Writing Style** (dropdown):
- Direct & concise
- Descriptive & detailed
- Storytelling
- Data-driven
- Inspirational

**Custom Voice Instructions** (optional):
```
Free-text field for specific guidance:
"Always use 'we' instead of 'I'. Avoid jargon. Use analogies
to explain complex concepts. End with actionable takeaway."
```

**Sarcasm/Humor Level** (0-3):
- 0 = None (straight content)
- 1 = Subtle (occasional wit)
- 2 = Moderate (playful tone)
- 3 = Heavy (comedy-forward)

---

#### Emoji & Hashtag Settings

**Emoji Usage**:
- **Never**: No emojis in content
- **Rarely**: Only in Instagram
- **Sometimes**: 1-2 per post
- **Often**: 3-5 per post (Twitter, Instagram)

**Emoji Frequency Override by Platform**:
```
Twitter:    ██████░░░░ 6/10
LinkedIn:   ██░░░░░░░░ 2/10 (professional)
Facebook:   ████░░░░░░ 4/10
Instagram:  ██████████ 10/10 (visual platform)
```

**Hashtag Style**:
- **None**: No hashtags
- **Minimal**: 1-2 highly relevant
- **Moderate**: 3-5 mix of broad + niche
- **Heavy**: 6-10 (Instagram strategy)

**Preferred Hashtags** (comma-separated):
```
#SaaS, #MarketingAutomation, #AIMarketing, #GrowthHacking
```

**Banned Hashtags** (avoid these):
```
#FollowForFollow, #Spam, #Bitcoin (if not relevant)
```

---

#### Content Preferences Tab

**Must Mention** (keywords/topics to always include):
```
- AI-powered
- ROI-focused
- Customer success
- Data-driven
```
AI will naturally weave these into content.

**Do Not Mention** (topics to avoid):
```
- Politics
- Religion
- Controversial social issues
- Competitor names (unless strategy requires it)
```
AI filters out these topics during generation.

**Call-to-Action Style**:
- **Soft**: "Learn more in our bio"
- **Medium**: "Download our free guide"
- **Strong**: "Book a demo now - limited slots"
- **None**: Avoid CTAs (pure value content)

**CTA Frequency**: Every post / Every 3rd post / Weekly

---

### 4.3 Managing Audiences (Personas)

**URL**: `/dashboard/brand/audiences`

#### Creating an Audience

1. Click **+ New Audience**
2. Fill form:

**Basic Info**:
- **Name**: "Marketing Mary" (internal nickname)
- **Description**: "CMO at SMB SaaS company, responsible for demand gen"
- **Mark as Primary**: ✅ (AI prioritizes this audience)

**Demographics**:
- **Age Range**: 30-45 (dropdown)
- **Gender**: All / Male / Female / Non-binary
- **Location**: United States, Canada (multi-select)
- **Job Titles**: CMO, VP Marketing, Marketing Director (comma-separated)
- **Industries**: SaaS, Technology, Software (multi-select)

**Psychographics**:
- **Interests**: Marketing automation, analytics, AI tools
- **Pain Points**:
  - Limited budget
  - Need to prove ROI
  - Overwhelmed by tool sprawl
  - Lack of technical skills
- **Goals**:
  - Increase qualified leads by 30%
  - Reduce marketing tool costs
  - Improve team efficiency
  - Show measurable ROI to CEO

**Media Consumption**:
- **Platforms**: LinkedIn (primary), Twitter, industry blogs
- **Content Types**: Case studies, how-to guides, webinars
- **Influencers**: Neil Patel, Ann Handley, Seth Godin

3. **Save Audience**

**Using Audiences**:
- AI generates content tailored to primary audience by default
- Can select specific audience when creating content
- Insights show performance by audience segment

---

### 4.4 Managing Content Pillars

**URL**: `/dashboard/brand/pillars`

#### What are Content Pillars?

**Content pillars** are the 3-5 core themes your brand posts about. They ensure content consistency and strategic focus.

**Example Pillars for a SaaS Company**:
1. **Product Updates** (20%) - New features, roadmap
2. **Customer Success Stories** (30%) - Case studies, testimonials
3. **Industry Insights** (25%) - Trends, analysis, thought leadership
4. **How-To Guides** (15%) - Tutorials, tips, best practices
5. **Company Culture** (10%) - Behind-the-scenes, team spotlights

#### Creating a Pillar

1. Click **+ New Pillar**
2. Fill form:

**Basic Info**:
- **Name**: "Customer Success Stories"
- **Description**: "Real results from our customers to build trust and show ROI"
- **Color**: 🟢 Green (for calendar visualization)

**Topics** (sub-themes):
```
- Case studies
- Video testimonials
- ROI statistics
- Before/after comparisons
- Customer quotes
```

**Content Mix**:
- **Target Frequency**: 30% (AI aims for this % of total content)
- **Minimum per week**: 2 posts
- **Platforms**: All / Specific (e.g., LinkedIn + Facebook only)

**Pillar Status**:
- ✅ **Active**: AI generates content for this pillar
- □ **Paused**: Temporarily disabled

3. **Save Pillar**

**Pillar Performance**:
- Dashboard shows engagement rate per pillar
- AI recommends shifting % based on performance

---

### 4.5 Competitor Tracking

**URL**: `/dashboard/brand/competitors`

#### Adding Competitors

1. Click **+ Add Competitor**
2. Fill form:

**Basic Info**:
- **Company Name**: "HubSpot"
- **Website**: hubspot.com
- **Description**: "All-in-one marketing, sales, and CRM platform"

**Competitive Analysis**:
- **Their Strengths**:
  - Brand recognition (market leader)
  - Comprehensive ecosystem
  - Large knowledge base
- **Their Weaknesses**:
  - Expensive ($800+/month)
  - Complex setup
  - Overkill for SMBs
- **How We're Different**:
  - AI-first (they're adding AI, we're built on AI)
  - All-in-one pricing (we replace 4+ tools)
  - 10x faster setup
  - Voice AI included (they don't have it)

**Social Monitoring**:
- ✅ **Track their content**: AI monitors their posts
- ✅ **Alert on product launches**: Email notification
- ✅ **Compare engagement**: Show our metrics vs. theirs

3. **Save Competitor**

**Using Competitor Data**:
- AI suggests content angles that differentiate
- Insights show topic gaps (what they're not talking about)
- Competitive benchmarking in analytics

---

### 4.6 Brand Learnings (AI-Generated)

**URL**: `/dashboard/brand/learnings`

#### What are Learnings?

**Brand Learnings** are AI-generated insights saved to the Brand Brain. As Epic AI analyzes your performance, it discovers patterns and saves them for future content generation.

**Example Learnings**:
```
📚 Learning #1 (Confidence: 94%, Saved: Jan 15, 2026)
"Posts featuring customer ROI statistics generate 3.2x more
engagement than feature announcements. Prioritize data-driven
success stories."

📚 Learning #2 (Confidence: 89%, Saved: Jan 12, 2026)
"Content published on Tuesday 10am outperforms other time slots
by 34%. Optimal posting window: Tue/Wed 10-11am EST."

📚 Learning #3 (Confidence: 82%, Saved: Jan 8, 2026)
"Short-form content (under 100 words) on Twitter drives 40% more
replies. Use for engagement-focused content."
```

**Learning Lifecycle**:
1. **Generated**: AI discovers pattern (weekly analysis)
2. **Proposed**: Shown in "AI Insights" panel
3. **Applied**: User approves → Saved to Brand Brain
4. **Active**: AI uses learning in future content
5. **Validated**: Continuous testing (confidence score updates)
6. **Archived**: If no longer valid (e.g., algorithm change)

**Viewing Learnings**:
- **All Learnings**: Full list with confidence scores
- **Active**: Currently being used
- **Archived**: Deprecated learnings

**Editing Learnings**:
- **Disable**: Temporarily stop using
- **Edit**: Modify text (if AI got it wrong)
- **Delete**: Remove permanently

---

## 5. Content Creation & Management

**URL**: `/dashboard/content`

### 5.1 Content Queue Overview

The **Content Queue** displays all content across states:
- **Drafts**: Saved but not approved (🟡 yellow badge)
- **Pending**: Scheduled for future publishing (🟠 orange badge)
- **Published**: Live on platforms (🟢 green badge)
- **Failed**: Publishing failed (🔴 red badge)

**Queue View**:
```
┌─────────────────────────────────────────────────────────┐
│  FILTERS: [All] [Drafts] [Pending] [Published] [Failed]│
│  SORT BY: [Newest] [Oldest] [Scheduled Time]           │
├─────────────────────────────────────────────────────────┤
│  📄 Post Title                          🟡 DRAFT        │
│  "How to improve customer retention with AI"           │
│  🐦 Twitter | 💼 LinkedIn | 📘 Facebook | 📸 Instagram │
│  Created: Jan 15, 2026 | Author: You                   │
│  [Edit] [Schedule] [Delete]                            │
├─────────────────────────────────────────────────────────┤
│  📄 Post Title                          🟠 PENDING      │
│  "5 marketing automation trends for 2026"               │
│  Scheduled: Jan 18, 2026 at 10:00am EST                │
│  [View] [Reschedule] [Cancel]                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Creating Content with AI

**URL**: `/dashboard/content/generate`

#### Step-by-Step Content Generation

**Step 1: Enter Topic**
```
┌────────────────────────────────────────────────────────┐
│  What do you want to create content about?            │
│  ┌──────────────────────────────────────────────────┐ │
│  │ How to improve customer retention with AI        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  💡 Or select from content pillars:                   │
│  [Customer Success Stories] [Industry Insights]       │
└────────────────────────────────────────────────────────┘
```

**Step 2: Select Target Platforms**
```
Select where you want to publish:

☑️ Twitter/X
   • Character limit: 280
   • Style: Punchy, casual, thread-capable

☑️ LinkedIn
   • Character limit: 3,000
   • Style: Professional, thought-leadership

☑️ Facebook
   • Character limit: 63,206
   • Style: Conversational, story-based

☑️ Instagram
   • Character limit: 2,200
   • Style: Visual-first, emoji-friendly
   • ⚠️ Auto-generates image with DALL-E 3
```

**Step 3: (Optional) Add Context**
```
Make content more relevant by adding context:

📄 Reference Documents:
   [Upload PDF] [Add Website] [Add Note]

   Selected:
   ✅ Company whitepaper: "AI in Marketing 2026"
   ✅ Blog post: leads.epic.dm/blog/customer-retention

💡 AI will reference these sources for accurate, on-brand content
```

**Step 4: (Optional) Advanced Settings**
```
┌── Advanced Settings ────────────────────────────────────┐
│                                                         │
│  Target Audience:                                       │
│  ○ Primary Audience (Marketing Mary)                   │
│  ○ All Audiences                                        │
│  ○ Custom: [Select specific audience]                  │
│                                                         │
│  Content Pillar:                                        │
│  [Customer Success Stories ▾]                           │
│                                                         │
│  Tone Override:                                         │
│  ○ Use Brand Brain defaults (recommended)              │
│  ○ More casual                                          │
│  ○ More professional                                    │
│                                                         │
│  Length:                                                │
│  ○ Auto (platform-optimized)                           │
│  ○ Short (quick read)                                   │
│  ○ Long (in-depth)                                      │
│                                                         │
│  Include:                                               │
│  ☑️ Call-to-action                                      │
│  ☑️ Hashtags (platform-optimized)                       │
│  ☐ Statistics/data points                              │
│  ☐ Questions (boost engagement)                         │
└─────────────────────────────────────────────────────────┘
```

**Step 5: Generate**
```
Click [Generate with AI]

⏳ AI is working...
   ✅ Analyzing Brand Brain
   ✅ Pulling context from sources
   ✅ Generating Twitter version
   ✅ Generating LinkedIn version
   ✅ Generating Facebook version
   ✅ Generating Instagram version
   ✅ Creating Instagram image

Done! (3.2 seconds)
```

---

#### Generated Content Preview

**Twitter Version** (280 chars):
```
┌────────────────────────────────────────────────────────┐
│  🐦 TWITTER                                      [Edit]│
├────────────────────────────────────────────────────────┤
│  Want to keep customers for life? 🚀                  │
│                                                        │
│  AI-powered retention strategies can:                  │
│  • Predict churn before it happens                     │
│  • Personalize outreach at scale                       │
│  • Automate check-ins without feeling robotic          │
│                                                        │
│  Our customers see 3x better retention rates.          │
│                                                        │
│  #AIMarketing #CustomerRetention #SaaS                 │
│                                                        │
│  Character count: 247/280 ✅                           │
│  Hashtag count: 3 ✅                                   │
└────────────────────────────────────────────────────────┘
```

**LinkedIn Version** (1,200 chars):
```
┌────────────────────────────────────────────────────────┐
│  💼 LINKEDIN                                     [Edit]│
├────────────────────────────────────────────────────────┤
│  How to Improve Customer Retention with AI             │
│  ────────────────────────────────────────────          │
│                                                        │
│  Customer acquisition is expensive. Retention is       │
│  where the real ROI lives.                             │
│                                                        │
│  Here's how AI is transforming customer retention      │
│  for modern SaaS companies:                            │
│                                                        │
│  1. Predictive Churn Analysis                          │
│  AI analyzes usage patterns to identify at-risk        │
│  customers before they churn. Our system flags         │
│  accounts with 87% accuracy, giving your team time     │
│  to intervene.                                         │
│                                                        │
│  2. Hyper-Personalized Outreach                        │
│  Generic "how are you doing?" emails don't work.       │
│  AI crafts personalized messages based on product      │
│  usage, industry, and pain points.                     │
│                                                        │
│  3. Automated (But Human) Check-Ins                    │
│  Voice AI agents can call customers, ask about         │
│  satisfaction, and escalate to humans when needed.     │
│  No more manual follow-ups.                            │
│                                                        │
│  The results speak for themselves:                     │
│  • 3.1x improvement in retention rates                 │
│  • 40% reduction in churn                              │
│  • 2x increase in upsell opportunities                 │
│                                                        │
│  What retention strategies are working for you?        │
│                                                        │
│  #CustomerSuccess #AIMarketing #SaaS                   │
│                                                        │
│  Character count: 1,187/3,000 ✅                       │
└────────────────────────────────────────────────────────┘
```

**Facebook Version** (800 chars):
```
┌────────────────────────────────────────────────────────┐
│  📘 FACEBOOK                                     [Edit]│
├────────────────────────────────────────────────────────┤
│  Ever wonder why some companies keep customers for     │
│  years while others struggle with churn? 🤔             │
│                                                        │
│  The secret isn't a magic formula—it's AI-powered      │
│  retention strategies that make every customer feel    │
│  valued.                                               │
│                                                        │
│  Here's what we've learned helping 500+ companies:     │
│                                                        │
│  ✨ AI predicts churn before it happens (87% accuracy) │
│  ✨ Personalized outreach that doesn't feel robotic    │
│  ✨ Automated check-ins via voice AI (customers love it)│
│                                                        │
│  One of our customers went from 60% annual retention   │
│  to 94% in just 6 months using these strategies.       │
│                                                        │
│  Want to learn how? Drop a comment or DM us! 👇        │
│                                                        │
│  Character count: 721/63,206 ✅                        │
└────────────────────────────────────────────────────────┘
```

**Instagram Version** (2,200 chars + image):
```
┌────────────────────────────────────────────────────────┐
│  📸 INSTAGRAM                                    [Edit]│
├────────────────────────────────────────────────────────┤
│  [AI-Generated Image Preview]                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [Abstract illustration showing customer journey  │ │
│  │   with AI elements - modern, colorful design]    │ │
│  └──────────────────────────────────────────────────┘ │
│  [Regenerate Image]                                    │
│                                                        │
│  Caption:                                              │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Want customers who stick around for years? 💙          │
│                                                        │
│  Here's the truth: Keeping customers is 5x cheaper    │
│  than finding new ones. But most companies get it      │
│  wrong. 😬                                             │
│                                                        │
│  ✨ The AI advantage:                                  │
│  • Predict who's about to leave (before they do!)      │
│  • Send perfectly timed, personal messages             │
│  • Call customers automatically (yes, really!)         │
│                                                        │
│  Our customers see 3x better retention. 📈             │
│                                                        │
│  Drop a 🚀 if you want to learn how!                   │
│                                                        │
│  #AIMarketing #CustomerRetention #SaaS #MarketingTech  │
│  #GrowthHacking #CustomerSuccess #Automation           │
│                                                        │
│  Character count: 631/2,200 ✅                         │
│  Hashtag count: 7 ✅                                   │
└────────────────────────────────────────────────────────┘
```

---

#### Content Actions

**For each variation, you can**:

1. **Edit**:
   - Click [Edit] button
   - Modify text directly in editor
   - Adjust hashtags, emojis, CTAs
   - Save changes

2. **Regenerate**:
   - Click [🔄 Regenerate]
   - AI creates new version with same topic
   - Useful if you don't like first attempt

3. **Regenerate Image** (Instagram only):
   - Click [Regenerate Image]
   - AI creates new visual with different style
   - Options: Realistic / Illustrated / Abstract

4. **Delete Variation**:
   - Click [❌ Delete]
   - Removes this platform version
   - Doesn't affect other platforms

---

### 5.3 Approving & Saving Content

After reviewing all variations:

**Option 1: Save as Draft**
- Click [💾 Save as Draft]
- Content stored in queue (not published)
- Can edit/schedule later

**Option 2: Approve & Schedule**
- Click [✅ Approve & Schedule]
- Opens scheduling modal (see Section 7)

**Option 3: Discard**
- Click [🗑️ Discard All]
- Deletes all variations
- (Cannot undo)

---

### 5.4 Batch Content Generation

**Feature**: Generate multiple pieces of content at once.

**Use Case**: Create a week's worth of content in one session.

**Steps**:
1. Navigate to `/dashboard/content/batch-generate`
2. Enter topics (one per line):
   ```
   How to improve customer retention with AI
   5 marketing automation trends for 2026
   Why voice AI is the next big thing
   Case study: How we 3x'd conversion rates
   Behind the scenes: Our product development process
   ```
3. Select platforms: ✅ All
4. Click [Generate All]
5. AI generates 5 topics × 4 platforms = **20 pieces of content**
6. Review all in one interface
7. **Bulk actions**:
   - Select all → Approve → Schedule throughout week
   - Or review individually

**Time savings**: 20 posts in ~10 minutes (vs. 3-4 hours manually)

---

### 5.5 Content Templates

**Feature**: Save reusable content structures.

**Use Case**: Weekly newsletter, monthly product update, event promotion.

**Creating a Template**:
1. `/dashboard/content/templates` → [+ New Template]
2. Fill form:
   - **Name**: "Weekly Newsletter"
   - **Platforms**: LinkedIn, Facebook
   - **Structure**:
     ```
     [Intro hook]

     This week's highlights:
     • [Bullet 1]
     • [Bullet 2]
     • [Bullet 3]

     [Call-to-action]

     #[Hashtag1] #[Hashtag2]
     ```
3. Save template

**Using a Template**:
1. Content generation → [Templates] dropdown
2. Select "Weekly Newsletter"
3. AI fills in bracketed sections with real content
4. Review & publish

---

### 5.6 Content Calendar View

**URL**: `/dashboard/calendar`

**Visual month calendar** showing all scheduled content:

```
┌─────────────────────────────────────────────────────────┐
│  JANUARY 2026                           [Week] [Month]  │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────┤
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun          │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────┤
│  13  │  14  │  15  │  16  │  17  │  18  │  19          │
│      │      │ 🐦10a│ 🐦10a│ 💼10a│      │              │
│      │      │ 📘2p │ 💼2p │      │      │              │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────┤
│  20  │  21  │  22  │  23  │  24  │  25  │  26          │
│ 🐦10a│ 💼10a│ 🐦10a│ 📸1p │ 💼10a│      │              │
│ 📘2p │      │ 📘2p │      │      │      │              │
└──────┴──────┴──────┴──────┴──────┴──────┴──────────────┘

Legend:
🐦 Twitter   💼 LinkedIn   📘 Facebook   📸 Instagram

Color-coding by Content Pillar:
🟢 Customer Success Stories
🔵 Industry Insights
🟡 Product Updates
```

**Interactions**:
- **Click date** → See all posts scheduled that day
- **Drag-and-drop** → Reschedule post to different day
- **Click post** → Edit or delete
- **Filter** → Show only specific platform or pillar

---

## 6. Social Media Management

**URL**: `/dashboard/social`

### 6.1 Connected Accounts Overview

**Accounts Dashboard** shows all connected social profiles:

```
┌─────────────────────────────────────────────────────────┐
│  CONNECTED ACCOUNTS                                     │
├─────────────────────────────────────────────────────────┤
│  🐦 Twitter/X                                           │
│  @epicai_official                                       │
│  12,458 followers | Connected Jan 15, 2026             │
│  Status: ✅ Active | Token expires: Dec 15, 2026       │
│  [Reconnect] [Disconnect] [View Settings]              │
├─────────────────────────────────────────────────────────┤
│  💼 LinkedIn (Company Page)                             │
│  Epic AI                                                │
│  8,234 followers | Connected Jan 15, 2026              │
│  Status: ✅ Active | Token expires: Never (long-lived) │
│  [Reconnect] [Disconnect] [View Settings]              │
├─────────────────────────────────────────────────────────┤
│  📘 Facebook Page                                       │
│  Epic AI Marketing                                      │
│  5,129 likes | Connected Jan 15, 2026                  │
│  Status: ✅ Active | Token expires: Aug 15, 2026       │
│  [Reconnect] [Disconnect] [View Settings]              │
├─────────────────────────────────────────────────────────┤
│  📸 Instagram Business                                  │
│  @epic.ai                                               │
│  3,847 followers | Connected Jan 15, 2026              │
│  Status: ⚠️ Reconnection needed                        │
│  [Reconnect Now] [Disconnect] [View Settings]          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Connecting New Accounts

**Steps**:
1. Click [+ Connect Account]
2. Select platform:
   - Twitter/X
   - LinkedIn (Personal or Company Page)
   - Facebook (Pages)
   - Instagram (Business accounts only)
3. Click [Connect]
4. **OAuth flow**:
   - Redirects to platform login
   - Authorize Epic AI app
   - Grant required permissions:
     - Twitter: Read + Write tweets, Read profile
     - LinkedIn: Share content, Read profile
     - Facebook: Manage pages, Read insights
     - Instagram: Manage posts, Read insights
5. Callback to Epic AI
6. ✅ Account connected

**Multiple Accounts**:
- You can connect multiple accounts per platform
- Example: 3 Twitter accounts (personal, company, CEO)
- Select which account to publish to during scheduling

### 6.3 Account Settings

**Per-account settings**:

**Default Publishing Preferences**:
- **Auto-publish**: Yes / No (require manual approval)
- **Optimal time scheduling**: Enabled / Disabled
- **Reply to comments**: Auto-reply / Manual / Disabled

**Rate Limits** (platform-specific):
- **Twitter**: Max 50 posts/day
- **LinkedIn**: Max 100 posts/day (personal), 25/day (company page)
- **Facebook**: No strict limit (quality over quantity)
- **Instagram**: Max 25 posts/day

**Publishing Hours** (when auto-scheduling can post):
```
Monday:     ██████████░░░░  9am - 6pm
Tuesday:    ██████████░░░░  9am - 6pm
Wednesday:  ██████████░░░░  9am - 6pm
Thursday:   ██████████░░░░  9am - 6pm
Friday:     ██████████░░░░  9am - 6pm
Saturday:   ░░░░░░░░░░░░░░  Off
Sunday:     ░░░░░░░░░░░░░░  Off
```

**Reconnection**:
- OAuth tokens expire (90 days for Twitter, 60 days for Meta)
- Epic AI emails reminder 7 days before expiration
- Click [Reconnect] → Re-auth → Token refreshed

---

### 6.4 Social Inbox (Engagement Hub)

**URL**: `/dashboard/social/inbox`

**Unified inbox** for comments, mentions, DMs across all platforms:

```
┌─────────────────────────────────────────────────────────┐
│  SOCIAL INBOX                        [All] [Unread (12)]│
├─────────────────────────────────────────────────────────┤
│  🐦 @john_doe mentioned you                       2m ago│
│  "This is exactly what we needed! When's the launch?"   │
│  On: Your post about AI marketing automation           │
│  [Reply] [Create Lead] [Mark Read]                      │
├─────────────────────────────────────────────────────────┤
│  💼 Sarah Chen commented on LinkedIn             15m ago│
│  "Would love to learn more about the voice AI features" │
│  On: Your post about cross-channel marketing           │
│  [Reply] [Create Lead] [Mark Read]                      │
├─────────────────────────────────────────────────────────┤
│  📘 New comment on Facebook                       1h ago│
│  "Do you offer a free trial?"                           │
│  On: Your post about pricing                            │
│  [Reply] [Create Lead] [Mark Read]                      │
└─────────────────────────────────────────────────────────┘
```

**Actions**:
1. **Reply**: Opens reply composer (AI can suggest response)
2. **Create Lead**: Auto-fills lead form with user info
3. **Mark Read**: Removes from unread count
4. **Archive**: Hide from inbox (still accessible in archive)

**AI-Suggested Replies**:
- Click [🤖 AI Suggest]
- AI analyzes comment + Brand Brain → Generates response
- Example:
  ```
  Comment: "Do you offer a free trial?"

  AI Suggested Reply:
  "Yes! We offer a 14-day free trial with full access to all
  features. You can sign up at leads.epic.dm - no credit card
  required. Let me know if you have any questions! 🚀"
  ```
- Edit if needed → [Send]

---

### 6.5 Auto-Responder Rules

**URL**: `/dashboard/social/settings/auto-respond`

**Set up automated responses** to common comments/questions:

**Example Rule**:
```
Rule Name: "Free Trial Inquiry"

Trigger:
  - Comment contains: "free trial" OR "trial" OR "demo"
  - Platform: All

Response Template:
  "Yes! We offer a 14-day free trial. Sign up here:
  leads.epic.dm 🚀"

Actions:
  ☑️ Auto-reply to comment
  ☑️ Create lead from commenter
  ☐ Trigger voice call
  ☑️ Send DM with trial link

Status: ✅ Active
```

**Other Common Rules**:
- Pricing inquiries → Link to pricing page
- "How do I...?" → Link to help docs
- Complaints → Alert human, auto-reply "We're looking into this"
- Positive feedback → Auto-reply "Thank you! 🎉"

---

## 7. Publishing & Scheduling

### 7.1 Publishing Methods

Epic AI supports **3 publishing methods**:

#### Method 1: Publish Now (Instant)

1. Select approved content from queue
2. Click [Publish Now]
3. Choose target accounts:
   ```
   ☑️ Twitter: @epicai_official
   ☐ Twitter: @ceo_account (personal)
   ☑️ LinkedIn: Epic AI (company page)
   ☑️ Facebook: Epic AI Marketing
   ☑️ Instagram: @epic.ai
   ```
4. Click [Confirm & Publish]
5. ⏳ Publishing... (takes 5-30 seconds)
6. ✅ Results:
   ```
   Twitter: ✅ Published (post ID: 1234567890)
   LinkedIn: ✅ Published (post ID: urn:li:share:987654321)
   Facebook: ✅ Published (post ID: 1122334455_6677889900)
   Instagram: ✅ Published (media ID: 18123456789012345)
   ```

**When to use**: Timely content, breaking news, real-time engagement

---

#### Method 2: Schedule for Specific Time

1. Select content → [Schedule]
2. Choose **date & time**:
   ```
   Date: [Jan 20, 2026 ▾]
   Time: [10:00 AM ▾] [EST ▾]
   ```
3. Select accounts (same as Method 1)
4. Click [Schedule]
5. Content added to publishing queue
6. **Cron job** publishes automatically at scheduled time

**When to use**: Planned campaigns, consistent posting schedule

---

#### Method 3: Auto-Schedule (AI Optimal Time)

1. Select content → [Auto-Schedule]
2. AI analyzes:
   - Historical engagement data
   - Audience active hours
   - Platform algorithms (e.g., LinkedIn favors morning posts)
   - Current posting schedule (avoids clustering)
3. **AI recommends**:
   ```
   Optimal Times:

   Twitter:   Tuesday, Jan 21 at 11:30 AM EST
              (87% confidence - peak audience activity)

   LinkedIn:  Tuesday, Jan 21 at 10:00 AM EST
              (92% confidence - B2B decision-makers active)

   Facebook:  Wednesday, Jan 22 at 2:00 PM EST
              (81% confidence - afternoon engagement spike)

   Instagram: Tuesday, Jan 21 at 6:00 PM EST
              (89% confidence - after-work browsing)
   ```
4. Click [Accept AI Schedule] or [Customize]
5. Content scheduled

**When to use**: Maximize engagement, "set it and forget it" strategy

---

### 7.2 Publishing Queue (Cron System)

**How it works**:
- **Cron job** runs **every minute** (24/7)
- Checks for content scheduled in next 5 minutes
- Publishes via platform APIs
- Logs results (success or error)
- Retries failed posts (max 3 attempts with exponential backoff)

**Publishing Flow**:
```
┌─── Cron Job (runs every 60 seconds) ───────────────────┐
│                                                         │
│  1. Query database for pending posts (next 5 min)      │
│  2. For each post:                                      │
│     a. Decrypt OAuth token (AES-256-GCM)               │
│     b. Prepare platform-specific payload               │
│     c. Call platform API (POST /statuses/update)       │
│     d. Handle response:                                 │
│        - Success → Mark published, save post ID        │
│        - Error → Log error, retry (max 3x)             │
│  3. Send webhook notification (if configured)          │
│  4. Update analytics collection queue                   │
└─────────────────────────────────────────────────────────┘
```

**Reliability Features**:
- **Retry logic**: 3 attempts with 1min, 5min, 15min delays
- **Rate limiting**: Respects platform limits (e.g., 50/day Twitter)
- **Error handling**: Logs detailed errors for debugging
- **Token refresh**: Auto-refreshes expired OAuth tokens
- **Fallback**: Alerts user if all retries fail

---

### 7.3 Bulk Scheduling

**Feature**: Schedule multiple posts at once with distribution logic.

**Use Case**: Plan a week of content in 5 minutes.

**Steps**:
1. `/dashboard/content` → Select multiple posts (checkboxes)
2. Click [Bulk Schedule]
3. Choose distribution strategy:

**Strategy 1: Even Distribution**
```
Distribute 7 posts evenly across:
Start: Jan 20, 2026
End:   Jan 26, 2026

Posting frequency: 1x per day

AI will space posts optimally throughout the week.
```

**Strategy 2: Custom Pattern**
```
Pattern: Mon/Wed/Fri at 10am

AI will assign posts to:
- Monday 10am
- Wednesday 10am
- Friday 10am
- Monday 10am (next week if >3 posts)
```

**Strategy 3: Peak Times Only**
```
Only schedule during peak engagement windows.

AI uses historical data to select best times.
```

4. Click [Apply Schedule]
5. ✅ All posts scheduled

---

### 7.4 Publishing Analytics

**View publishing success rate**:

**URL**: `/dashboard/publishing/analytics`

**Metrics**:
```
┌─────────────────────────────────────────────────────────┐
│  PUBLISHING PERFORMANCE (Last 30 Days)                  │
├─────────────────────────────────────────────────────────┤
│  Total Posts Scheduled:        247                      │
│  Successfully Published:       241 (97.6%)              │
│  Failed (retry succeeded):     3 (1.2%)                 │
│  Failed (all retries):         3 (1.2%)                 │
│                                                         │
│  By Platform:                                           │
│  Twitter:   60/60 (100%) ✅                             │
│  LinkedIn:  58/60 (96.7%) ⚠️                            │
│  Facebook:  61/63 (96.8%) ⚠️                            │
│  Instagram: 62/64 (96.9%) ⚠️                            │
│                                                         │
│  Avg. Publishing Time:  2.3 seconds                     │
│  Retry Rate:            2.4%                            │
└─────────────────────────────────────────────────────────┘
```

**Common Errors**:
```
Error Type:             Count:    Resolution:
Token expired           2         Reconnect account
Rate limit exceeded     1         Reduce posting frequency
Image upload failed     0         N/A
API timeout             0         N/A
```

---

## 8. Voice AI System

**URL**: `/dashboard/voice`

### 8.1 Voice AI Overview

Epic AI's **Voice AI** module enables you to create autonomous AI agents that handle:
- Inbound customer calls (24/7)
- Outbound lead qualification
- Appointment scheduling
- FAQ answering
- Call transfer to humans

**Powered by**:
- **LiveKit** (real-time voice infrastructure)
- **OpenAI Realtime API** (conversational AI)
- **Deepgram** (speech-to-text)

---

### 8.2 Creating Voice Agents

**URL**: `/dashboard/voice/agents/new`

#### Agent Configuration Form

**Step 1: Basic Information**
```
Agent Name: "Sales Qualifier Sarah"
Role/Purpose: Qualify inbound leads and book demos
Status: ○ Active  ○ Inactive (start inactive to test)
```

**Step 2: Personality Settings**
```
Voice Characteristics:
  Tone:      ☑️ Professional  ☑️ Friendly  ☐ Energetic
  Speed:     ○ Slow  ● Normal  ○ Fast
  Pitch:     ○ Low  ● Medium  ○ High
  Accent:    [US English ▾]

Personality Traits:
  Describe how the agent should behave:
  "Patient and helpful. Asks clarifying questions. Never
  pushy. Uses customer's name naturally. Warm but professional."

Example Phrases:
  Greeting:  "Hi! This is Sarah from Epic AI. How can I help?"
  Closing:   "Great chatting with you! I'll send that info right over."
```

**Step 3: Knowledge Base**
```
Upload documents the agent can reference:

☑️ Product Documentation (PDF)
☑️ Pricing Sheet (PDF)
☑️ FAQ Document (PDF)
☐ Company Website (scrape URL)

AI will index these and agent can answer questions from them.
```

**Step 4: Conversation Flow** (optional)
```
Define a script (agent can deviate if needed):

1. Greeting
   → "Hi! This is Sarah from Epic AI. Is this a good time to chat?"

2. If yes → Qualification
   → "Great! Can I ask what brought you to Epic AI?"

3. Qualification Questions:
   ☑️ What's your current marketing setup?
   ☑️ What's your biggest challenge?
   ☑️ What's your budget?
   ☑️ When are you looking to get started?

4. If qualified → Schedule Demo
   → "You sound like a great fit! Let's get a demo on the calendar."
   → [Transfer to Calendly or human]

5. If not qualified → Nurture
   → "I'll send you some resources to check out. Can I get your email?"

6. Closing
   → "Thanks for chatting! You'll hear from us soon."
```

**Step 5: Integration Settings**
```
What should happen after the call?

☑️ Create lead in CRM
☑️ Send summary email to sales team
☑️ Log conversation transcript
☐ Trigger follow-up email sequence
☐ Schedule callback
```

**Step 6: Phone Numbers**
```
Assign a phone number to this agent:

○ Use existing number: [+1 (555) 123-4567 ▾]
● Provision new number:
   Area code: [212 ▾] (New York)
   [Provision Number] ($5/month)

Forwarding:
  If agent can't handle → Transfer to: [+1 (555) 999-8888]
```

**Step 7: Testing**
```
Test your agent before activating:

[📞 Test Call]

Calls your phone → You can chat with agent → Review transcript
```

---

### 8.3 Managing Agents

**Agent Dashboard** (`/dashboard/voice/agents`):

```
┌─────────────────────────────────────────────────────────┐
│  VOICE AGENTS                              [+ New Agent]│
├─────────────────────────────────────────────────────────┤
│  📞 Sales Qualifier Sarah                     ✅ Active │
│  Inbound lead qualification                            │
│  Calls this month: 47 | Avg duration: 4m 23s           │
│  Conversion rate: 32% (qualified)                       │
│  Phone: +1 (212) 555-1234                               │
│  [Edit] [View Calls] [Deactivate]                      │
├─────────────────────────────────────────────────────────┤
│  📞 Support Agent Mike                       ⚠️ Inactive│
│  Customer support FAQs                                  │
│  Calls this month: 0                                    │
│  Phone: Not assigned                                    │
│  [Edit] [Activate] [Delete]                            │
└─────────────────────────────────────────────────────────┘
```

**Agent Actions**:
- **Edit**: Modify personality, knowledge base, flow
- **View Calls**: See call history for this agent
- **Activate/Deactivate**: Turn on/off without deleting
- **Clone**: Duplicate agent config (useful for variations)
- **Delete**: Permanently remove (keeps call logs)

---

### 8.4 Call Logs & Transcripts

**URL**: `/dashboard/voice/calls`

**Call Log Table**:
```
┌─────────────────────────────────────────────────────────┐
│  CALL HISTORY                        [Filter] [Export]  │
├─────────────────────────────────────────────────────────┤
│  From          Agent    Duration  Outcome    Date       │
├─────────────────────────────────────────────────────────┤
│  +1-555-0101  Sarah    4m 23s    Qualified  Jan 17, 2pm │
│  [View Transcript] [Listen] [Create Lead]              │
├─────────────────────────────────────────────────────────┤
│  +1-555-0202  Sarah    1m 15s    Hung up    Jan 17, 1pm │
│  [View Transcript] [Listen]                            │
├─────────────────────────────────────────────────────────┤
│  +1-555-0303  Sarah    6m 47s    Scheduled  Jan 16, 4pm │
│  [View Transcript] [Listen] [View Lead]                │
└─────────────────────────────────────────────────────────┘
```

**Transcript View**:
```
┌─────────────────────────────────────────────────────────┐
│  CALL TRANSCRIPT                                        │
│  Agent: Sarah | From: +1-555-0101 | Duration: 4m 23s    │
├─────────────────────────────────────────────────────────┤
│  [00:00] Sarah: Hi! This is Sarah from Epic AI. Is this│
│                 John from Acme Corp?                    │
│                                                         │
│  [00:03] Caller: Yes, this is John.                    │
│                                                         │
│  [00:05] Sarah: Great! I saw you filled out our contact│
│                 form. What brought you to Epic AI?      │
│                                                         │
│  [00:12] Caller: We're looking for marketing automation │
│                  that includes voice AI. Do you have    │
│                  that?                                  │
│                                                         │
│  [00:18] Sarah: Absolutely! Epic AI is the only platform│
│                 that combines social media management,  │
│                 AI content generation, AND voice agents │
│                 like me. Can I ask what your current    │
│                 setup looks like?                       │
│                                                         │
│  [00:30] Caller: We're using HubSpot for email and     │
│                  Buffer for social, but we don't have   │
│                  voice automation.                      │
│                                                         │
│  [00:40] Sarah: Perfect! Epic AI can replace both those│
│                 tools and add voice AI. What's your     │
│                 team size?                              │
│                                                         │
│  [00:48] Caller: 5 people on marketing.                │
│                                                         │
│  [00:50] Sarah: Got it. And ballpark, what's your      │
│                 monthly budget for marketing tools?     │
│                                                         │
│  [00:56] Caller: Around $1,500 per month.              │
│                                                         │
│  [01:00] Sarah: Excellent! You'd fit perfectly in our  │
│                 Professional plan at $597/month, which  │
│                 would save you about $900 compared to   │
│                 your current setup. Would you like to   │
│                 see a demo?                             │
│                                                         │
│  [01:14] Caller: Yes, definitely.                      │
│                                                         │
│  [01:16] Sarah: Awesome! Let me transfer you to our    │
│                 scheduling team to find a time that     │
│                 works. Sound good?                      │
│                                                         │
│  [01:22] Caller: Perfect, thanks!                      │
│                                                         │
│  [01:24] Sarah: Great chatting with you, John! Hold on │
│                 one moment.                             │
│                                                         │
│  [01:27] [Call transferred to human agent]             │
│                                                         │
│  ────────────────────────────────────────────          │
│  Outcome: ✅ Qualified                                  │
│  Lead created: Yes (ID: L-12345)                        │
│  Demo scheduled: Yes (Jan 20 at 2pm)                    │
│  AI Sentiment: Positive (87% confidence)                │
└─────────────────────────────────────────────────────────┘
```

**Actions**:
- **Listen**: Play audio recording
- **Download**: Save MP3 file
- **Share**: Generate shareable link (for training)
- **Create Lead**: Convert caller to CRM lead
- **Flag**: Mark for review (e.g., complaint)

---

### 8.5 Voice Analytics

**URL**: `/dashboard/voice/analytics`

**Metrics Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│  VOICE AI PERFORMANCE (Last 30 Days)                    │
├─────────────────────────────────────────────────────────┤
│  Total Calls:              156                          │
│  Inbound:                  132 (84.6%)                  │
│  Outbound:                 24 (15.4%)                   │
│                                                         │
│  Avg Call Duration:        4m 12s                       │
│  Completion Rate:          89.1% (didn't hang up)       │
│  Transfer Rate:            12.8% (transferred to human) │
│                                                         │
│  Outcomes:                                              │
│  ✅ Qualified:             38 (24.4%)                   │
│  ⏰ Scheduled Demo:        22 (14.1%)                   │
│  ❓ Info Request:          47 (30.1%)                   │
│  ❌ Not Interested:        31 (19.9%)                   │
│  🚫 Hung Up Early:         18 (11.5%)                   │
│                                                         │
│  Sentiment Analysis:                                    │
│  😊 Positive:              98 (62.8%)                   │
│  😐 Neutral:               41 (26.3%)                   │
│  😞 Negative:              17 (10.9%)                   │
│                                                         │
│  Cost:                                                  │
│  Total Minutes:            655 min                      │
│  Cost per Minute:          $0.10                        │
│  Total Cost:               $65.50                       │
└─────────────────────────────────────────────────────────┘
```

**By Agent**:
```
Agent             Calls   Avg Duration   Qualified   Cost
Sales Sarah       132     4m 23s         32.5%       $57.00
Support Mike      24      2m 15s         N/A         $8.50
```

---

## 9. Analytics & Reporting

**URL**: `/dashboard/analytics`

### 9.1 Analytics Dashboard

**Overview Tab** - High-level metrics:
```
┌─────────────────────────────────────────────────────────┐
│  PERFORMANCE OVERVIEW                                   │
│  [Last 7 Days] [Last 30 Days] [Last 90 Days] [Custom]  │
├─────────────────────────────────────────────────────────┤
│  📊 ORGANIC SOCIAL                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Impressions        Engagements     Eng. Rate     │ │
│  │  127,458 (+23%)     8,234 (+31%)    6.5% (+0.5%) │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  💰 PAID ADVERTISING                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Spend            Clicks          Conversions     │ │
│  │  $2,347 (+12%)    1,234 (+18%)    47 (+21%)      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  👤 LEADS                                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  New Leads        Qualified       Converted       │ │
│  │  89 (+34%)        41 (+28%)       12 (+50%)       │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 9.2 Platform-Specific Analytics

**Twitter Tab**:
```
┌─────────────────────────────────────────────────────────┐
│  TWITTER PERFORMANCE (Last 30 Days)                     │
├─────────────────────────────────────────────────────────┤
│  Posts Published:     60                                │
│  Impressions:         45,234 (avg 754/post)             │
│  Engagements:         2,847 (avg 47/post)               │
│  Engagement Rate:     6.3%                              │
│  Follower Growth:     +234 (from 12,224 to 12,458)     │
│                                                         │
│  Top Performing Post:                                   │
│  "Want to keep customers for life? 🚀..."              │
│  Impressions: 3,421 | Engagements: 287 (8.4% rate)     │
│  [View Post]                                            │
│                                                         │
│  Best Posting Times:                                    │
│  1. Tuesday 11am (8.9% avg engagement)                  │
│  2. Thursday 2pm (8.1% avg engagement)                  │
│  3. Wednesday 10am (7.6% avg engagement)                │
└─────────────────────────────────────────────────────────┘
```

*Similar tabs for LinkedIn, Facebook, Instagram*

---

### 9.3 Content Performance

**Content Analytics** - See which posts perform best:

**URL**: `/dashboard/analytics/content`

**Sortable table**:
```
┌─────────────────────────────────────────────────────────┐
│  TOP PERFORMING CONTENT                                 │
│  [Sort by: Engagement Rate ▾] [Filter: All Platforms ▾]│
├─────────────────────────────────────────────────────────┤
│  Post                  Platform  Impr.  Eng.  Rate      │
├─────────────────────────────────────────────────────────┤
│  Customer success...   LinkedIn  8.2K   687   8.4%     │
│  How to improve...     Twitter   3.4K   287   8.4%     │
│  5 marketing trends    LinkedIn  6.1K   447   7.3%     │
│  Why voice AI...       Twitter   2.9K   198   6.8%     │
│  Behind the scenes     Instagram 4.3K   276   6.4%     │
└─────────────────────────────────────────────────────────┘
```

**Insights**:
- Click any post → See detailed breakdown
- Compare performance across platforms
- Identify patterns (e.g., case studies outperform features)

---

### 9.4 AI Insights Tab

**URL**: `/dashboard/analytics/insights`

**AI-Generated Recommendations**:
```
┌─────────────────────────────────────────────────────────┐
│  AI INSIGHTS                             [Refresh]      │
│  Last generated: Jan 17, 2026 at 9:00am                │
├─────────────────────────────────────────────────────────┤
│  💡 High Confidence Insight (92%)                       │
│  "LinkedIn posts published on Tuesday at 10am receive   │
│  34% more engagement than your average. Posts at this   │
│  time have averaged 8.1% engagement rate vs. 6.0%       │
│  overall."                                              │
│                                                         │
│  📊 Supporting Data:                                    │
│  - 12 posts at Tue 10am: avg 8.1% engagement           │
│  - 48 posts at other times: avg 6.0% engagement         │
│  - Statistical significance: p < 0.01                   │
│                                                         │
│  🎯 Recommendation:                                     │
│  Shift 40% of LinkedIn content to Tuesday 10am slot.   │
│                                                         │
│  [Apply Automatically] [Schedule for Later] [Dismiss]  │
├─────────────────────────────────────────────────────────┤
│  💡 Medium Confidence Insight (87%)                     │
│  "Customer success stories (content pillar) outperform  │
│  product feature posts by 2.3x. Success stories average │
│  8.3% engagement vs. 3.6% for features."                │
│                                                         │
│  🎯 Recommendation:                                     │
│  Increase 'Customer Stories' pillar from 20% to 35%.   │
│                                                         │
│  [Apply to Brand Brain] [Dismiss]                      │
└─────────────────────────────────────────────────────────┘
```

**Insight Types**:
1. **Timing Insights**: Best posting times per platform
2. **Content Insights**: Which topics/pillars perform best
3. **Format Insights**: Short vs. long, image vs. text
4. **Audience Insights**: What resonates with your personas
5. **Cross-Channel Insights**: Synergy between channels

---

### 9.5 Export & Reports

**Export Options**:

**URL**: `/dashboard/analytics/export`

**Formats**:
- **CSV**: Raw data for Excel/Google Sheets
- **PDF**: Formatted report with charts
- **PowerPoint**: Executive summary slides

**Report Templates**:
1. **Executive Summary** (1-page)
   - Key metrics
   - Top insights
   - ROI summary

2. **Detailed Performance** (10-15 pages)
   - Platform breakdowns
   - Content performance
   - Audience demographics
   - Competitive benchmarking

3. **Custom Report**
   - Choose metrics
   - Choose date range
   - Choose platforms

**Scheduled Reports**:
- Send to email weekly/monthly
- Auto-generate PDF
- Deliver to Slack channel

---

## 10. Lead Management

**URL**: `/dashboard/leads`

### 10.1 Lead Dashboard

**Lead Table**:
```
┌─────────────────────────────────────────────────────────┐
│  LEADS                               [+ New Lead]        │
│  [All (234)] [New (47)] [Contacted (89)] [Qualified (41)]│
├─────────────────────────────────────────────────────────┤
│  Name           Source      Status      Last Contact    │
├─────────────────────────────────────────────────────────┤
│  John Smith     LinkedIn    Qualified   Jan 17, 2pm     │
│  Acme Corp      Comment                 (Sarah - Voice) │
│  [View Details] [Call] [Email] [Convert]               │
├─────────────────────────────────────────────────────────┤
│  Sarah Chen     Twitter     New         Jan 17, 11am    │
│  CloudStack     Mention                 (Auto-created)  │
│  [View Details] [Call] [Email] [Mark Contacted]        │
└─────────────────────────────────────────────────────────┘
```

---

### 10.2 Lead Sources

Leads can be created from:
1. **Social Comments**: Auto-created from comments/mentions
2. **Voice Calls**: Agent logs caller as lead
3. **Ad Clicks**: Campaign conversions
4. **Manual Entry**: User adds lead directly
5. **Webhooks**: External system pushes lead
6. **CSV Import**: Bulk upload

---

### 10.3 Lead Detail View

**Click lead** → Full profile:

```
┌─────────────────────────────────────────────────────────┐
│  JOHN SMITH                               [Edit]        │
│  Acme Corp | CMO                                        │
│  john@acmecorp.com | +1 (555) 123-4567                  │
├─────────────────────────────────────────────────────────┤
│  STATUS: Qualified 🟢                                   │
│  SOURCE: LinkedIn comment                               │
│  CREATED: Jan 15, 2026                                  │
│  LAST CONTACT: Jan 17, 2026 (Voice call with Sarah)    │
├─────────────────────────────────────────────────────────┤
│  LEAD SCORE: 87/100 (High Priority)                    │
│  ✅ Budget confirmed ($1,500/mo)                        │
│  ✅ Decision maker                                      │
│  ✅ Timeline: 30 days                                   │
│  ✅ Engaged multiple times                              │
├─────────────────────────────────────────────────────────┤
│  ACTIVITY TIMELINE:                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Jan 17, 2pm - Voice call with Sarah (4m 23s)     │ │
│  │ "Qualified for demo, interested in voice AI"     │ │
│  │ [View Transcript]                                 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Jan 16, 3pm - DM conversation on LinkedIn        │ │
│  │ "Asked about pricing and features"               │ │
│  │ [View Conversation]                               │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Jan 15, 10am - Commented on LinkedIn post        │ │
│  │ "This is exactly what we needed!"                │ │
│  │ [View Post]                                       │ │
│  └───────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  QUICK ACTIONS:                                         │
│  [📞 Call with Voice AI] [📧 Send Email]               │
│  [🗓️ Schedule Demo] [✅ Mark Converted]                │
└─────────────────────────────────────────────────────────┘
```

---

### 10.4 Lead Scoring

**Automatic scoring** based on:
- **Engagement**: Comments, DMs, calls
- **Budget**: Confirmed budget match
- **Authority**: Decision maker vs. influencer
- **Timeline**: Ready now vs. 6+ months
- **Fit**: Company size, industry match

**Score Breakdown**:
```
John Smith: 87/100 (High Priority)

Engagement:         25/25  ✅
Budget Match:       20/20  ✅
Authority:          15/15  ✅
Timeline:           15/20  ⚠️ (30 days, prefer <15)
Company Fit:        12/20  ⚠️ (5 employees, prefer 10+)
```

**Score Tiers**:
- 80-100: 🔴 Hot (contact ASAP)
- 60-79: 🟡 Warm (follow up this week)
- 40-59: 🔵 Cool (nurture campaign)
- 0-39: ⚫ Cold (low priority)

---

## 11. Automation & Workflows

**URL**: `/dashboard/automations`

### 11.1 Automation Overview

**Automations** are trigger-based workflows that connect channels:

**Example Use Cases**:
1. Social comment → Create lead → Voice call
2. New follower → Send welcome DM
3. Post gets 50+ likes → Boost with paid ad
4. Voice call qualified → Add to CRM → Schedule demo
5. Lead goes cold → Re-engagement email sequence

---

### 11.2 Creating an Automation

**URL**: `/dashboard/automations/new`

#### Step 1: Choose Trigger

**Trigger Types**:
```
Social Media:
  ☐ New comment on post
  ☐ New mention
  ☐ New follower
  ☐ Post reaches X engagements
  ☐ DM received

Voice AI:
  ☐ Call completed
  ☐ Lead qualified
  ☐ Agent transferred call

Content:
  ☐ Post published
  ☐ Post scheduled
  ☐ Content approved

Leads:
  ☐ New lead created
  ☐ Lead status changed
  ☐ Lead score above X

Time-Based:
  ☐ Every day at X time
  ☐ Every week on X day
```

**Example Selection**:
```
✅ Trigger: "Social Media → New comment on post"

Configure:
  Platform:  [All ▾]
  Condition: Comment contains "interested" OR "demo" OR "pricing"
```

---

#### Step 2: Add Conditions (Optional)

**Conditional Logic**:
```
Only run if:

☑️ Commenter has 100+ followers (filter spam)
☑️ Post is less than 7 days old (ignore old posts)
☐ Comment is first interaction (ignore repeat commenters)

Combine with: ● AND  ○ OR
```

---

#### Step 3: Add Actions

**Available Actions**:
```
Social:
  ☐ Reply to comment
  ☐ Send DM
  ☐ Like comment
  ☐ Follow user

Voice:
  ☐ Trigger outbound call
  ☐ Add to call queue
  ☐ Create voice agent task

Leads:
  ☐ Create lead
  ☐ Update lead status
  ☐ Add lead note
  ☐ Assign to sales rep

Content:
  ☐ Create content draft
  ☐ Schedule post

Notifications:
  ☐ Send email to team
  ☐ Send Slack message
  ☐ Create task in project management tool

Paid Ads:
  ☐ Boost post
  ☐ Create lookalike audience
```

**Example Actions**:
```
Action 1: Create Lead
  ┌───────────────────────────────────────────────────┐
  │ Lead Details:                                     │
  │ Name:   [Auto-fill from commenter profile]       │
  │ Email:  [Try to find from profile]               │
  │ Source: "Social comment"                          │
  │ Status: "New"                                     │
  │ Note:   "Commented: {{comment_text}}"            │
  └───────────────────────────────────────────────────┘

Action 2: Send DM
  ┌───────────────────────────────────────────────────┐
  │ Message:                                          │
  │ "Hi {{commenter_name}}! Saw your comment about   │
  │ {{topic}}. I'd love to chat more! Are you free   │
  │ for a quick call this week?"                      │
  └───────────────────────────────────────────────────┘

Action 3: Trigger Voice Call (Optional)
  ┌───────────────────────────────────────────────────┐
  │ Agent:      [Sales Qualifier Sarah ▾]            │
  │ When:       [In 5 minutes]                        │
  │ Phone:      [From lead profile]                   │
  │ If no phone: Skip this action                     │
  └───────────────────────────────────────────────────┘
```

---

#### Step 4: Name & Activate

```
Automation Name: "Social Engagement → Lead → Call"

Description (optional):
"Automatically create leads from interested social comments
and follow up with a voice call."

Status:
● Active (start immediately)
○ Inactive (save but don't run)

[Save Automation]
```

---

### 11.3 Managing Automations

**Automation List**:
```
┌─────────────────────────────────────────────────────────┐
│  ACTIVE AUTOMATIONS                    [+ New]          │
├─────────────────────────────────────────────────────────┤
│  📱 Social Engagement → Lead → Call      ✅ Active      │
│  Triggered 47 times this month | 92% success rate       │
│  [Edit] [View Log] [Pause] [Delete]                    │
├─────────────────────────────────────────────────────────┤
│  👋 New Follower Welcome DM              ✅ Active      │
│  Triggered 234 times this month | 98% success rate      │
│  [Edit] [View Log] [Pause] [Delete]                    │
├─────────────────────────────────────────────────────────┤
│  🚀 Boost High-Performing Posts          ⏸️ Paused      │
│  Triggered 0 times (paused)                             │
│  [Edit] [View Log] [Resume] [Delete]                   │
└─────────────────────────────────────────────────────────┘
```

---

### 11.4 Automation Logs

**View Execution History**:

**URL**: `/dashboard/automations/[id]/log`

```
┌─────────────────────────────────────────────────────────┐
│  AUTOMATION LOG: Social Engagement → Lead → Call        │
│  [Last 7 Days] [Last 30 Days] [All Time]               │
├─────────────────────────────────────────────────────────┤
│  Timestamp          Trigger          Actions    Status  │
├─────────────────────────────────────────────────────────┤
│  Jan 17, 2:15pm    Comment by       3/3        ✅ Success│
│                    @john_smith                          │
│  Details: Lead created (L-12345), DM sent, Call queued │
│  [View Full Log]                                        │
├─────────────────────────────────────────────────────────┤
│  Jan 17, 11:30am   Comment by       2/3        ⚠️ Partial│
│                    @sarah_chen                          │
│  Details: Lead created, DM sent, Call failed (no phone)│
│  [View Full Log]                                        │
├─────────────────────────────────────────────────────────┤
│  Jan 16, 4:20pm    Comment by       3/3        ✅ Success│
│                    @mike_jones                          │
│  Details: Lead created, DM sent, Call completed (qual.) │
│  [View Full Log]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Cross-Channel Journeys

**URL**: `/dashboard/journeys`

### 12.1 What are Journeys?

**Cross-Channel Journeys** visualize how customers interact across multiple touchpoints:
- Social media post
- Comment/engagement
- DM conversation
- Voice call
- Email
- Website visit
- Conversion

**Example Journey**:
```
LinkedIn Post (Jan 15)
   ↓
Sarah Chen comments (Jan 15, 10am)
   ↓
Lead created automatically (Jan 15, 10:01am)
   ↓
DM sent via automation (Jan 15, 10:02am)
   ↓
Sarah replies to DM (Jan 16, 2pm)
   ↓
Voice agent calls Sarah (Jan 17, 10am)
   ↓
Sarah qualifies as lead (Jan 17, 10:04am)
   ↓
Demo scheduled (Jan 17, 10:05am)
   ↓
✅ Converted to customer (Jan 25)
```

---

### 12.2 Journey Dashboard

**Visual Journey Map**:
```
┌─────────────────────────────────────────────────────────┐
│  ACTIVE JOURNEYS (47)                                   │
│  Avg. Touchpoints: 4.2 | Avg. Time to Convert: 8.3 days│
├─────────────────────────────────────────────────────────┤
│  Sarah Chen - Acme Corp              ✅ Converted (8 days)│
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📘 LinkedIn → 💬 Comment → 📨 DM → 📞 Call →     │ │
│  │ 🗓️ Demo → ✅ Customer                            │ │
│  └───────────────────────────────────────────────────┘ │
│  Touchpoints: 6 | Channels: 3 (Social, Voice, Email)   │
│  [View Full Journey]                                    │
├─────────────────────────────────────────────────────────┤
│  John Smith - CloudStack             🟡 In Progress     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🐦 Twitter → 💬 Mention → 📨 DM → ...           │ │
│  └───────────────────────────────────────────────────┘ │
│  Touchpoints: 3 | Channels: 1 (Social) | Next: Call    │
│  [View Full Journey]                                    │
└─────────────────────────────────────────────────────────┘
```

---

### 12.3 Synergy Metrics

**Cross-Channel Synergy Rate**:

**Definition**: % of leads who interacted via 2+ channels before converting.

**Example**:
```
┌─────────────────────────────────────────────────────────┐
│  SYNERGY ANALYSIS (Last 30 Days)                        │
├─────────────────────────────────────────────────────────┤
│  Total Leads:              89                           │
│  Multi-Channel Leads:      54 (60.7%) 🟢                │
│  Single-Channel Leads:     35 (39.3%)                   │
│                                                         │
│  Conversion Rate by Channel Count:                      │
│  1 channel:   14.3% (5 conversions / 35 leads)          │
│  2 channels:  32.1% (9 conversions / 28 leads)          │
│  3+ channels: 50.0% (13 conversions / 26 leads)         │
│                                                         │
│  🎯 Insight: Multi-channel leads convert 3.5x better    │
│                                                         │
│  Most Effective Journey:                                │
│  Social → Voice → Email = 61% conversion rate           │
└─────────────────────────────────────────────────────────┘
```

**Synergy Rate Benchmarks**:
- 60%+ = Excellent (channels integrated well)
- 40-59% = Good (moderate integration)
- <40% = Needs work (siloed channels)

---

## 13. Paid Advertising

**URL**: `/dashboard/ads`

### 13.1 Connected Ad Accounts

**Platforms Supported**:
- Meta Ads (Facebook + Instagram)
- Google Ads

**Connection Flow**:
1. Click [Connect Ad Account]
2. Select platform
3. OAuth login
4. Grant ad management permissions
5. Select ad accounts to link

---

### 13.2 Campaign Management

**Campaign Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│  AD CAMPAIGNS                          [+ New Campaign] │
├─────────────────────────────────────────────────────────┤
│  📊 Product Launch - Meta               ✅ Active       │
│  Spend: $847 / $1,000 budget | 3 days left             │
│  Clicks: 1,234 | Conversions: 47 | CPA: $18.02         │
│  [View Details] [Pause] [Edit Budget]                  │
├─────────────────────────────────────────────────────────┤
│  🔍 Brand Awareness - Google            ✅ Active       │
│  Spend: $523 / $500 budget | Budget exceeded!          │
│  Clicks: 2,156 | Conversions: 12 | CPA: $43.58         │
│  [View Details] [Pause] [Increase Budget]              │
└─────────────────────────────────────────────────────────┘
```

---

### 13.3 Ad Performance Tracking

**Metrics**:
- Impressions
- Clicks
- CTR
- Conversions
- Cost per click (CPC)
- Cost per acquisition (CPA)
- Return on ad spend (ROAS)

**Integration with Epic AI**:
- Ad clicks auto-create leads
- Track leads from ad to conversion
- Attribute revenue to campaigns

---

## 14. Team Collaboration

**URL**: `/dashboard/settings/team`

### 14.1 User Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, delete org |
| **Admin** | Manage users, content, settings (no billing/delete) |
| **Member** | Create/approve content, view analytics |
| **Viewer** | Read-only access (see dashboards, no edits) |

---

### 14.2 Inviting Team Members

1. `/dashboard/settings/team` → [+ Invite User]
2. Enter email: `colleague@company.com`
3. Select role: [Admin ▾]
4. (Optional) Add message
5. [Send Invite]
6. User receives email → Clicks link → Creates account → Gains access

---

### 14.3 Approval Workflows

**Content Approval** (for teams):

**Settings**: `/dashboard/settings/publishing`

**Options**:
- **Auto-approve**: Content publishes immediately (risky)
- **Require approval**: All content goes to approval queue
- **Approval by role**: Admins/Owners approve, Members create

**Approval Queue**: `/dashboard/content/approval`

```
┌─────────────────────────────────────────────────────────┐
│  PENDING APPROVAL (3)                                   │
├─────────────────────────────────────────────────────────┤
│  📄 "How to improve customer retention..."              │
│  Created by: John (Member) | Jan 17, 11am              │
│  Platforms: Twitter, LinkedIn, Facebook                │
│  [Review] [Approve] [Reject]                           │
└─────────────────────────────────────────────────────────┘
```

**Review Screen**:
- See all platform variations
- Edit if needed
- Approve → Sends to publishing queue
- Reject → Returns to creator with feedback

---

## 15. Settings & Configuration

**URL**: `/dashboard/settings`

### 15.1 Settings Menu

**Sections**:
1. **General** - Organization name, logo, timezone
2. **Brand** - (See Section 4)
3. **Team** - User management, roles
4. **Publishing** - Approval workflows, rate limits
5. **Billing** - Plan, payment method, invoices
6. **Integrations** - Webhooks, API keys, third-party apps
7. **Notifications** - Email/Slack alerts
8. **Security** - 2FA, API access logs

---

### 15.2 General Settings

**Organization**:
- Name: "Acme Corp"
- Logo: [Upload] (used in emails, reports)
- Timezone: [America/New_York ▾]
- Default language: [English ▾]

---

### 15.3 Billing

**Plan & Usage**:
```
┌─────────────────────────────────────────────────────────┐
│  CURRENT PLAN: Professional                             │
│  $597/month (billed monthly)                            │
├─────────────────────────────────────────────────────────┤
│  Usage This Billing Period (Jan 1 - Jan 31):           │
│  AI Posts Generated:     247 / Unlimited                │
│  Voice Minutes:          655 / 1,000                    │
│  Social Accounts:        4 / Unlimited                  │
│  Team Members:           3 / Unlimited                  │
├─────────────────────────────────────────────────────────┤
│  Next Billing Date:      Feb 1, 2026                    │
│  Payment Method:         Visa ****1234                  │
│  [Update Card] [View Invoices] [Change Plan]           │
└─────────────────────────────────────────────────────────┘
```

**Upgrade/Downgrade**:
- Click [Change Plan]
- Select new plan
- Review pricing difference
- Confirm → Prorated billing

**Invoices**:
- Download past invoices (PDF)
- Update billing email

---

### 15.4 Webhooks

**Configure external integrations**:

**URL**: `/dashboard/settings/webhooks`

**Webhook Events**:
- `content.published` - Fires when content goes live
- `lead.created` - New lead added
- `call.completed` - Voice call ends
- `insight.generated` - New AI insight
- `post.engagement` - Post reaches X engagements

**Creating a Webhook**:
1. Click [+ New Webhook]
2. Enter endpoint URL: `https://yourapp.com/webhook`
3. Select events: ✅ `lead.created`
4. (Optional) Add secret for signature verification
5. [Save]

**Payload Example** (`lead.created`):
```json
{
  "event": "lead.created",
  "timestamp": "2026-01-17T14:30:00Z",
  "data": {
    "lead_id": "L-12345",
    "name": "John Smith",
    "email": "john@acme.com",
    "source": "LinkedIn comment",
    "status": "New"
  }
}
```

---

### 15.5 API Keys

**Generate API keys** for programmatic access:

**URL**: `/dashboard/settings/api`

**Creating an API Key**:
1. Click [+ Generate Key]
2. Name: "Integration with CRM"
3. Permissions:
   - ✅ Read content
   - ✅ Create content
   - □ Delete content
   - ✅ Read leads
   - ✅ Create leads
4. [Generate]
5. **Copy key** (shown only once):
   ```
   epic_live_sk_1234567890abcdefghijklmnopqrstuvwxyz
   ```
6. Store securely (can't view again!)

**Revoking Keys**:
- Click [Revoke] next to key
- Immediately invalidates access

---

## 16. API Reference

### 16.1 API Overview

**Base URL**: `https://leads.epic.dm/api`

**Authentication**:
```bash
Authorization: Bearer epic_live_sk_YOUR_API_KEY
```

**Rate Limits**:
- 1,000 requests/hour (Starter)
- 5,000 requests/hour (Professional)
- 25,000 requests/hour (Agency)

---

### 16.2 Common Endpoints

#### POST /api/content

**Create content**:
```bash
curl -X POST https://leads.epic.dm/api/content \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How to improve customer retention",
    "platforms": ["twitter", "linkedin"],
    "pillar_id": "pillar_123"
  }'
```

**Response**:
```json
{
  "content_id": "content_456",
  "status": "draft",
  "variations": [
    {
      "platform": "twitter",
      "text": "Want to keep customers for life? 🚀...",
      "character_count": 247
    },
    {
      "platform": "linkedin",
      "text": "How to Improve Customer Retention with AI...",
      "character_count": 1187
    }
  ]
}
```

---

#### POST /api/content/[id]/schedule

**Schedule content**:
```bash
curl -X POST https://leads.epic.dm/api/content/content_456/schedule \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "publish_at": "2026-01-20T10:00:00Z",
    "accounts": ["twitter_123", "linkedin_456"]
  }'
```

---

#### GET /api/leads

**List leads**:
```bash
curl https://leads.epic.dm/api/leads?status=qualified&limit=10 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response**:
```json
{
  "leads": [
    {
      "id": "L-12345",
      "name": "John Smith",
      "email": "john@acme.com",
      "status": "qualified",
      "score": 87,
      "source": "LinkedIn comment",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 47,
    "page": 1,
    "per_page": 10
  }
}
```

---

#### POST /api/leads

**Create lead**:
```bash
curl -X POST https://leads.epic.dm/api/leads \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@company.com",
    "phone": "+1-555-123-4567",
    "source": "Website form"
  }'
```

---

*Full API documentation: https://docs.epic.dm/api*

---

## 17. Admin Functions

### 17.1 User Management

**Admins/Owners** can:
- Invite users
- Change user roles
- Deactivate users (suspends access without deleting)
- Delete users (permanent removal)

**Audit Log**:
- Track user actions (content created, leads deleted, etc.)
- Export for compliance

---

### 17.2 Organization Settings

**Admins** can configure:
- Brand guidelines (enforce voice consistency)
- Approval workflows (require review before publishing)
- Rate limits per user (prevent abuse)
- Data retention policies (how long to keep logs)

---

### 17.3 Security Settings

**2FA Enforcement**:
- Require all users to enable 2FA
- `/dashboard/settings/security` → ✅ Enforce 2FA

**API Access Logs**:
- View all API requests
- Filter by user, endpoint, date
- Detect unusual activity

**OAuth Token Management**:
- View all connected social accounts
- Force re-authentication
- Revoke tokens

---

## 18. Troubleshooting

### 18.1 Common Issues

#### Issue 1: Content Not Publishing

**Symptoms**: Content scheduled but doesn't publish at scheduled time.

**Causes & Solutions**:
1. **OAuth token expired**:
   - Go to `/dashboard/social/accounts`
   - Look for ⚠️ warning icon
   - Click [Reconnect] → Re-auth

2. **Rate limit exceeded**:
   - Check platform limits (Twitter: 50/day)
   - Space out posts more
   - Upgrade to higher tier

3. **Platform API down**:
   - Check https://status.twitter.com (etc.)
   - Epic AI will auto-retry (3 attempts)
   - If all fail, alerts you via email

4. **Image upload failed** (Instagram):
   - Image too large (max 8MB)
   - Regenerate smaller image
   - Or upload manually

---

#### Issue 2: Voice Agent Not Answering Calls

**Symptoms**: Calls to agent's number go unanswered.

**Causes & Solutions**:
1. **Agent inactive**:
   - `/dashboard/voice/agents`
   - Ensure status is ✅ Active
   - Click [Activate] if needed

2. **Phone number not provisioned**:
   - Check agent settings
   - Click [Provision Number]

3. **LiveKit outage**:
   - Check https://status.livekit.io
   - Wait for resolution

4. **Call forwarding misconfigured**:
   - Check forwarding number is correct
   - Test with [📞 Test Call]

---

#### Issue 3: Analytics Not Updating

**Symptoms**: Dashboard metrics haven't updated in hours/days.

**Causes & Solutions**:
1. **Cron job not running**:
   - Admin checks server logs
   - Restart cron service

2. **Platform API permissions insufficient**:
   - Social account lacks "read insights" permission
   - Reconnect account with full permissions

3. **No recent activity**:
   - If no posts in 7 days, nothing to collect
   - Create and publish content

4. **Manual refresh**:
   - Click [Sync Now] in `/dashboard/analytics`
   - Force immediate data pull

---

#### Issue 4: AI Content Generation Failing

**Symptoms**: Click "Generate with AI" → Error message.

**Causes & Solutions**:
1. **OpenAI API down**:
   - Check https://status.openai.com
   - Wait for resolution

2. **Rate limit (OpenAI)**:
   - Too many requests in short time
   - Wait 1 minute, try again

3. **Brand Brain incomplete**:
   - Go to `/dashboard/brand`
   - Ensure all fields filled (voice, tone, pillars)

4. **Context source broken**:
   - Website down or blocking scraper
   - Remove problematic context source
   - Try again

---

### 18.2 Getting Help

**Self-Service**:
1. **Knowledge Base**: https://docs.epic.dm
   - Searchable articles
   - Video tutorials
   - API docs

2. **Community Forum**: https://community.epic.dm
   - Ask questions
   - See common issues
   - User-contributed tips

3. **Status Page**: https://status.epic.dm
   - Real-time system status
   - Incident history

**Contact Support**:
1. **In-App Chat**: Click chat icon (bottom right)
   - Response time: 4 hours (business hours)

2. **Email**: support@epic.dm
   - Response time: 24 hours

3. **Priority Support** (Pro/Agency plans):
   - Dedicated Slack channel
   - Response time: 1 hour
   - Screen sharing support

**Emergency Contact** (for outages):
- Email: emergencies@epic.dm
- Response time: 30 minutes

---

## 19. Best Practices

### 19.1 Content Creation Best Practices

✅ **Do**:
1. Use content pillars for consistency
2. Add context sources (website, PDFs) for accuracy
3. Review AI output before approving (catch errors)
4. A/B test different tones and topics
5. Batch-create content (7 days worth at once)
6. Use auto-scheduling for optimal engagement

❌ **Don't**:
1. Copy-paste same content to all platforms (Epic AI auto-optimizes)
2. Over-rely on AI without review (always check facts)
3. Ignore analytics (use insights to improve)
4. Post off-brand topics (stick to pillars)
5. Spam followers (quality > quantity)

---

### 19.2 Voice AI Best Practices

✅ **Do**:
1. Train agents with knowledge base documents
2. Test before activating (use [Test Call])
3. Set clear conversation goals (qualify, schedule, FAQ)
4. Enable transfer to human for complex issues
5. Review call logs weekly (spot improvement opportunities)

❌ **Don't**:
1. Launch without testing (agents can say wrong things)
2. Overpromise ("We can do everything!")
3. Skip call logging/review (miss learning opportunities)
4. Ignore customer feedback on agent quality
5. Use agents for highly sensitive topics (legal, medical)

---

### 19.3 Lead Management Best Practices

✅ **Do**:
1. Respond to leads within 5 minutes (3x better conversion)
2. Use voice agents for instant follow-up
3. Track all interactions in one place
4. Score leads automatically (focus on hot leads)
5. Create journeys to see full customer path

❌ **Don't**:
1. Let leads go cold (follow up within 24 hours)
2. Manually copy-paste lead data (automate with Epic AI)
3. Ignore low-score leads (nurture campaigns work)
4. Lose context (Epic AI tracks all touchpoints)

---

### 19.4 Analytics Best Practices

✅ **Do**:
1. Check AI insights weekly (apply recommendations)
2. Track synergy rate (multi-channel effectiveness)
3. Measure ROI (time saved, leads generated)
4. Export reports monthly (show exec team)
5. Adjust Brand Brain based on learnings

❌ **Don't**:
1. Obsess over vanity metrics (likes, follows)
2. Ignore low-performing content patterns
3. Change strategy too frequently (give AI time to learn)
4. Skip A/B testing (always test before scaling)

---

## 20. FAQ

### Q1: How much does Epic AI cost?

**A**: Three plans:
- **Starter**: $297/month (1 brand, 500 posts/month, 1 voice agent)
- **Professional**: $597/month (3 brands, unlimited posts, 5 voice agents)
- **Agency**: $1,497/month (unlimited brands, 20 voice agents, white-label)

---

### Q2: Can I try before I buy?

**A**: Yes! 14-day free trial, no credit card required.

---

### Q3: What social platforms are supported?

**A**: Twitter/X, LinkedIn, Facebook, Instagram. More coming soon (TikTok, YouTube).

---

### Q4: How does Epic AI connect to social platforms?

**A**: Native OAuth 2.0 (no third-party dependencies). You authorize Epic AI app, and we store encrypted tokens.

---

### Q5: Is my data safe?

**A**: Yes. OAuth tokens encrypted with AES-256-GCM. SOC 2 compliant. Never share data with third parties.

---

### Q6: Can I cancel anytime?

**A**: Yes, cancel anytime. Prorated refund for unused time.

---

### Q7: How does the AI learning loop work?

**A**: Every week, AI analyzes your performance → Identifies patterns → Generates insights → Saves to Brand Brain → Uses insights in future content. The more you use it, the smarter it gets.

---

### Q8: Can I use Epic AI for multiple brands?

**A**: Yes. Professional plan: 3 brands. Agency plan: unlimited brands.

---

### Q9: Do I need technical skills?

**A**: No. Epic AI is designed for marketers, not developers. No coding required. API available for developers.

---

### Q10: What happens if a voice agent makes a mistake?

**A**: Agents are trained on your knowledge base and tested before activation. If an issue occurs:
1. Call logs track all conversations
2. You can review and flag errors
3. Retrain agent or add to knowledge base
4. For critical calls, enable human transfer

---

### Q11: Can I white-label Epic AI for my clients?

**A**: Yes, on the Agency plan ($1,497/month). Custom branding, client sub-accounts, revenue sharing available.

---

### Q12: How long does onboarding take?

**A**: 15 minutes. The 5-Phase Flywheel Wizard guides you through Brand Brain setup, social connections, and first automation.

---

### Q13: Do I need to use all features?

**A**: No. Use what you need:
- Content only: Skip voice AI
- Voice only: Skip social publishing
- Analytics only: Use as reporting tool

Epic AI is modular - use what makes sense for your business.

---

### Q14: Can Epic AI replace [HubSpot/Buffer/Bland AI]?

**A**: Yes. Epic AI consolidates:
- HubSpot Marketing Hub → Content + analytics
- Buffer/Hootsuite → Social scheduling
- Bland AI → Voice agents
- Calendly → Scheduling (via voice agents)

Cost: $1,470+/month → $597/month (60% savings)

---

### Q15: What if I hit my voice minutes limit?

**A**: Professional plan: 1,000 min/month. If you exceed:
- Overages charged at $0.10/min
- Or upgrade to Agency plan (5,000 min/month)
- Usage alerts sent at 80% and 100%

---

### Q16: Can I export my data?

**A**: Yes. All data exportable:
- Leads → CSV
- Analytics → CSV/PDF/PowerPoint
- Content → Markdown/HTML
- Call logs → JSON

No vendor lock-in.

---

### Q17: Does Epic AI support multiple languages?

**A**: Currently English only. Spanish, French, German coming Q2 2026.

---

### Q18: How accurate is the AI content generation?

**A**: GPT-4o is highly accurate, but **always review before publishing**. Epic AI is a tool to augment your team, not replace human judgment.

---

### Q19: Can I schedule content months in advance?

**A**: Yes. No limit on future scheduling. Common use: Plan Q1 content in December.

---

### Q20: What if a platform changes its API?

**A**: We monitor platform APIs 24/7. If changes occur, we update Epic AI within 24-48 hours. You'll receive email notification.

---

**Still have questions?** Email support@epic.dm or visit https://docs.epic.dm

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Quick search / command palette |
| `Cmd/Ctrl + N` | New content |
| `Cmd/Ctrl + S` | Save draft |
| `Cmd/Ctrl + Enter` | Publish now |
| `Cmd/Ctrl + Shift + S` | Schedule content |
| `Esc` | Close modal |
| `?` | Show keyboard shortcuts |
| `G then D` | Go to Dashboard |
| `G then C` | Go to Content |
| `G then A` | Go to Analytics |
| `G then L` | Go to Leads |

---

## Appendix B: Platform Specifications

### Twitter/X
- Character limit: 280
- Image: Max 5MB (JPG, PNG, GIF, WebP)
- Video: Max 512MB, 2:20 duration
- Hashtags: 1-2 recommended
- Optimal times: Weekdays 9am-3pm EST

### LinkedIn
- Character limit: 3,000 (posts), 1,300 (comments)
- Image: Max 10MB
- Video: Max 5GB, 10 min
- Hashtags: 3-5 recommended
- Optimal times: Tue-Thu 10am-12pm EST

### Facebook
- Character limit: 63,206
- Image: Max 10MB
- Video: Max 4GB, 240 min
- Hashtags: Minimal (algorithm doesn't rely on them)
- Optimal times: Weekdays 1-3pm EST

### Instagram
- Character limit: 2,200
- Image: Max 8MB (1:1, 4:5, 9:16 aspect ratios)
- Video: Max 100MB, 60s (feed), 15min (IGTV)
- Hashtags: 5-10 recommended (max 30)
- Optimal times: Daily 6-9pm EST

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Brand Brain** | Core AI intelligence storing brand voice, audiences, pillars, learnings |
| **Content Pillar** | Core theme/topic your brand posts about (e.g., "Customer Stories") |
| **Context Engine** | System that ingests external data (website, PDFs) to inform content |
| **Flywheel** | Self-improving 5-phase system (Understand → Create → Distribute → Learn → Automate) |
| **Learning Loop** | AI analyzes performance → Generates insights → Improves content over time |
| **Native OAuth** | Direct API connection to platforms (no third-party middleman) |
| **Synergy Rate** | % of leads who interact via 2+ channels before converting |
| **Voice Agent** | AI-powered conversational agent for handling phone calls |
| **Cross-Channel Journey** | Customer path across multiple touchpoints (social → voice → email → sale) |

---

**End of User & Admin Manual**

*Last updated: January 2026 | Version 2.0*

*For the latest documentation, visit: https://docs.epic.dm*
