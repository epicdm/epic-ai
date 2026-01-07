# Phase 3: Polish - Progress Persistence & Resume

## Overview
Enhance the wizard experience with auto-save, resume functionality, and analytics tracking to ensure users never lose progress and can seamlessly return where they left off.

## Tasks

### Task 1: Database Schema Updates
**File:** `packages/database/prisma/schema.prisma`

Add `setupPath` to FlywheelProgress model:
```prisma
model FlywheelProgress {
  // ... existing fields ...

  // Setup path tracking (NEW)
  setupPath         SetupPath   @default(EXPERT) @map("setup_path")
  guidedCurrentStep Int         @default(0) @map("guided_current_step")
  guidedStepData    Json?       @map("guided_step_data")
  aiConfidence      Json?       @map("ai_confidence") // Per-phase confidence scores
  lastSavedAt       DateTime?   @map("last_saved_at")
}

enum SetupPath {
  AI_EXPRESS
  GUIDED
  EXPERT
}
```

### Task 2: Auto-Save Hook
**File:** `apps/web/src/hooks/use-wizard-autosave.ts`

Create a debounced auto-save hook:
```typescript
export function useWizardAutoSave(options: {
  brandId: string;
  setupPath: SetupPath;
  debounceMs?: number; // Default: 1500ms
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}): {
  saveProgress: (step: number, data: unknown) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}
```

Features:
- Debounced saves (default 1.5s after last change)
- Visual indicator "Saving..." → "Saved ✓"
- Error recovery with retry
- Offline queue (localStorage fallback)

### Task 3: Resume Detection & Restoration
**File:** `apps/web/src/lib/flywheel/resume-service.ts`

Create resume service:
```typescript
interface ResumeState {
  hasIncomplete: boolean;
  setupPath: SetupPath;
  currentStep: number;
  lastActiveAt: Date;
  progress: number; // 0-100
  phaseStates: PhaseState[];
}

export async function detectIncompleteSetup(userId: string): Promise<ResumeState | null>;
export async function restoreWizardState(userId: string): Promise<WizardData | null>;
```

**File:** `apps/web/src/components/setup/resume-prompt.tsx`

UI component:
```
┌──────────────────────────────────────────────────┐
│ 🔄 Continue Where You Left Off?                  │
│                                                  │
│ You have an incomplete Guided Setup              │
│ Step 5 of 12 • Last active 2 hours ago           │
│ Progress: ████████░░░░░░░░ 42%                  │
│                                                  │
│ [Continue Setup]  [Start Fresh]                  │
└──────────────────────────────────────────────────┘
```

### Task 4: AI Assist Buttons for Manual Steps
**File:** `apps/web/src/components/flywheel/streamlined-steps/*.tsx`

Add "✨ AI Suggest" button to manual steps:
- `ConnectAccountsStep` → "AI can help you choose which accounts to prioritize"
- `KeyMetricsStep` → "AI suggests metrics based on your goals"
- `FirstPostStep` → "AI can recommend the best time to post"

Implementation pattern:
```tsx
function AIAssistButton({
  onSuggest,
  loading,
  label = "AI Suggest"
}: AIAssistProps) {
  return (
    <Button
      size="sm"
      variant="flat"
      color="secondary"
      startContent={<Sparkles className="w-3.5 h-3.5" />}
      isLoading={loading}
      onPress={onSuggest}
    >
      {label}
    </Button>
  );
}
```

### Task 5: Analytics Tracking for Completion Funnels
**File:** `apps/web/src/lib/analytics/events.ts`

Add wizard-specific events:
```typescript
// Wizard Events
| { name: "wizard_started"; properties: { setup_path: string; brand_id: string } }
| { name: "wizard_step_completed"; properties: { setup_path: string; step: number; step_id: string; duration_seconds: number } }
| { name: "wizard_step_skipped"; properties: { setup_path: string; step: number; step_id: string } }
| { name: "wizard_ai_assist_used"; properties: { step_id: string; assist_type: string } }
| { name: "wizard_progress_saved"; properties: { setup_path: string; step: number; progress: number } }
| { name: "wizard_resumed"; properties: { setup_path: string; step: number; time_away_seconds: number } }
| { name: "wizard_abandoned"; properties: { setup_path: string; step: number; progress: number } }
| { name: "wizard_completed"; properties: { setup_path: string; duration_seconds: number; steps_completed: number } }
| { name: "flywheel_activated"; properties: { setup_path: string; phases_completed: number } }
```

### Task 6: Progress Save API Enhancement
**File:** `apps/web/src/app/api/flywheel/progress/route.ts`

Enhance the progress API:
```typescript
// POST /api/flywheel/progress
interface SaveProgressRequest {
  brandId: string;
  setupPath: "AI_EXPRESS" | "GUIDED" | "EXPERT";
  currentStep: number;
  stepId: string;
  data: Record<string, unknown>;
  overallProgress: number;
  phaseProgress?: Record<string, number>;
}

// GET /api/flywheel/progress
// Returns current progress state for resume
```

## Implementation Order

1. **Database Schema** - Add SetupPath enum and fields (migration)
2. **Progress API** - Enhance save/restore endpoints
3. **Auto-Save Hook** - Implement with debouncing
4. **Resume Service** - Detection and restoration logic
5. **Resume Prompt UI** - Modal/banner for resume
6. **AI Assist Buttons** - Add to manual steps
7. **Analytics Events** - Add tracking throughout

## Files to Create/Modify

### Create:
- `apps/web/src/hooks/use-wizard-autosave.ts`
- `apps/web/src/lib/flywheel/resume-service.ts`
- `apps/web/src/components/setup/resume-prompt.tsx`

### Modify:
- `packages/database/prisma/schema.prisma` - Add SetupPath
- `apps/web/src/lib/analytics/events.ts` - Add wizard events
- `apps/web/src/app/api/flywheel/progress/route.ts` - Enhance API
- `apps/web/src/components/flywheel/streamlined-flywheel-wizard.tsx` - Integrate auto-save
- `apps/web/src/components/flywheel/streamlined-steps/*.tsx` - Add AI assist
- `apps/web/src/app/(dashboard)/setup/page.tsx` - Add resume prompt

## Success Metrics

- **Auto-save:** Progress saved within 2s of any change
- **Resume:** Users can resume setup within 30 days
- **AI Assist:** >30% usage rate on manual steps
- **Analytics:** Full funnel visibility from start to activation

## Timeline Estimate

| Task | Complexity |
|------|------------|
| Database Schema | Low |
| Progress API | Medium |
| Auto-Save Hook | Medium |
| Resume Service | Medium |
| Resume Prompt UI | Low |
| AI Assist Buttons | Medium |
| Analytics Events | Low |
