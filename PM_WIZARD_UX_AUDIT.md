# Epic AI - Wizard UX Audit & Strategy

**PM Analysis** | Date: Dec 31, 2025  
**Status**: 🔴 CRITICAL UX ISSUE - Multiple disjointed wizard flows

---

## 🚨 Current Problem

**User Confusion**: New users encounter 3+ different wizard entry points with overlapping purposes, unclear sequencing, and no unified narrative.

### What Users Experience Today

1. **Sign up** → See `OnboardingWizard` (org/brand creation)
2. **Complete onboarding** → Redirected to dashboard
3. **Go to setup** → See `SetupHub` with 5 phase wizards
4. **Click AI Setup** → See `BirdEyeWizard` (conflicts with manual phases)
5. **Brand creation** → See `BrandSetupWizard` (why is this separate?)
6. **Returning user** → Might see `MasterOnboardingWizard` (?)

**Result**: Users don't know which path to take, abandon setup, or misconfigure their account.

---

## 📊 Current Wizard Inventory

### 1. Onboarding Layer
| Wizard | Purpose | Steps | Issues |
|--------|---------|-------|--------|
| `OnboardingWizard` | Create org + brand | 3 (welcome, org, brand) | ❌ Too simple, no industry template |
| `MasterOnboardingWizard` | Goal-based onboarding | 5 (goal, setup, quick win, tour, complete) | ⚠️ Better UX but not active? |
| `BrandSetupWizard` | Brand creation with template | 5 (template, website, social, review, complete) | ✅ Good but isolated |

**Problem**: 3 different onboarding flows that compete with each other.

### 2. Flywheel Setup Layer
| Wizard | Phase | Steps | Dependencies |
|--------|-------|-------|--------------|
| `UnderstandWizard` | Brand Brain | 9 | None |
| `CreateWizard` | Content Factory | 6 | Understand complete |
| `DistributeWizard` | Publishing Engine | 6 | Create complete |
| `LearnWizard` | Analytics | 5 | Distribute complete |
| `AutomateWizard` | AI Autopilot | 6 | Learn complete |

**Problem**: **32 total steps** across 5 wizards. Linear dependency = user must complete ALL to activate autopilot.

### 3. AI Fast-Track
| Wizard | Purpose | Time |
|--------|---------|------|
| `BirdEyeWizard` | AI configures all 5 phases | 60 seconds |

**Problem**: Competes with manual wizards. Users don't know when to use which.

---

## 🎯 Key UX Issues

### Issue #1: Multiple Entry Points
**What**: 3-5 different ways to start setup  
**Impact**: Users confused about "correct" path  
**Severity**: 🔴 Critical

### Issue #2: Overlapping Purpose
**What**: `MasterOnboardingWizard` vs `OnboardingWizard` vs `BrandSetupWizard`  
**Impact**: Duplicate functionality, inconsistent UX  
**Severity**: 🟠 High

### Issue #3: Manual vs AI Conflict
**What**: `BirdEyeWizard` can auto-configure everything, but UI pushes manual wizards  
**Impact**: Users waste time on manual setup when AI could do it  
**Severity**: 🟠 High

### Issue #4: Linear Dependency Hell
**What**: Must complete all 32 steps to activate flywheel  
**Impact**: High abandonment, users never reach value  
**Severity**: 🔴 Critical

### Issue #5: No Progress Persistence
**What**: Users can't see overall completion status  
**Impact**: Can't track progress across multiple sessions  
**Severity**: 🟡 Medium

### Issue #6: No Smart Defaults
**What**: Every field requires manual input (even with templates)  
**Impact**: Cognitive overload, slow setup  
**Severity**: 🟠 High

---

## ✅ Recommended Solution: Unified Wizard Strategy

### Vision
**"From signup to AI autopilot in 5 minutes or less"**

### Core Principles
1. **Single entry point** - One wizard flow, multiple completion paths
2. **AI-first** - Default to AI setup, offer manual customization
3. **Progressive disclosure** - Show complexity only when needed
4. **Smart defaults** - Pre-fill everything possible
5. **Flexible completion** - Users can activate with minimal input

---

## 🎨 Proposed User Journey

### Path A: AI Express Setup (Recommended - 5 min)
```
1. Welcome → Select goal (content/voice/campaigns)
2. AI Setup → Enter website URL
3. AI Magic → Auto-configure all 5 phases (60s)
4. Review → Quick review of AI suggestions
5. Activate → Flywheel goes live
```

**Result**: User has working flywheel in 5 minutes

### Path B: Guided Manual Setup (15-20 min)
```
1. Welcome → Select goal
2. Choose Manual Setup
3. Industry Template → Pre-fill brand brain
4. Phase Wizard → Streamlined 12-step wizard (not 32)
   - Understand (3 core steps)
   - Create (2 core steps)
   - Distribute (3 core steps)
   - Learn (2 core steps)
   - Automate (2 core steps)
5. Activate → Flywheel goes live
```

**Result**: User has customized flywheel in 15-20 minutes

### Path C: Expert Mode (30+ min)
```
1. Welcome → Select goal
2. Choose Expert Mode
3. Setup Hub → Access all 5 phase wizards independently
4. Full Control → All 32 steps available
5. Activate when ready
```

**Result**: Power users have full control

---

## 📋 Implementation Specs for Claude Code

### TASK 1: Consolidate Onboarding Wizards
**Goal**: Single unified onboarding experience

**Action**: Merge the best parts of all 3 onboarding wizards into one

**New Flow**: `UnifiedOnboardingWizard`
```typescript
Steps:
1. Welcome (goal selection)
2. Business Info (org + brand + template)
3. Choose Path (AI Express / Guided / Expert)
4. [Branch to selected path]
```

**Files to modify**:
- Delete: `apps/web/src/components/onboarding/onboarding-wizard.tsx`
- Enhance: `apps/web/src/components/onboarding/master-onboarding-wizard.tsx`
- Integrate: `apps/web/src/components/brand/wizard/brand-setup-wizard.tsx` (brand template selection)

**API changes**: None (reuse existing `/api/onboarding/*` endpoints)

---

### TASK 2: Create Streamlined Phase Wizard
**Goal**: Reduce 32 steps to 12 essential steps with smart defaults

**Action**: Create new `StreamlinedFlywheelWizard` component

**Structure**:
```typescript
interface StreamlinedWizardStep {
  phase: FlywheelPhase;
  title: string;
  essential: boolean; // Core step vs optional
  aiAssisted: boolean; // Can AI auto-fill this?
}

// Only 12 essential steps (vs 32 today)
const ESSENTIAL_STEPS = [
  // Understand (3 steps)
  { phase: 'UNDERSTAND', id: 'identity', essential: true, aiAssisted: true },
  { phase: 'UNDERSTAND', id: 'voice', essential: true, aiAssisted: true },
  { phase: 'UNDERSTAND', id: 'audiences', essential: true, aiAssisted: true },
  
  // Create (2 steps)
  { phase: 'CREATE', id: 'content-types', essential: true, aiAssisted: false },
  { phase: 'CREATE', id: 'first-content', essential: true, aiAssisted: true },
  
  // Distribute (3 steps)
  { phase: 'DISTRIBUTE', id: 'connect-accounts', essential: true, aiAssisted: false },
  { phase: 'DISTRIBUTE', id: 'schedule', essential: true, aiAssisted: true },
  { phase: 'DISTRIBUTE', id: 'first-post', essential: true, aiAssisted: false },
  
  // Learn (2 steps)
  { phase: 'LEARN', id: 'metrics', essential: true, aiAssisted: false },
  { phase: 'LEARN', id: 'goals', essential: true, aiAssisted: true },
  
  // Automate (2 steps)
  { phase: 'AUTOMATE', id: 'approval-mode', essential: true, aiAssisted: false },
  { phase: 'AUTOMATE', id: 'activate', essential: true, aiAssisted: false },
];
```

**New component**: `apps/web/src/components/flywheel/streamlined-flywheel-wizard.tsx`

**Features**:
- Progress bar shows overall completion (not per-phase)
- "AI Assist" button on every step with `aiAssisted: true`
- Skip optional steps
- Save & resume anytime

---

### TASK 3: Enhance Bird's Eye AI Wizard
**Goal**: Make AI setup the default path

**Action**: Update `BirdEyeWizard` to be primary setup flow

**Changes**:
1. Show this wizard by default after onboarding
2. Add "Customize Manually" option (leads to streamlined wizard)
3. Add confidence indicators for AI suggestions
4. Allow inline editing of AI-generated config
5. Show estimated time savings ("AI saved you 25 minutes")

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

---

### TASK 4: Create Setup Hub Dashboard
**Goal**: Single source of truth for setup progress

**Action**: Redesign `/setup` page as progress dashboard

**New UI Components**:
```
┌─────────────────────────────────────────┐
│  🎯 Your Epic AI Setup                  │
│                                          │
│  ⚡ Quick Start (5 min) [Recommended]   │
│  📝 Guided Setup (15 min)               │
│  🔧 Expert Mode (Full Control)          │
│                                          │
│  ─────────────────────────────────────  │
│                                          │
│  Overall Progress: ████████░░ 80%       │
│                                          │
│  ✅ Understand   - Complete              │
│  ✅ Create       - Complete              │
│  🔄 Distribute   - In Progress (2/6)    │
│  ⏸️ Learn        - Not Started           │
│  ⏸️ Automate     - Not Started           │
│                                          │
│  [Continue Setup] [Switch to AI Setup]  │
└─────────────────────────────────────────┘
```

**File**: `apps/web/src/app/(dashboard)/setup/page.tsx`

---

### TASK 5: Add Setup Routing Logic
**Goal**: Smart routing based on user state

**Action**: Create middleware to route users to correct wizard

**Logic**:
```typescript
// apps/web/src/middleware.ts or similar

async function getSetupRoute(userId: string): Promise<string> {
  const user = await getUserWithProgress(userId);
  
  // Never onboarded → Unified onboarding
  if (!user.onboardingComplete) {
    return '/onboarding';
  }
  
  // Onboarded but no flywheel progress → Setup hub with path selection
  if (!user.flywheelProgress) {
    return '/setup?first-time=true';
  }
  
  // In progress → Resume where they left off
  if (user.flywheelProgress.overallProgress < 100) {
    return `/setup?resume=${user.flywheelProgress.lastActivePhase}`;
  }
  
  // Complete → Dashboard
  return '/dashboard';
}
```

**Files to modify**:
- `apps/web/src/app/(dashboard)/layout.tsx` (redirect logic)
- `apps/web/src/lib/sync-user.ts` (update `needsOnboarding` function)

---

### TASK 6: Progress Persistence & Resume
**Goal**: Users can pause and resume anywhere

**Action**: Update progress tracking in database

**Database changes** (Prisma):
```prisma
model FlywheelProgress {
  // ... existing fields
  
  // New fields
  setupPath        SetupPath?  // AI_EXPRESS | GUIDED | EXPERT
  overallProgress  Int         // 0-100
  lastActiveAt     DateTime
  lastActivePhase  FlywheelPhase?
  lastActiveStep   Int?
  
  // Track which path user chose
  usedAISetup      Boolean @default(false)
  aiSetupCompletedAt DateTime?
}

enum SetupPath {
  AI_EXPRESS
  GUIDED
  EXPERT
}
```

**API endpoint**: `POST /api/flywheel/progress/resume`

---

## 🧪 Testing & Validation

### User Testing Scenarios

**Scenario 1: New User - AI Path**
1. Sign up → See unified onboarding
2. Choose "Quick Start (AI)"
3. Enter website URL
4. Review AI suggestions (60s)
5. Click "Activate Flywheel"
6. **Success Criteria**: Flywheel active in < 5 minutes

**Scenario 2: New User - Guided Path**
1. Sign up → See unified onboarding
2. Choose "Guided Setup"
3. Complete 12 essential steps
4. Click "Activate Flywheel"
5. **Success Criteria**: Flywheel active in < 20 minutes

**Scenario 3: Power User - Expert Path**
1. Sign up → See unified onboarding
2. Choose "Expert Mode"
3. Access individual phase wizards
4. Configure all 32 steps manually
5. **Success Criteria**: Full control, no limitations

**Scenario 4: Returning User - Resume**
1. User completed 6/12 steps yesterday
2. Returns today
3. Sees "Resume Setup" at 50% progress
4. Continues from step 7
5. **Success Criteria**: No lost progress

---

## 📊 Success Metrics

**Before (Current State)**:
- Time to first flywheel activation: **45+ minutes**
- Setup completion rate: **~20%** (guessing)
- User confusion: **High** (multiple paths)

**After (Unified Strategy)**:
- Time to first flywheel activation: **5 minutes** (AI) or **15 minutes** (Guided)
- Setup completion rate: **>60%** target
- User confusion: **Low** (single entry point, clear paths)

---

## 🎯 Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Create unified onboarding wizard
2. ✅ Add path selection (AI / Guided / Expert)
3. ✅ Update setup routing logic

**Goal**: Single entry point, no more confusion

### Phase 2: High Value
4. ✅ Create streamlined 12-step wizard
5. ✅ Enhance Bird's Eye AI wizard
6. ✅ Build progress dashboard

**Goal**: Fast, intuitive setup experience

### Phase 3: Polish
7. ✅ Add progress persistence
8. ✅ Implement resume functionality
9. ✅ Add AI assist on each step

**Goal**: Professional, delightful UX

---

## 📝 Notes for Claude Code

### Key Files to Touch
```
✏️ MODIFY:
- apps/web/src/components/onboarding/master-onboarding-wizard.tsx
- apps/web/src/components/flywheel/shared/birdeye-wizard.tsx
- apps/web/src/app/(dashboard)/setup/page.tsx
- apps/web/src/lib/sync-user.ts

➕ CREATE:
- apps/web/src/components/flywheel/streamlined-flywheel-wizard.tsx
- apps/web/src/components/setup/path-selector.tsx
- apps/web/src/components/setup/progress-dashboard.tsx

🗑️ DELETE (or deprecate):
- apps/web/src/components/onboarding/onboarding-wizard.tsx (merge into master)
- Old individual phase wizard entry points (keep components, change routing)
```

### Design Principles
1. **Progressive disclosure** - Show 3 paths, hide complexity until chosen
2. **Smart defaults** - Pre-fill everything from template + AI
3. **Clear value** - Show time saved, progress made
4. **Flexible completion** - Don't force linear flow
5. **Visual hierarchy** - Recommended path is obvious

### Technical Constraints
- Keep existing Prisma schema (just add new fields)
- Reuse existing wizard components (don't rebuild from scratch)
- Maintain backward compatibility (users mid-setup)
- Keep existing API endpoints (add new, don't break old)

---

## 🚀 Expected Outcome

**User lands on Epic AI for first time**:
1. Sees clean, welcoming onboarding
2. Chooses their goal (content / voice / campaigns)
3. Selects AI Express Setup (recommended)
4. Enters website, waits 60 seconds
5. Reviews AI config, clicks Activate
6. **Flywheel is live - generating first content**

**Total time**: 5 minutes  
**User happiness**: ⭐⭐⭐⭐⭐

---

**PM Sign-off**: Ready for implementation. Start with Phase 1 (unified onboarding), then Phase 2 (streamlined wizard), then Phase 3 (polish).
