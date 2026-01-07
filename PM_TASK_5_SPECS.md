# Task 5: Enhance Bird's Eye AI Wizard

**PM Specs for Claude Code** | Dec 31, 2025  
**Status**: Task 4 ✅ Complete | Task 5 → Implementation specs below  
**Goal**: Make AI Express path the best onboarding experience

---

## Overview

**Current State**:
- `BirdEyeWizard` exists at `/setup/ai` ✅ (from Phase 1)
- AI analyzes website and generates config for all 5 phases
- Shows preview in accordion format
- "Apply All" button activates flywheel

**Gaps**:
- No indication of time saved vs manual setup
- No AI confidence scores (users don't trust it)
- No inline editing (users can't tweak AI suggestions)
- No escape hatch to guided mode
- No visual polish

---

## Target State

**Enhanced AI Express Experience**:
1. ⏱️ **Time Savings Banner** - "AI saved you 25 minutes"
2. 📊 **Confidence Indicators** - Show AI confidence per phase (0-100%)
3. ✏️ **Inline Editing** - Click "Edit" to modify fields without leaving wizard
4. 🔄 **Mode Switching** - "Customize Manually Instead" button
5. 🎨 **Visual Polish** - Better colors, animations, success states

---

## Enhancement Specifications

### 1. Time Savings Banner

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

**Location**: After "Analysis Complete" card, before accordion

**UI**:
```tsx
{step === "preview" && configuration && (
  <>
    {/* Existing "Analysis Complete" card */}
    
    {/* NEW: Time Savings Banner */}
    <Card className="mb-6 border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
      <CardBody className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
              AI saved you 25+ minutes
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              Manual setup would take 30-45 minutes. AI configured your entire flywheel in just 60 seconds.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Chip size="sm" variant="flat" color="success">
                ✓ Brand Brain
              </Chip>
              <Chip size="sm" variant="flat" color="success">
                ✓ Content Factory
              </Chip>
              <Chip size="sm" variant="flat" color="success">
                ✓ Publishing
              </Chip>
              <Chip size="sm" variant="flat" color="success">
                ✓ Analytics
              </Chip>
              <Chip size="sm" variant="flat" color="success">
                ✓ Autopilot
              </Chip>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
    
    {/* Existing accordion */}
  </>
)}
```

**Data Source**:
Update API response to include timing:
```typescript
// apps/web/src/app/api/flywheel/ai-full-setup/route.ts
return NextResponse.json({
  configuration: { /* ... */ },
  timeSaved: 25, // minutes saved vs manual
  analysisTime: 58, // seconds AI took
});
```

---

### 2. Confidence Indicators

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

**Location**: Within each accordion item, at the bottom

**UI**:
```tsx
<AccordionItem
  key="understand"
  title="Understand"
  subtitle="Brand identity, voice & audiences"
>
  {/* Existing preview content */}
  
  {/* NEW: Confidence Indicator */}
  <Divider className="my-4" />
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 flex-1">
      <Sparkles className="w-4 h-4 text-purple-500" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        AI Confidence
      </span>
    </div>
    
    <Progress 
      value={configuration.understand.confidence * 100} 
      size="sm"
      className="flex-1 max-w-[200px]"
      classNames={{
        indicator: getConfidenceColor(configuration.understand.confidence),
      }}
    />
    
    <span className="text-sm font-bold" style={{ 
      color: getConfidenceTextColor(configuration.understand.confidence) 
    }}>
      {Math.round(configuration.understand.confidence * 100)}%
    </span>
  </div>
</AccordionItem>
```

**Helper Functions**:
```typescript
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-orange-500";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 0.8) return "#16a34a"; // green-600
  if (confidence >= 0.6) return "#ca8a04"; // yellow-600
  return "#ea580c"; // orange-600
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Low";
}
```

**Data Structure**:
Update configuration type to include confidence:
```typescript
interface PhaseConfiguration {
  // ... existing fields
  confidence: number; // 0-1
}
```

**Backend Changes**:
Update AI analysis to calculate confidence:
```typescript
// apps/web/src/app/api/flywheel/ai-full-setup/route.ts

const analyzeWithConfidence = async (websiteUrl: string, industry?: string) => {
  // ... existing AI analysis
  
  return {
    understand: {
      ...understandData,
      confidence: calculateConfidence(understandData, {
        hasWebsite: !!websiteUrl,
        hasIndustry: !!industry,
        hasSocialLinks: !!understandData.socialLinks,
      }),
    },
    // ... other phases
  };
};

function calculateConfidence(data: any, context: any): number {
  let score = 0.5; // base confidence
  
  // Increase confidence if we have rich data sources
  if (context.hasWebsite) score += 0.2;
  if (context.hasIndustry) score += 0.1;
  if (context.hasSocialLinks) score += 0.1;
  if (data.brandDescription?.length > 50) score += 0.1;
  
  return Math.min(score, 1.0);
}
```

---

### 3. Inline Editing

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

**State Management**:
```typescript
const [editingPhase, setEditingPhase] = useState<string | null>(null);
const [editedConfig, setEditedConfig] = useState(configuration);

const updateConfig = (phase: string, field: string, value: any) => {
  setEditedConfig(prev => ({
    ...prev,
    [phase]: {
      ...prev[phase],
      [field]: value,
    },
  }));
};
```

**UI Changes**:
```tsx
<AccordionItem key="understand" title="Understand">
  <div className="space-y-4 py-2">
    {/* Existing preview content */}
    
    {editingPhase !== "understand" ? (
      // View Mode
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Brand Name</p>
            <p className="font-medium">{editedConfig.understand.brandName || "—"}</p>
          </div>
          {/* ... other fields */}
        </div>
        
        {/* Edit Button */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="light"
            startContent={<Edit className="w-4 h-4" />}
            onPress={() => setEditingPhase("understand")}
          >
            Edit Phase
          </Button>
        </div>
      </>
    ) : (
      // Edit Mode
      <>
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Input
            label="Brand Name"
            value={editedConfig.understand.brandName}
            onValueChange={(v) => updateConfig("understand", "brandName", v)}
          />
          
          <Textarea
            label="Description"
            value={editedConfig.understand.brandDescription}
            onValueChange={(v) => updateConfig("understand", "brandDescription", v)}
            minRows={3}
          />
          
          <Input
            label="Industry"
            value={editedConfig.understand.industry}
            onValueChange={(v) => updateConfig("understand", "industry", v)}
          />
          
          {/* Add other editable fields */}
          
          <div className="flex gap-2 justify-end pt-2">
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setEditedConfig(configuration); // Reset
                setEditingPhase(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={() => setEditingPhase(null)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </>
    )}
  </div>
</AccordionItem>
```

**Apply Changes**:
Update the `handleApplyAll` to use `editedConfig` instead of `configuration`:
```typescript
const handleApplyAll = useCallback(async () => {
  if (!editedConfig) return;
  
  setStep("applying");
  const phases = ["understand", "create", "distribute", "learn", "automate"];
  
  for (const phase of phases) {
    setApplyingPhase(phase);
    const phaseData = editedConfig[phase as keyof FullSetupConfiguration];
    // ... rest of apply logic
  }
}, [editedConfig]); // Use editedConfig, not configuration
```

---

### 4. Mode Switching (Escape Hatch)

**File**: `apps/web/src/components/flywheel/shared/birdeye-wizard.tsx`

**Location**: In preview step, below "Apply All" button

**UI**:
```tsx
{step === "preview" && configuration && (
  <>
    {/* Existing content */}
    
    {/* Action Buttons */}
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
      <Button
        color="primary"
        size="lg"
        className="sm:flex-1"
        endContent={<Rocket className="w-5 h-5" />}
        onPress={handleApplyAll}
      >
        Apply All & Activate
      </Button>
      
      {/* NEW: Escape Hatch */}
      <Button
        variant="bordered"
        size="lg"
        className="sm:flex-1"
        startContent={<Settings2 className="w-5 h-5" />}
        onPress={() => {
          // Save AI config as draft
          localStorage.setItem('ai-draft-config', JSON.stringify(editedConfig));
          router.push("/setup?mode=guided&ai-draft=true");
        }}
      >
        Customize Manually Instead
      </Button>
    </div>
    
    <p className="text-center text-sm text-gray-500 mt-3">
      Not happy with AI suggestions? Switch to guided mode to customize everything step-by-step.
    </p>
  </>
)}
```

**Guided Wizard Integration**:
Update streamlined wizard to pre-fill from AI draft:
```typescript
// apps/web/src/components/flywheel/streamlined-flywheel-wizard.tsx

useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('ai-draft') === 'true') {
    const aiDraft = localStorage.getItem('ai-draft-config');
    if (aiDraft) {
      const draftData = JSON.parse(aiDraft);
      setWizardData(draftData);
      localStorage.removeItem('ai-draft-config'); // Clean up
      
      // Show toast
      toast.success("AI configuration loaded. You can now customize each step.");
    }
  }
}, []);
```

---

### 5. Visual Polish

**Improvements**:

#### A. Loading Animation
```tsx
{step === "analyzing" && (
  <Card className="max-w-xl mx-auto">
    <CardBody className="py-12 text-center">
      {/* Replace basic Spinner with animated icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin" 
             style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
        <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900" />
        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Analyzing Your Website...</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        AI is scanning your website and generating configurations for all 5 phases.
      </p>
      
      {/* Progress indicators */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {phaseInfo.map((phase, i) => (
          <div 
            key={phase.key}
            className={`h-1.5 w-12 rounded-full transition-all ${
              i < analysisProgress ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      
      <p className="text-xs text-gray-400">
        Estimated time: {60 - analysisProgress * 12} seconds
      </p>
    </CardBody>
  </Card>
)}
```

#### B. Success Animation
```tsx
{step === "complete" && (
  <Card className="max-w-xl mx-auto border-2 border-green-200 dark:border-green-800">
    <CardBody className="py-12 text-center">
      {/* Animated success icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-10 h-10 text-white animate-bounce" />
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Setup Complete! 🎉
      </h3>
      
      {/* Time saved callout */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
        <Clock className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          You saved 25 minutes with AI
        </span>
      </div>
      
      {/* Rest of content */}
    </CardBody>
  </Card>
)}
```

#### C. Phase Application Progress
```tsx
{step === "applying" && (
  <Card className="max-w-xl mx-auto">
    <CardBody className="py-8">
      {/* Add percentage */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Applying Configuration...</h3>
        <span className="text-2xl font-bold text-purple-500">
          {Math.round((appliedPhases.length / phaseInfo.length) * 100)}%
        </span>
      </div>
      
      {/* Existing phase cards with improved styling */}
      <div className="space-y-3">
        {phaseInfo.map((phase) => {
          const Icon = phase.icon;
          const isApplying = applyingPhase === phase.key;
          const isApplied = appliedPhases.includes(phase.key);
          
          return (
            <div
              key={phase.key}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                isApplied
                  ? "bg-green-50 dark:bg-green-950/30 scale-100"
                  : isApplying
                    ? "bg-purple-50 dark:bg-purple-950/30 scale-105 shadow-md"
                    : "bg-gray-50 dark:bg-gray-800 opacity-50"
              }`}
            >
              {/* Add slide-in animation */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isApplied
                  ? "bg-green-500 scale-110"
                  : isApplying
                    ? "bg-purple-500 animate-pulse"
                    : "bg-gray-200 dark:bg-gray-700"
              }`}>
                {isApplied ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isApplying ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icon className="w-4 h-4 text-gray-500" />
                )}
              </div>
              
              {/* Rest of card content */}
            </div>
          );
        })}
      </div>
      
      {/* Animated progress bar */}
      <Progress
        value={(appliedPhases.length / phaseInfo.length) * 100}
        size="lg"
        className="mt-6"
        classNames={{
          indicator: "bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500",
        }}
      />
    </CardBody>
  </Card>
)}
```

---

## Testing Scenarios

### Scenario 1: Time Savings Display
1. Enter website URL in AI setup
2. Wait for analysis
3. **Verify**: Time savings banner shows "AI saved you 25+ minutes"
4. **Verify**: Shows 5 checkmarks for all phases

### Scenario 2: Confidence Scores
1. Complete AI analysis
2. Expand each phase accordion
3. **Verify**: Each phase shows confidence % (0-100%)
4. **Verify**: Progress bar color matches confidence level (green/yellow/orange)
5. **Verify**: Confidence calculated based on data richness

### Scenario 3: Inline Editing
1. See AI preview
2. Click "Edit Phase" on Understand
3. Modify brand name, description
4. Click "Save Changes"
5. **Verify**: Changes reflected in preview
6. Click "Apply All"
7. **Verify**: Edited values are saved to DB

### Scenario 4: Mode Switching
1. Complete AI analysis
2. Click "Customize Manually Instead"
3. **Verify**: Redirect to `/setup?mode=guided&ai-draft=true`
4. **Verify**: Guided wizard pre-filled with AI data
5. **Verify**: User can edit each step manually
6. **Verify**: Toast shows "AI configuration loaded"

### Scenario 5: Visual Polish
1. Watch loading animation
2. **Verify**: Animated spinner with progress indicators
3. **Verify**: Countdown timer shows seconds remaining
4. Watch applying animation
5. **Verify**: Phases animate in sequence
6. **Verify**: Success screen shows checkmark animation

---

## Implementation Checklist

**Enhancements**:
- [ ] Add time savings banner (with API update)
- [ ] Add confidence indicators to each phase
- [ ] Implement inline editing mode
- [ ] Add "Customize Manually" button
- [ ] Update `handleApplyAll` to use edited config
- [ ] Add localStorage draft saving
- [ ] Update guided wizard to load AI draft
- [ ] Improve loading animation
- [ ] Improve applying animation
- [ ] Improve success animation

**Backend**:
- [ ] Update AI analysis API to return confidence scores
- [ ] Update API to return `timeSaved` and `analysisTime`
- [ ] Implement confidence calculation logic

**Testing**:
- [ ] Test full AI flow with edits
- [ ] Test mode switching to guided
- [ ] Verify confidence scores accurate
- [ ] Test animations on slow connection

---

## Success Criteria

**User Experience**:
- ✅ Users understand AI saved them time (visible banner)
- ✅ Users trust AI suggestions (confidence scores)
- ✅ Users can tweak AI output (inline editing)
- ✅ Users can escape to manual mode (clear button)
- ✅ Experience feels polished (animations, colors)

**Metrics**:
- AI Express completion rate: >70% (vs current unknown)
- Time to activation: <5 minutes (vs 30+ manual)
- User satisfaction: High trust in AI suggestions

---

**Ready for Claude Code to implement Task 5 enhancements.**
