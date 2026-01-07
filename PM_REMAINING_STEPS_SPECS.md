# Remaining 9 Steps - Streamlined Wizard Specs

**PM Specs for Claude Code** | Dec 31, 2025  
**Status**: Steps 1-3 (UNDERSTAND) ✅ Complete | Steps 4-12 (remaining) → Specs below

---

## Overview

**Completed** ✅:
- Step 1: Brand Identity
- Step 2: Voice & Tone
- Step 3: Content Strategy

**To Build** (9 steps):
- Steps 4-5: CREATE phase (2 steps)
- Steps 6-8: DISTRIBUTE phase (3 steps)
- Steps 9-10: LEARN phase (2 steps)
- Steps 11-12: AUTOMATE phase (2 steps)

---

## CREATE Phase (Steps 4-5)

### Step 4: Content Types ✏️

**File**: `content-types-step.tsx`

**Purpose**: Select which content formats to enable

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 4: Content Types               │
│ Enable the post types you want     │
├─────────────────────────────────────┤
│                                     │
│ Select Content Types:               │
│                                     │
│ ☑️ Text Posts                       │
│   Short-form written content        │
│                                     │
│ ☑️ Images                           │
│   Visual posts with captions        │
│                                     │
│ ☐ Carousels                         │
│   Multi-image swipeable posts       │
│                                     │
│ ☐ Videos                            │
│   Short-form video content          │
│                                     │
│ ☐ Stories                           │
│   24-hour ephemeral content         │
│                                     │
│ ☐ Polls                             │
│   Interactive questions             │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface ContentTypesData {
  enabledTypes: ContentType[];
}

type ContentType = "text" | "image" | "carousel" | "video" | "story" | "poll";
```

**Defaults**:
- Pre-select: `text`, `image` (most common)
- Others optional

**Validation**:
- At least 1 type must be selected

**Component Code**:
```typescript
import { Card, CardBody, Checkbox, Chip } from "@heroui/react";
import { FileText, Image, Layers, Video, Clock, PieChart } from "lucide-react";

const CONTENT_TYPES = [
  { 
    id: "text", 
    label: "Text Posts", 
    description: "Short-form written content",
    icon: FileText,
    recommended: true,
  },
  { 
    id: "image", 
    label: "Images", 
    description: "Visual posts with captions",
    icon: Image,
    recommended: true,
  },
  { 
    id: "carousel", 
    label: "Carousels", 
    description: "Multi-image swipeable posts",
    icon: Layers,
    recommended: false,
  },
  // ... other types
];

export function ContentTypesStep({ data, onComplete }) {
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(
    data?.enabledTypes || ["text", "image"]
  );

  const handleToggle = (typeId: ContentType) => {
    setSelectedTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleContinue = () => {
    onComplete({ enabledTypes: selectedTypes });
  };

  return (
    <div className="space-y-4">
      {CONTENT_TYPES.map(type => {
        const Icon = type.icon;
        const isSelected = selectedTypes.includes(type.id);
        
        return (
          <Card
            key={type.id}
            isPressable
            className={isSelected ? "border-2 border-primary" : ""}
            onPress={() => handleToggle(type.id)}
          >
            <CardBody className="flex flex-row items-center gap-4">
              <Checkbox isSelected={isSelected} />
              <Icon className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{type.label}</p>
                  {type.recommended && (
                    <Chip size="sm" color="primary" variant="flat">
                      Recommended
                    </Chip>
                  )}
                </div>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
```

---

### Step 5: First Content 🎨

**File**: `first-content-step.tsx`

**Purpose**: AI generates sample content for review

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 5: First Content               │
│ Review AI-generated sample posts    │
├─────────────────────────────────────┤
│                                     │
│ [Generate Content] (AI button)     │
│                                     │
│ Generated Posts (3):                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Post 1: Educational             │ │
│ │ "5 ways to boost engagement..." │ │
│ │ Platform: LinkedIn              │ │
│ │ [Edit] [Regenerate]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Post 2: Promotional             │ │
│ │ "New feature announcement..."   │ │
│ │ Platform: Twitter               │ │
│ │ [Edit] [Regenerate]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Post 3: Engaging                │ │
│ │ "What's your favorite..."       │ │
│ │ Platform: Instagram             │ │
│ │ [Edit] [Regenerate]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface FirstContentData {
  generatedContent: GeneratedPost[];
}

interface GeneratedPost {
  id: string;
  content: string;
  platform: string;
  contentType: string; // educational, promotional, engaging
  status: "draft" | "approved";
}
```

**AI Integration**:
```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  
  const response = await fetch("/api/ai/generate-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandVoice: data.voiceTone,
      personality: data.personality,
      contentPillars: data.contentPillars,
      count: 3,
    }),
  });
  
  const { posts } = await response.json();
  setGeneratedContent(posts);
  setIsGenerating(false);
};
```

**Features**:
- AI generates 3 diverse posts (educational, promotional, engaging)
- User can edit inline
- User can regenerate individual posts
- Auto-generates on step entry

---

## DISTRIBUTE Phase (Steps 6-8)

### Step 6: Connect Accounts 🔗

**File**: `connect-accounts-step.tsx`

**Purpose**: OAuth connection to social platforms

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 6: Connect Social Accounts     │
│ Link at least one platform          │
├─────────────────────────────────────┤
│                                     │
│ Available Platforms:                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🐦 Twitter/X                    │ │
│ │ Not connected                   │ │
│ │             [Connect Account] → │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💼 LinkedIn                     │ │
│ │ ✅ Connected as @yourname       │ │
│ │             [Disconnect]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📘 Facebook                     │ │
│ │ Not connected                   │ │
│ │             [Connect Account] → │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📷 Instagram                    │ │
│ │ Not connected                   │ │
│ │             [Connect Account] → │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Back]              [Continue] →    │
│                     (requires ≥1)   │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface ConnectAccountsData {
  connectedAccounts: ConnectedAccount[];
}

interface ConnectedAccount {
  platform: string;
  handle: string;
  accountId: string;
  connectedAt: Date;
}
```

**OAuth Flow**:
```typescript
const handleConnect = (platform: string) => {
  // Trigger OAuth flow
  window.location.href = `/api/auth/${platform}/connect?redirect=/setup?mode=guided&step=6`;
};
```

**Validation**:
- At least 1 account must be connected to proceed

---

### Step 7: Posting Schedule 📅

**File**: `posting-schedule-step.tsx`

**Purpose**: Set weekly posting times

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 7: Posting Schedule            │
│ When should we post?                │
├─────────────────────────────────────┤
│                                     │
│ Timezone: America/New_York ⏰       │
│ [Auto-detect] [Change]              │
│                                     │
│ Weekly Schedule:                    │
│                                     │
│ Monday     ☑️ 9:00 AM  ☑️ 5:00 PM   │
│ Tuesday    ☑️ 9:00 AM  ☑️ 5:00 PM   │
│ Wednesday  ☑️ 9:00 AM  ☑️ 5:00 PM   │
│ Thursday   ☑️ 9:00 AM  ☑️ 5:00 PM   │
│ Friday     ☑️ 9:00 AM  ☐ 5:00 PM    │
│ Saturday   ☐          ☐             │
│ Sunday     ☐          ☐             │
│                                     │
│ [AI Suggest Optimal Times]          │
│                                     │
│ Posts per week: 9                   │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface PostingScheduleData {
  timezone: string;
  schedule: WeeklySchedule;
}

interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  // ... other days
}

interface TimeSlot {
  time: string; // "09:00"
  enabled: boolean;
}
```

**Smart Defaults**:
- Auto-detect timezone
- Pre-fill 9AM and 5PM weekdays (business hours)
- ~9 posts/week default

**AI Assist**:
```typescript
const handleAISuggest = async () => {
  const response = await fetch("/api/ai/suggest-schedule", {
    method: "POST",
    body: JSON.stringify({
      industry: data.industry,
      platforms: data.connectedAccounts.map(a => a.platform),
    }),
  });
  
  const { optimalTimes } = await response.json();
  setSchedule(optimalTimes);
};
```

---

### Step 8: First Post 🚀

**File**: `first-post-step.tsx`

**Purpose**: Schedule or publish first piece of content

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 8: Your First Post             │
│ Let's publish something!            │
├─────────────────────────────────────┤
│                                     │
│ Select a post to publish:           │
│                                     │
│ ○ Post 1 (Educational)              │
│   "5 ways to boost engagement..."   │
│   Platform: LinkedIn                │
│                                     │
│ ● Post 2 (Promotional) ←selected    │
│   "New feature announcement..."     │
│   Platform: Twitter                 │
│                                     │
│ ○ Post 3 (Engaging)                 │
│   "What's your favorite..."         │
│   Platform: Instagram               │
│                                     │
│ ○ Skip for now                      │
│                                     │
│ When to publish:                    │
│ ○ Publish now                       │
│ ● Schedule for: [Jan 1, 9:00 AM]   │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface FirstPostData {
  selectedPostId: string | null;
  action: "publish_now" | "schedule" | "skip";
  scheduledTime?: Date;
}
```

**Options**:
1. Publish now (immediate)
2. Schedule for specific time
3. Skip (optional)

**Validation**:
- If "publish now" or "schedule", a post must be selected

---

## LEARN Phase (Steps 9-10)

### Step 9: Key Metrics 📊

**File**: `key-metrics-step.tsx`

**Purpose**: Select 3-5 priority metrics to track

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 9: Key Metrics                 │
│ What matters most to you?           │
├─────────────────────────────────────┤
│                                     │
│ Select 3-5 metrics to track:        │
│                                     │
│ ☑️ Engagement Rate                  │
│   Likes, comments, shares           │
│                                     │
│ ☑️ Reach                            │
│   People who see your content       │
│                                     │
│ ☑️ Click-through Rate               │
│   Link clicks from posts            │
│                                     │
│ ☐ Follower Growth                   │
│   New followers per week            │
│                                     │
│ ☐ Impressions                       │
│   Total content views               │
│                                     │
│ ☐ Conversions                       │
│   Goal completions                  │
│                                     │
│ ☐ Leads Generated                   │
│   Contact form submissions          │
│                                     │
│ Selected: 3 / 5                     │
│                                     │
│ Report Frequency:                   │
│ ● Weekly  ○ Bi-weekly  ○ Monthly   │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface KeyMetricsData {
  priorityMetrics: MetricType[];
  reportFrequency: "weekly" | "biweekly" | "monthly";
}

type MetricType = 
  | "engagement"
  | "reach"
  | "clicks"
  | "followers"
  | "impressions"
  | "conversions"
  | "leads";
```

**Defaults**:
- Pre-select: engagement, reach, clicks (most common)
- Weekly reports

**Validation**:
- 3-5 metrics must be selected

---

### Step 10: Optimization Goals 🎯

**File**: `optimization-goals-step.tsx`

**Purpose**: Define what AI should optimize for

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 10: Optimization Goals         │
│ What should AI improve?             │
├─────────────────────────────────────┤
│                                     │
│ Primary Goal:                       │
│ ● Maximize Engagement               │
│ ○ Grow Audience                     │
│ ○ Drive Traffic                     │
│ ○ Generate Leads                    │
│ ○ Increase Conversions              │
│                                     │
│ Target (optional):                  │
│ Reach [1000] engaged users/week     │
│                                     │
│ AI will:                            │
│ ✅ Analyze top-performing content   │
│ ✅ Suggest content improvements     │
│ ✅ Optimize posting times           │
│ ✅ Adjust content mix               │
│                                     │
│ [AI Suggest Goal] (based on        │
│                    industry)        │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface OptimizationGoalsData {
  primaryGoal: OptimizationGoal;
  target?: number;
}

type OptimizationGoal = 
  | "engagement"
  | "growth"
  | "traffic"
  | "leads"
  | "conversions";
```

**AI Assist**:
```typescript
const handleAISuggest = async () => {
  const response = await fetch("/api/ai/suggest-goal", {
    method: "POST",
    body: JSON.stringify({
      industry: data.industry,
      currentMetrics: data.priorityMetrics,
    }),
  });
  
  const { suggestedGoal, reasoning } = await response.json();
  // Show suggestion with reasoning
};
```

---

## AUTOMATE Phase (Steps 11-12)

### Step 11: Autopilot Settings ⚙️

**File**: `autopilot-settings-step.tsx`

**Purpose**: Configure AI automation level

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 11: Autopilot Settings         │
│ How much control do you want?       │
├─────────────────────────────────────┤
│                                     │
│ Approval Mode:                      │
│                                     │
│ ● Review Mode (Recommended)         │
│   AI generates, you approve         │
│                                     │
│ ○ Auto-Queue Mode                   │
│   AI generates and schedules        │
│   You can edit before publish       │
│                                     │
│ ○ Auto-Post Mode (Autopilot)        │
│   AI generates and publishes        │
│   Fully automated                   │
│                                     │
│ Posts per Week: [7] ─────────●──    │
│                     (1-21)          │
│                                     │
│ Content Mix:                        │
│ Educational:    40% ────●───        │
│ Promotional:    20% ──●─────        │
│ Entertaining:   20% ──●─────        │
│ Engaging:       20% ──●─────        │
│                                     │
│ [AI Suggest Mix] (based on goals)  │
│                                     │
│ [Back]              [Continue] →    │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface AutopilotSettingsData {
  approvalMode: "review" | "auto_queue" | "auto_post";
  postsPerWeek: number;
  contentMix: ContentMix;
}

interface ContentMix {
  educational: number;   // percentage
  promotional: number;
  entertaining: number;
  engaging: number;
}
```

**Defaults**:
- Review mode (safest)
- 7 posts/week (1 per day)
- Content mix: 40% educational, 20% each for others

**AI Assist**:
- Suggest content mix based on optimization goals
- Industry best practices

---

### Step 12: Review & Activate 🎉

**File**: `review-activate-step.tsx`

**Purpose**: Final review and flywheel activation

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Step 12: Review & Activate          │
│ You're ready to launch! 🚀          │
├─────────────────────────────────────┤
│                                     │
│ Setup Summary:                      │
│                                     │
│ ✅ Brand Brain                      │
│    Industry: SaaS                   │
│    Voice: Professional, Innovative  │
│    2 audiences, 4 content pillars   │
│                                     │
│ ✅ Content Factory                  │
│    Types: Text, Images              │
│    3 posts generated                │
│                                     │
│ ✅ Publishing Engine                │
│    Platforms: LinkedIn, Twitter     │
│    Schedule: 9 posts/week           │
│    First post scheduled             │
│                                     │
│ ✅ Analytics                        │
│    Tracking: Engagement, Reach      │
│    Goal: Maximize Engagement        │
│    Reports: Weekly                  │
│                                     │
│ ✅ AI Autopilot                     │
│    Mode: Review (you approve)       │
│    Frequency: 7 posts/week          │
│    Mix: 40% edu, 20% promo...       │
│                                     │
│ [Edit Settings]                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚡ Ready to Activate Flywheel   │ │
│ │                                 │ │
│ │ AI will start generating        │ │
│ │ content based on your settings. │ │
│ │                                 │ │
│ │ [🚀 Activate Flywheel]          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Back]                              │
└─────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface ReviewActivateData {
  confirmed: boolean;
  activatedAt?: Date;
}
```

**Features**:
- Accordion sections for each phase (collapsible)
- "Edit" buttons to jump back to specific steps
- Big activation button
- Confirmation modal before activation

**Activation Flow**:
```typescript
const handleActivate = async () => {
  // Show confirmation modal
  const confirmed = await confirmActivation();
  if (!confirmed) return;

  setIsActivating(true);
  
  try {
    // Save all data and activate flywheel
    await fetch("/api/flywheel/activate", {
      method: "POST",
      body: JSON.stringify(wizardData),
    });
    
    // Redirect to dashboard with success message
    router.push("/dashboard?flywheel=activated");
  } catch (error) {
    // Handle error
  } finally {
    setIsActivating(false);
  }
};
```

---

## Shared Features (All Steps)

### Navigation Footer
Every step should have:
```tsx
<div className="flex justify-between items-center mt-8 pt-6 border-t">
  <Button
    variant="light"
    onPress={onBack}
    isDisabled={currentStep === 0}
  >
    ← Back
  </Button>
  
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-500">
      Step {currentStep + 1} of 12
    </span>
    
    <Button
      color="primary"
      onPress={onContinue}
      isDisabled={!canContinue}
    >
      Continue →
    </Button>
  </div>
</div>
```

### Auto-save
Every step should save progress on change:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    saveProgress(currentStep, stepData);
  }, 1000); // Debounce 1s
  
  return () => clearTimeout(timer);
}, [stepData]);
```

### Progress Indicator
Show in header:
```tsx
<Progress 
  value={(currentStep / 12) * 100}
  size="sm"
  className="mb-6"
/>
```

---

## Implementation Checklist

**CREATE Phase**:
- [ ] `content-types-step.tsx` (checkboxes for types)
- [ ] `first-content-step.tsx` (AI generation + edit)

**DISTRIBUTE Phase**:
- [ ] `connect-accounts-step.tsx` (OAuth buttons)
- [ ] `posting-schedule-step.tsx` (weekly calendar + timezone)
- [ ] `first-post-step.tsx` (select + schedule)

**LEARN Phase**:
- [ ] `key-metrics-step.tsx` (metric selection + frequency)
- [ ] `optimization-goals-step.tsx` (goal selection + target)

**AUTOMATE Phase**:
- [ ] `autopilot-settings-step.tsx` (approval mode + content mix)
- [ ] `review-activate-step.tsx` (summary + activation)

**Integration**:
- [ ] Update `streamlined-steps/index.ts` with all exports
- [ ] Update main wizard to render all 12 steps
- [ ] Test full flow end-to-end

---

## Testing Scenarios

**Full Flow Test**:
1. Start at `/setup?mode=guided`
2. Complete all 12 steps
3. Click "Activate Flywheel"
4. Verify redirect to dashboard with success
5. Check DB: flywheel activated, all data saved

**Resume Test**:
1. Complete steps 1-7
2. Close browser
3. Return to `/setup?mode=guided`
4. Should resume at step 8
5. Complete remaining steps

**Validation Test**:
1. Try to skip required fields
2. Should not allow "Continue"
3. Fill required fields
4. "Continue" should work

**AI Assist Test**:
1. Use "AI Suggest" on multiple steps
2. Verify AI responses reasonable
3. User can override AI suggestions

---

## API Endpoints Needed

**Existing** (reuse):
- `POST /api/flywheel/progress` (save step data)
- `POST /api/flywheel/activate` (activate flywheel)

**New** (may need to create):
- `POST /api/ai/generate-content` (step 5 - first content)
- `POST /api/ai/suggest-schedule` (step 7 - optimal times)
- `POST /api/ai/suggest-goal` (step 10 - optimization goal)
- `POST /api/ai/suggest-content-mix` (step 11 - content mix)

*Note: These can be stubbed initially and improved later*

---

**Ready for Claude Code to implement remaining 9 steps.**
