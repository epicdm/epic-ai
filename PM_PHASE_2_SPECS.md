# Phase 2 Implementation Specs - Streamlined Setup

**PM Specs for Claude Code** | Dec 31, 2025  
**Phase**: High Value Features  
**Goal**: Fast, intuitive setup experience (5-15 min to activation)

---

## Overview

Phase 1 ✅ gave users a single entry point with 3 path choices.  
Phase 2 builds the **actual wizard experiences** for those paths.

**Priority Order**:
1. Task 4: Streamlined 12-step wizard (Guided path) 
2. Task 5: Enhance Bird's Eye AI wizard (AI Express path)
3. Task 6: Progress dashboard (Setup hub improvements)

---

## TASK 4: Create Streamlined 12-Step Wizard

### Goal
Reduce manual setup from 32 steps → 12 essential steps with smart defaults

### Current State
- Guided mode redirects to `/setup?mode=guided`
- Users see existing 5-phase hub with 32 total steps
- No streamlined experience exists

### Target State
- Users see single unified wizard with 12 steps
- Progress bar shows overall completion (not per-phase)
- "AI Assist" button on relevant steps
- Can save & exit anytime, resume later

---

### Step Reduction Strategy

**Current (32 steps across 5 wizards)**:
- UNDERSTAND: 9 steps
- CREATE: 6 steps  
- DISTRIBUTE: 6 steps
- LEARN: 5 steps
- AUTOMATE: 6 steps

**Streamlined (12 essential steps)**:

#### UNDERSTAND (3 steps → Core identity)
1. **Brand Identity** (merge: identity + industry)
   - AI-assisted: Yes (from template)
   - Fields: Brand name, description, mission, industry
   - Skip: website analysis, social profiles (optional)

2. **Voice & Tone** (keep as-is)
   - AI-assisted: Yes (from template)
   - Fields: Formality (1-5), personality traits, writing style
   - Show template defaults, allow editing

3. **Content Strategy** (merge: audiences + pillars + competitors)
   - AI-assisted: Yes (from template)
   - Fields: 1-2 target audiences, 3-4 content pillars
   - Skip: detailed competitor analysis (optional)

#### CREATE (2 steps → Content setup)
4. **Content Types** (keep as-is)
   - AI-assisted: No
   - Fields: Enable post types (text, image, carousel, video)
   - Skip: templates, media settings (use defaults)

5. **First Content** (keep as-is)
   - AI-assisted: Yes (generate 3 sample posts)
   - Fields: Review & approve generated content
   - Skip: hashtag strategy (apply defaults)

#### DISTRIBUTE (3 steps → Publishing setup)
6. **Connect Accounts** (keep as-is)
   - AI-assisted: No
   - Fields: OAuth connection to social platforms
   - Required: At least 1 account

7. **Posting Schedule** (merge: schedule + timezone)
   - AI-assisted: Yes (suggest optimal times)
   - Fields: Days of week, times, timezone
   - Skip: per-platform settings (apply globally)

8. **First Post** (keep as-is)
   - AI-assisted: No
   - Fields: Schedule or publish first content
   - Required: Commit to publishing

#### LEARN (2 steps → Analytics setup)
9. **Key Metrics** (merge: metrics + reporting)
   - AI-assisted: No
   - Fields: Select 3-5 priority metrics
   - Skip: detailed reporting schedule (use weekly default)

10. **Optimization Goals** (keep as-is)
    - AI-assisted: Yes (suggest based on industry)
    - Fields: What to optimize for (engagement, reach, conversions)
    - Skip: analytics intro (just do it)

#### AUTOMATE (2 steps → Activation)
11. **Autopilot Settings** (merge: approval + content mix + frequency)
    - AI-assisted: Yes (suggest content mix)
    - Fields: Approval mode, posts/week, content mix %
    - Skip: detailed notifications (use defaults)

12. **Review & Activate** (keep as-is)
    - AI-assisted: No
    - Fields: Review all settings, final confirmation
    - Action: Activate flywheel

---

### Component Structure

**New file**: `apps/web/src/components/flywheel/streamlined-flywheel-wizard.tsx`

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wizard, WizardStepContainer } from "@/components/ui/wizard";
import type { FlywheelState } from "@/lib/flywheel/types";

// Import streamlined step components
import {
  BrandIdentityStep,
  VoiceToneStep,
  ContentStrategyStep,
  ContentTypesStep,
  FirstContentStep,
  ConnectAccountsStep,
  PostingScheduleStep,
  FirstPostStep,
  KeyMetricsStep,
  OptimizationGoalsStep,
  AutopilotSettingsStep,
  ReviewActivateStep,
} from "./streamlined-steps";

const STREAMLINED_STEPS = [
  { id: "identity", title: "Brand Identity", phase: "UNDERSTAND" },
  { id: "voice", title: "Voice & Tone", phase: "UNDERSTAND" },
  { id: "strategy", title: "Content Strategy", phase: "UNDERSTAND" },
  { id: "types", title: "Content Types", phase: "CREATE" },
  { id: "first-content", title: "First Content", phase: "CREATE" },
  { id: "connect", title: "Connect Accounts", phase: "DISTRIBUTE" },
  { id: "schedule", title: "Posting Schedule", phase: "DISTRIBUTE" },
  { id: "first-post", title: "First Post", phase: "DISTRIBUTE" },
  { id: "metrics", title: "Key Metrics", phase: "LEARN" },
  { id: "goals", title: "Optimization Goals", phase: "LEARN" },
  { id: "autopilot", title: "Autopilot Settings", phase: "AUTOMATE" },
  { id: "activate", title: "Review & Activate", phase: "AUTOMATE" },
];

interface StreamlinedFlywheelWizardProps {
  initialData?: Partial<FlywheelState>;
  brandId: string;
}

export function StreamlinedFlywheelWizard({
  initialData,
  brandId,
}: StreamlinedFlywheelWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState(initialData || {});

  const handleStepComplete = async (stepData: Record<string, unknown>) => {
    // Merge step data
    setWizardData(prev => ({ ...prev, ...stepData }));
    
    // Save progress to DB
    await saveProgress(currentStep, stepData);
    
    // Move to next step
    if (currentStep < STREAMLINED_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    // Activate flywheel
    await activateFlywheel(wizardData);
    router.push("/dashboard?setup=complete");
  };

  return (
    <Wizard
      steps={STREAMLINED_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      showProgress
    >
      {/* Render current step component */}
      {currentStep === 0 && <BrandIdentityStep onComplete={handleStepComplete} data={wizardData} />}
      {currentStep === 1 && <VoiceToneStep onComplete={handleStepComplete} data={wizardData} />}
      {/* ... other steps */}
      {currentStep === 11 && <ReviewActivateStep onComplete={handleComplete} data={wizardData} />}
    </Wizard>
  );
}
```

---

### Streamlined Step Components

**New directory**: `apps/web/src/components/flywheel/streamlined-steps/`

Create these files:
- `brand-identity-step.tsx` (merge identity + industry)
- `voice-tone-step.tsx` (reuse from UnderstandWizard)
- `content-strategy-step.tsx` (merge audiences + pillars)
- `content-types-step.tsx` (reuse from CreateWizard)
- `first-content-step.tsx` (reuse from CreateWizard)
- `connect-accounts-step.tsx` (reuse from DistributeWizard)
- `posting-schedule-step.tsx` (merge schedule + timezone)
- `first-post-step.tsx` (reuse from DistributeWizard)
- `key-metrics-step.tsx` (merge metrics + reporting)
- `optimization-goals-step.tsx` (reuse from LearnWizard)
- `autopilot-settings-step.tsx` (merge approval + mix + frequency)
- `review-activate-step.tsx` (new - show full summary)
- `index.ts` (export all)

**Each step should**:
- Accept `data` prop (pre-filled from template or previous steps)
- Include "AI Assist" button where applicable
- Show smart defaults (from industry template)
- Have inline validation
- Emit `onComplete` with step data

---

### Routing Changes

**File**: `apps/web/src/app/(dashboard)/setup/page.tsx`

Update to detect `mode=guided`:

```typescript
// If mode=guided, show streamlined wizard instead of phase hub
const searchParams = await props.searchParams;
const mode = searchParams?.mode;

if (mode === "guided") {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StreamlinedFlywheelWizard 
        initialData={flywheelState}
        brandId={brand.id}
      />
    </div>
  );
}

// Otherwise show phase hub (expert mode)
return <SetupHub flywheelState={flywheelState} />;
```

---

### API Endpoints

**Reuse existing endpoints**:
- `POST /api/flywheel/progress` (save step data)
- `PATCH /api/flywheel/phases/*` (update phase status)
- `POST /api/flywheel/activate` (activate flywheel)

**No new endpoints needed** - just consolidate the data saving.

---

### Progress Tracking

Update `FlywheelProgress` saves:

```typescript
// When user completes step 3 (content strategy)
await prisma.flywheelProgress.update({
  where: { userId },
  data: {
    setupPath: "GUIDED",
    overallProgress: 25, // 3/12 = 25%
    lastActiveAt: new Date(),
    lastActiveStep: 3,
    understandData: { /* merged data */ },
    understandPhase: "IN_PROGRESS",
  },
});
```

---

## TASK 5: Enhance Bird's Eye AI Wizard

### Goal
Make AI setup the primary recommended path

### Current State
- `BirdEyeWizard` exists at `/setup/ai-setup`
- Works but buried in UI
- No clear "this is the fast way" messaging

### Target State
- Accessible at `/setup/ai` (already done in Phase 1 ✅)
- Enhanced with better UX
- Shows time savings
- Allows inline editing of AI suggestions

---

### Enhancements Needed

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

#### 1. Add Time Savings Indicator

```typescript
// In preview step, show savings
<Card className="bg-green-50 dark:bg-green-950/30 mb-4">
  <CardBody>
    <div className="flex items-center gap-3">
      <Clock className="w-5 h-5 text-green-600" />
      <div>
        <p className="font-semibold text-green-900 dark:text-green-100">
          AI saved you 25 minutes
        </p>
        <p className="text-sm text-green-700 dark:text-green-300">
          Manual setup would take 30+ minutes. AI did it in 60 seconds.
        </p>
      </div>
    </div>
  </CardBody>
</Card>
```

#### 2. Add Confidence Indicators

```typescript
// Show AI confidence for each phase
{phaseInfo.map((phase) => (
  <AccordionItem key={phase.key} title={phase.title}>
    {/* Existing content */}
    
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-gray-500">AI Confidence:</span>
      <Progress 
        value={configuration[phase.key].confidence * 100} 
        size="sm"
        color={getConfidenceColor(configuration[phase.key].confidence)}
      />
      <span className="text-xs font-medium">
        {Math.round(configuration[phase.key].confidence * 100)}%
      </span>
    </div>
  </AccordionItem>
))}
```

#### 3. Allow Inline Editing

```typescript
// In preview step, add edit buttons
<Button
  size="sm"
  variant="light"
  startContent={<Edit className="w-4 h-4" />}
  onPress={() => setEditingPhase(phase.key)}
>
  Edit
</Button>

// When editing, show inline form
{editingPhase === "understand" && (
  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
    <Input
      label="Brand Name"
      value={configuration.understand.brandName}
      onValueChange={(v) => updateConfig("understand", "brandName", v)}
    />
    {/* Other fields */}
    <Button onPress={() => setEditingPhase(null)}>Save</Button>
  </div>
)}
```

#### 4. Add "Customize Manually" Option

```typescript
// In preview step, offer escape hatch
<div className="flex gap-3 mt-6">
  <Button
    color="primary"
    size="lg"
    onPress={handleApplyAll}
  >
    Apply All & Activate
  </Button>
  
  <Button
    variant="bordered"
    size="lg"
    onPress={() => router.push("/setup?mode=guided")}
  >
    Customize Manually Instead
  </Button>
</div>
```

---

### Backend Changes

**File**: `apps/web/src/app/api/flywheel/ai-full-setup/route.ts`

Add confidence scores to AI analysis:

```typescript
export async function POST(req: Request) {
  const { websiteUrl, industry } = await req.json();
  
  // ... existing AI analysis
  
  return NextResponse.json({
    configuration: {
      understand: {
        ...understandData,
        confidence: 0.85, // AI confidence in this phase
      },
      create: {
        ...createData,
        confidence: 0.75,
      },
      // ... other phases
    },
    timeSaved: 25, // minutes saved vs manual
    analysisTime: 58, // seconds AI took
  });
}
```

---

## TASK 6: Progress Dashboard (Setup Hub)

### Goal
Users see overall progress and can switch modes

### Current State
- `/setup` shows phase cards
- No overall progress indicator
- No mode switching

### Target State
- Clear progress at top (e.g. "60% complete")
- Quick mode switcher
- Visual phase completion status

---

### Dashboard Enhancement

**File**: `apps/web/src/app/(dashboard)/setup/page.tsx`

Already has `SetupHeader` from Phase 1 ✅

**Add progress visualization**:

```typescript
<div className="max-w-4xl mx-auto p-6">
  {/* Setup Header with mode switcher (done in Phase 1) */}
  <SetupHeader currentMode={mode} overallProgress={overallProgress} />
  
  {/* Overall Progress Card */}
  <Card className="mb-6">
    <CardBody>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Setup Progress</h3>
        <span className="text-2xl font-bold text-primary">
          {overallProgress}%
        </span>
      </div>
      
      <Progress 
        value={overallProgress} 
        size="lg"
        classNames={{
          indicator: "bg-gradient-to-r from-purple-500 to-pink-500"
        }}
      />
      
      <p className="text-sm text-gray-500 mt-2">
        {getProgressMessage(overallProgress)}
      </p>
    </CardBody>
  </Card>
  
  {/* Phase Status Cards */}
  <div className="grid gap-4">
    {PHASES.map(phase => (
      <PhaseStatusCard
        key={phase.id}
        phase={phase}
        status={flywheelState.phases[phase.id].status}
        progress={flywheelState.phases[phase.id].progress}
        currentMode={mode}
      />
    ))}
  </div>
</div>
```

---

### Phase Status Card

**New component**: `apps/web/src/components/setup/phase-status-card.tsx`

```typescript
export function PhaseStatusCard({ phase, status, progress, currentMode }) {
  const getStatusIcon = () => {
    if (status === "COMPLETED") return <CheckCircle className="text-green-500" />;
    if (status === "IN_PROGRESS") return <Loader className="text-blue-500 animate-spin" />;
    return <Circle className="text-gray-400" />;
  };
  
  const getActionButton = () => {
    if (status === "COMPLETED") {
      return <Button size="sm" variant="light">Review</Button>;
    }
    
    if (status === "IN_PROGRESS") {
      return <Button size="sm" color="primary">Continue</Button>;
    }
    
    // Not started - check dependencies
    const canStart = checkDependencies(phase);
    return (
      <Button 
        size="sm" 
        variant="bordered"
        isDisabled={!canStart}
      >
        {canStart ? "Start" : "Locked"}
      </Button>
    );
  };
  
  return (
    <Card>
      <CardBody className="flex flex-row items-center gap-4">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{phase.name}</h4>
            {status === "IN_PROGRESS" && (
              <Chip size="sm" color="primary" variant="flat">
                {progress}% complete
              </Chip>
            )}
          </div>
          <p className="text-sm text-gray-600">{phase.description}</p>
          
          {status === "IN_PROGRESS" && (
            <Progress value={progress} size="sm" className="mt-2" />
          )}
        </div>
        
        <div className="flex-shrink-0">
          {getActionButton()}
        </div>
      </CardBody>
    </Card>
  );
}
```

---

## Testing Scenarios

### Scenario 1: Guided Path (12 steps)
1. Complete onboarding → choose "Guided Setup"
2. See streamlined wizard with 12 steps
3. Use AI Assist on step 2 (voice & tone)
4. Complete all 12 steps
5. Click "Activate Flywheel"
6. **Verify**: User completes in ~15 minutes

### Scenario 2: AI Express Path
1. Complete onboarding → choose "AI Express"
2. Enter website URL
3. Wait 60 seconds for AI analysis
4. See preview with confidence scores
5. Edit one field inline
6. Click "Apply All & Activate"
7. **Verify**: User completes in ~5 minutes

### Scenario 3: Mode Switching
1. Start guided mode (complete 3 steps)
2. Switch to AI Express (use header switcher)
3. AI pre-fills remaining steps
4. Continue from where left off
5. **Verify**: No data loss, smooth transition

### Scenario 4: Progress Dashboard
1. Complete 60% of setup
2. Return next day
3. See setup page with progress indicator
4. See "Continue" button on in-progress phase
5. Resume where left off
6. **Verify**: Clear progress, easy resume

---

## Success Criteria

**Guided Path**:
- ✅ 12 steps (not 32)
- ✅ Smart defaults pre-filled
- ✅ AI Assist available on 8/12 steps
- ✅ Can complete in 15 minutes
- ✅ Save & resume works

**AI Express Path**:
- ✅ Analysis completes in <90 seconds
- ✅ Confidence scores shown
- ✅ Inline editing works
- ✅ Can complete in 5 minutes
- ✅ Time savings displayed

**Progress Dashboard**:
- ✅ Overall progress visible
- ✅ Phase status clear
- ✅ Mode switching works
- ✅ "Continue" goes to right place
- ✅ Dependencies enforced

---

## Implementation Order

1. **Task 4 (Streamlined Wizard)** - 4-6 hours
   - Creates the guided path experience
   - Highest impact for manual setup users

2. **Task 5 (AI Wizard Enhancement)** - 2-3 hours
   - Improves AI Express path
   - Shows time savings, builds confidence

3. **Task 6 (Progress Dashboard)** - 2-3 hours
   - Improves setup hub UX
   - Helps users track progress

**Total Phase 2 estimate**: 8-12 hours of dev work

---

## Files to Create/Modify

### Create:
```
apps/web/src/components/flywheel/
  ├── streamlined-flywheel-wizard.tsx (main wizard)
  └── streamlined-steps/
      ├── brand-identity-step.tsx
      ├── voice-tone-step.tsx
      ├── content-strategy-step.tsx
      ├── content-types-step.tsx
      ├── first-content-step.tsx
      ├── connect-accounts-step.tsx
      ├── posting-schedule-step.tsx
      ├── first-post-step.tsx
      ├── key-metrics-step.tsx
      ├── optimization-goals-step.tsx
      ├── autopilot-settings-step.tsx
      ├── review-activate-step.tsx
      └── index.ts

apps/web/src/components/setup/
  └── phase-status-card.tsx
```

### Modify:
```
apps/web/src/components/flywheel/shared/
  └── birdeye-wizard.tsx (enhance with confidence scores, inline editing)

apps/web/src/app/(dashboard)/setup/
  └── page.tsx (add progress dashboard)

apps/web/src/app/api/flywheel/ai-full-setup/
  └── route.ts (add confidence scores)
```

---

**Ready to hand off to Claude Code for Phase 2 implementation.**
