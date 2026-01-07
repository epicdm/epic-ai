# Task 6: Progress Dashboard for /setup

**PM Specs for Claude Code** | Dec 31, 2025  
**Status**: Tasks 4 & 5 ✅ Complete | Task 6 → Final Phase 2 task  
**Goal**: Visual progress tracking and easy resume

---

## Overview

**Current State**:
- `/setup` shows phase hub with 5 phase cards
- No overall progress indicator
- No clear resume functionality
- No mode indicator

**Gaps**:
- Users can't see how far along they are (e.g., "60% complete")
- No indication of which mode they're in (guided/expert)
- Can't easily resume from last active step
- Phase cards don't show step-level progress

---

## Target State

**Enhanced Setup Dashboard**:
1. 📊 **Overall Progress Card** - Shows X% complete across all phases
2. 🎯 **Mode Indicator** - Clear badge showing "Guided Mode" or "Expert Mode"
3. 📋 **Phase Status Cards** - Visual progress per phase with "Continue" buttons
4. 🔄 **Mode Switcher** - Easy toggle between guided/expert
5. 🎨 **Visual Hierarchy** - Clear CTAs, locked states, completion badges

---

## Implementation Specifications

### 1. Overall Progress Card

**File**: `apps/web/src/app/(dashboard)/setup/page.tsx`

**Location**: Top of page, above phase cards

**UI**:
```tsx
<Card className="mb-6 border-2 border-purple-200 dark:border-purple-800">
  <CardBody className="p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Epic AI Setup
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {getProgressMessage(overallProgress)}
        </p>
      </div>
      
      <div className="text-right">
        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
          {overallProgress}%
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          Complete
        </p>
      </div>
    </div>
    
    <Progress 
      value={overallProgress}
      size="lg"
      className="mb-4"
      classNames={{
        indicator: "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500",
        track: "bg-gray-200 dark:bg-gray-700",
      }}
    />
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span>{completedPhases} of 5 phases complete</span>
      </div>
      
      {overallProgress < 100 && (
        <Button
          color="primary"
          size="sm"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={handleContinueSetup}
        >
          Continue Setup
        </Button>
      )}
      
      {overallProgress === 100 && !flywheelActive && (
        <Button
          color="success"
          size="sm"
          endContent={<Rocket className="w-4 h-4" />}
          onPress={handleActivateFlywheel}
        >
          Activate Flywheel
        </Button>
      )}
    </div>
  </CardBody>
</Card>
```

**Helper Functions**:
```typescript
function getProgressMessage(progress: number): string {
  if (progress === 0) return "Let's get your AI flywheel configured";
  if (progress < 25) return "Just getting started...";
  if (progress < 50) return "Making good progress!";
  if (progress < 75) return "More than halfway there!";
  if (progress < 100) return "Almost ready to launch!";
  return "Setup complete - ready to activate!";
}

function calculateOverallProgress(flywheelState: FlywheelState): number {
  const phases = Object.values(flywheelState.phases);
  const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress || 0), 0);
  return Math.round(totalProgress / phases.length);
}

function getCompletedPhaseCount(flywheelState: FlywheelState): number {
  return Object.values(flywheelState.phases).filter(
    phase => phase.status === "COMPLETED"
  ).length;
}
```

---

### 2. Mode Indicator & Switcher

**File**: Already exists from Phase 1 - `apps/web/src/components/setup/setup-header.tsx`

**Enhancement**: Make it more prominent

**Current**:
```tsx
// Basic mode display in header
<SetupHeader currentMode={mode} overallProgress={overallProgress} />
```

**Enhanced**:
```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
      Setup Hub
    </h1>
    
    {/* Mode Badge */}
    <Chip
      size="lg"
      variant="flat"
      color={mode === "guided" ? "primary" : "default"}
      startContent={mode === "guided" ? <Sparkles className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
    >
      {mode === "guided" ? "Guided Mode" : "Expert Mode"}
    </Chip>
  </div>
  
  {/* Mode Switcher */}
  <div className="flex items-center gap-2">
    <Button
      variant={mode === "ai" ? "solid" : "bordered"}
      color={mode === "ai" ? "secondary" : "default"}
      size="sm"
      startContent={<Zap className="w-4 h-4" />}
      onPress={() => router.push("/setup/ai")}
    >
      AI Express
    </Button>
    
    <Button
      variant={mode === "guided" ? "solid" : "bordered"}
      color={mode === "guided" ? "primary" : "default"}
      size="sm"
      startContent={<Sparkles className="w-4 h-4" />}
      onPress={() => router.push("/setup?mode=guided")}
    >
      Guided
    </Button>
    
    <Button
      variant={mode === "expert" ? "solid" : "bordered"}
      color={mode === "expert" ? "default" : "default"}
      size="sm"
      startContent={<Settings2 className="w-4 h-4" />}
      onPress={() => router.push("/setup")}
    >
      Expert
    </Button>
  </div>
</div>
```

---

### 3. Enhanced Phase Status Cards

**File**: `apps/web/src/components/setup/phase-status-card.tsx` (create new)

**Purpose**: Show phase progress with visual indicators

**Component**:
```tsx
import { Card, CardBody, Button, Progress, Chip } from "@heroui/react";
import { CheckCircle, Circle, Loader, Lock, ArrowRight, Edit } from "lucide-react";
import type { PhaseInfo, PhaseState } from "@/lib/flywheel/types";

interface PhaseStatusCardProps {
  phase: PhaseInfo;
  state: PhaseState;
  currentMode: "ai" | "guided" | "expert";
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
}

export function PhaseStatusCard({
  phase,
  state,
  currentMode,
  onStart,
  onContinue,
  onReview,
}: PhaseStatusCardProps) {
  const { status, progress, currentStep } = state;
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";
  const isNotStarted = status === "NOT_STARTED";
  const isLocked = checkDependencies(phase, state);
  
  // Get status icon
  const StatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (isInProgress) return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
    if (isLocked) return <Lock className="w-6 h-6 text-gray-400" />;
    return <Circle className="w-6 h-6 text-gray-400" />;
  };
  
  // Get status color
  const getCardStyle = () => {
    if (isCompleted) return "border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20";
    if (isInProgress) return "border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20";
    if (isLocked) return "opacity-60";
    return "";
  };
  
  // Get action button
  const ActionButton = () => {
    if (isCompleted) {
      return (
        <Button
          size="sm"
          variant="light"
          startContent={<Edit className="w-4 h-4" />}
          onPress={onReview}
        >
          Review
        </Button>
      );
    }
    
    if (isInProgress) {
      return (
        <Button
          size="sm"
          color="primary"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={onContinue}
        >
          Continue
        </Button>
      );
    }
    
    if (isLocked) {
      return (
        <Button size="sm" variant="bordered" isDisabled>
          Locked
        </Button>
      );
    }
    
    return (
      <Button
        size="sm"
        variant="bordered"
        color="default"
        onPress={onStart}
      >
        Start
      </Button>
    );
  };
  
  return (
    <Card className={getCardStyle()}>
      <CardBody className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <StatusIcon />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {phase.name}
              </h3>
              
              {/* Status Badges */}
              {isCompleted && (
                <Chip size="sm" color="success" variant="flat">
                  Complete
                </Chip>
              )}
              {isInProgress && (
                <Chip size="sm" color="primary" variant="flat">
                  In Progress
                </Chip>
              )}
              {isLocked && (
                <Chip size="sm" variant="flat">
                  Locked
                </Chip>
              )}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {phase.description}
            </p>
            
            {/* Progress Bar (only for in-progress) */}
            {isInProgress && (
              <div className="space-y-2">
                <Progress
                  value={progress || 0}
                  size="sm"
                  color="primary"
                  classNames={{
                    indicator: "bg-gradient-to-r from-blue-500 to-purple-500",
                  }}
                />
                <p className="text-xs text-gray-500">
                  {currentMode === "guided" 
                    ? `Step ${currentStep || 0} of ${getTotalStepsForMode(phase, currentMode)}`
                    : `${progress}% complete`
                  }
                </p>
              </div>
            )}
            
            {/* Lock Reason */}
            {isLocked && (
              <p className="text-xs text-gray-500 italic">
                Complete {getDependencyName(phase)} first
              </p>
            )}
          </div>
          
          {/* Action Button */}
          <div className="flex-shrink-0">
            <ActionButton />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Helper functions
function checkDependencies(phase: PhaseInfo, state: PhaseState): boolean {
  // Check if dependencies are met
  if (!phase.dependencies || phase.dependencies.length === 0) return false;
  
  // Check each dependency
  return phase.dependencies.some(dep => {
    const depState = state.phases[dep];
    return depState?.status !== "COMPLETED";
  });
}

function getDependencyName(phase: PhaseInfo): string {
  return phase.dependencies?.[0] || "previous phase";
}

function getTotalStepsForMode(phase: PhaseInfo, mode: string): number {
  if (mode === "guided") {
    // Streamlined step counts
    const counts: Record<string, number> = {
      UNDERSTAND: 3,
      CREATE: 2,
      DISTRIBUTE: 3,
      LEARN: 2,
      AUTOMATE: 2,
    };
    return counts[phase.id] || 0;
  }
  return phase.totalSteps;
}
```

---

### 4. Page Layout Update

**File**: `apps/web/src/app/(dashboard)/setup/page.tsx`

**Updated Structure**:
```tsx
export default async function SetupPage({ searchParams }: SetupPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  
  // Get mode from query params
  const params = await searchParams;
  const mode = params?.mode as "ai" | "guided" | "expert" | undefined;
  
  // Get flywheel state
  const flywheelState = await getFlywheelState(userId);
  const overallProgress = calculateOverallProgress(flywheelState);
  const completedPhases = getCompletedPhaseCount(flywheelState);
  
  // If guided mode, show streamlined wizard
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
  
  // Default: Show setup hub (expert mode)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Mode Switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Setup Hub</h1>
            <Chip
              size="lg"
              variant="flat"
              color={mode === "guided" ? "primary" : "default"}
            >
              {mode === "guided" ? "Guided Mode" : "Expert Mode"}
            </Chip>
          </div>
          
          {/* Mode Switcher Buttons */}
          <ModeSwitcher currentMode={mode} />
        </div>
        
        {/* Overall Progress Card */}
        <Card className="mb-6 border-2 border-purple-200 dark:border-purple-800">
          <CardBody className="p-6">
            {/* Overall progress content */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Your Epic AI Setup</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getProgressMessage(overallProgress)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-purple-600">
                  {overallProgress}%
                </div>
                <p className="text-xs text-gray-500 uppercase">Complete</p>
              </div>
            </div>
            
            <Progress 
              value={overallProgress}
              size="lg"
              classNames={{
                indicator: "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500",
              }}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{completedPhases} of 5 phases complete</span>
              </div>
              
              {overallProgress < 100 && (
                <Button
                  color="primary"
                  size="sm"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onPress={() => handleContinueSetup(flywheelState)}
                >
                  Continue Setup
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
        
        {/* Phase Status Cards */}
        <div className="space-y-4">
          {PHASE_INFO.map((phase) => {
            const phaseState = flywheelState.phases[phase.id];
            
            return (
              <PhaseStatusCard
                key={phase.id}
                phase={phase}
                state={phaseState}
                currentMode={mode || "expert"}
                onStart={() => handleStartPhase(phase.id, mode)}
                onContinue={() => handleContinuePhase(phase.id, phaseState, mode)}
                onReview={() => handleReviewPhase(phase.id, mode)}
              />
            );
          })}
        </div>
        
        {/* Help Section */}
        <Card className="mt-6 bg-gray-50 dark:bg-gray-800">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Need Help?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Not sure which mode to use? Try AI Express for fastest setup, 
                  or Guided for step-by-step configuration.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" color="primary" as={Link} href="/setup/ai">
                    Try AI Express
                  </Button>
                  <Button size="sm" variant="flat" as={Link} href="/docs/setup">
                    View Setup Guide
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Handler functions
function handleContinueSetup(flywheelState: FlywheelState) {
  // Find first in-progress or not-started phase
  const phase = PHASE_INFO.find(p => {
    const state = flywheelState.phases[p.id];
    return state.status === "IN_PROGRESS" || state.status === "NOT_STARTED";
  });
  
  if (phase) {
    router.push(`/setup/${phase.id.toLowerCase()}`);
  }
}

function handleStartPhase(phaseId: string, mode?: string) {
  if (mode === "guided") {
    router.push(`/setup?mode=guided&phase=${phaseId}`);
  } else {
    router.push(`/setup/${phaseId.toLowerCase()}`);
  }
}

function handleContinuePhase(phaseId: string, state: PhaseState, mode?: string) {
  if (mode === "guided") {
    router.push(`/setup?mode=guided&phase=${phaseId}&step=${state.currentStep}`);
  } else {
    router.push(`/setup/${phaseId.toLowerCase()}?step=${state.currentStep}`);
  }
}

function handleReviewPhase(phaseId: string, mode?: string) {
  if (mode === "guided") {
    router.push(`/setup?mode=guided&phase=${phaseId}&review=true`);
  } else {
    router.push(`/setup/${phaseId.toLowerCase()}?review=true`);
  }
}
```

---

### 5. Mode Switcher Component

**File**: `apps/web/src/components/setup/mode-switcher.tsx` (create new)

```tsx
"use client";

import { Button } from "@heroui/react";
import { Zap, Sparkles, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ModeSwitcherProps {
  currentMode?: "ai" | "guided" | "expert";
}

export function ModeSwitcher({ currentMode = "expert" }: ModeSwitcherProps) {
  const router = useRouter();
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={currentMode === "ai" ? "solid" : "bordered"}
        color={currentMode === "ai" ? "secondary" : "default"}
        size="sm"
        startContent={<Zap className="w-4 h-4" />}
        onPress={() => router.push("/setup/ai")}
      >
        AI Express
      </Button>
      
      <Button
        variant={currentMode === "guided" ? "solid" : "bordered"}
        color={currentMode === "guided" ? "primary" : "default"}
        size="sm"
        startContent={<Sparkles className="w-4 h-4" />}
        onPress={() => router.push("/setup?mode=guided")}
      >
        Guided
      </Button>
      
      <Button
        variant={currentMode === "expert" ? "solid" : "bordered"}
        color={currentMode === "expert" ? "default" : "default"}
        size="sm"
        startContent={<Settings2 className="w-4 h-4" />}
        onPress={() => router.push("/setup")}
      >
        Expert
      </Button>
    </div>
  );
}
```

---

## Testing Scenarios

### Scenario 1: Overall Progress Display
1. Navigate to `/setup`
2. **Verify**: Progress card shows correct percentage
3. **Verify**: Progress message updates based on %
4. **Verify**: "X of 5 phases complete" is accurate
5. **Verify**: Gradient progress bar animates

### Scenario 2: Phase Status Cards
1. Start UNDERSTAND phase
2. **Verify**: Card shows "In Progress" badge
3. **Verify**: Progress bar displays step progress
4. **Verify**: "Continue" button works
5. Complete UNDERSTAND
6. **Verify**: Card turns green with checkmark
7. **Verify**: CREATE phase unlocks

### Scenario 3: Mode Switching
1. Start in expert mode
2. Click "Guided" button
3. **Verify**: Redirects to `/setup?mode=guided`
4. **Verify**: Shows streamlined wizard
5. Click "Expert" button
6. **Verify**: Returns to phase hub
7. **Verify**: Progress preserved

### Scenario 4: Continue Setup
1. Complete 60% of setup
2. Return to setup hub
3. Click "Continue Setup"
4. **Verify**: Redirects to next incomplete phase/step
5. **Verify**: Can resume from exact position

### Scenario 5: Locked Dependencies
1. Try to access CREATE before UNDERSTAND
2. **Verify**: CREATE card shows "Locked" badge
3. **Verify**: Start button disabled
4. **Verify**: Shows dependency message
5. Complete UNDERSTAND
6. **Verify**: CREATE unlocks automatically

---

## Implementation Checklist

**Components to Create**:
- [ ] `phase-status-card.tsx` (enhanced phase cards)
- [ ] `mode-switcher.tsx` (mode toggle buttons)

**Files to Modify**:
- [ ] `/setup/page.tsx` (add progress card, phase cards, layout)
- [ ] Update imports and exports in `components/setup/index.ts`

**Helper Functions**:
- [ ] `calculateOverallProgress()`
- [ ] `getProgressMessage()`
- [ ] `getCompletedPhaseCount()`
- [ ] `handleContinueSetup()`
- [ ] `handleStartPhase()`
- [ ] `handleContinuePhase()`

**Styling**:
- [ ] Progress card with gradient
- [ ] Phase cards with conditional styling
- [ ] Mode switcher buttons
- [ ] Help section

---

## Success Criteria

**Visual Clarity**:
- ✅ Users see overall progress at a glance
- ✅ Phase status is obvious (locked/not started/in progress/complete)
- ✅ Current mode is clear (badge + active button)
- ✅ Next action is obvious ("Continue" button)

**Functionality**:
- ✅ "Continue Setup" goes to right place
- ✅ Phase dependencies enforced
- ✅ Mode switching preserves progress
- ✅ Progress calculations accurate

**UX**:
- ✅ Users feel oriented (know where they are)
- ✅ Users feel motivated (see progress)
- ✅ Users can resume easily (clear CTAs)

---

## Phase 2 Completion

**When Task 6 is done**:
- Phase 1: ✅ Unified onboarding
- Phase 2: ✅ Streamlined wizard (Task 4)
- Phase 2: ✅ Enhanced AI wizard (Task 5)
- Phase 2: ✅ Progress dashboard (Task 6)

**Result**: Complete unified wizard strategy with 3 paths (AI/Guided/Expert) and clear progress tracking.

**Next**: Phase 3 (Polish) - Progress persistence, resume functionality, AI assist improvements

---

**Ready for Claude Code to implement Task 6 - Final Phase 2 task.**
