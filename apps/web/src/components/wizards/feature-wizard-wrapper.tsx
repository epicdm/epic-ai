"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Wizard, type WizardStep } from "@/components/ui/wizard/wizard";
import { WizardLayout } from "@/components/flywheel/shared/wizard-layout";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useHistory } from "@/hooks/use-history";
import { Celebration } from "@/components/ui/celebration";

type WizardStepExtended = {
  id: string;
  title: string;
  content: React.ComponentType<{ onComplete: (data: any) => void }>;
};

export interface FeatureWizardProps {
  featureName: string;
  steps: WizardStepExtended[];
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  mode?: "modal" | "fullpage";
  initialData?: Record<string, unknown>;
  enableQuickCreate?: boolean;
  enableAutoSave?: boolean;
  enableUndoRedo?: boolean;
  enablePreview?: boolean;
  enableCelebration?: boolean;
}

export function FeatureWizardWrapper({
  featureName,
  steps,
  onComplete,
  mode = "modal",
  initialData = {},
  enableQuickCreate = true,
  enableAutoSave = true,
  enableUndoRedo = true,
  enablePreview = false,
  enableCelebration = true,
}: FeatureWizardProps) {
  const [wizardData, setWizardData] = useState(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // History management for undo/redo
  const { state: history, push, undo, redo } = useHistory<Record<string, unknown>>(initialData);
  
  // Check if user completed this wizard before
  const storageKey = `wizard-completed-${featureName}`;
  const [hasCompleted, setHasCompleted] = useLocalStorage(storageKey, false);

  useEffect(() => {
    setIsFirstTime(!hasCompleted);
    setShowQuickCreate(!isFirstTime && enableQuickCreate);
  }, [hasCompleted, isFirstTime, enableQuickCreate]);

  const handleStepComplete = useCallback((stepData: Record<string, unknown>) => {
    const newData = { ...wizardData, ...stepData };
    setWizardData(newData);
    
    if (enableAutoSave) {
      localStorage.setItem(`wizard-progress-${featureName}`, JSON.stringify({
        step: currentStep,
        data: newData
      }));
    }
    
    if (enableUndoRedo) {
      push(newData);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [wizardData, currentStep, steps.length, enableAutoSave, enableUndoRedo, featureName, push]);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(wizardData);
      setHasCompleted(true);
      localStorage.removeItem(`wizard-progress-${featureName}`);
      
      if (enableCelebration) {
        setShowCelebration(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    setIsLoading(true);
    try {
      await onComplete({ ...initialData, quickCreate: true });
    } finally {
      setIsLoading(false);
    }
  };

  if (showQuickCreate) {
    return (
      <div className="space-y-4 p-6">
        <h3 className="text-lg font-medium">{featureName} Setup</h3>
        <p className="text-sm text-muted-foreground">
          You've completed this setup before. Would you like to use default settings or customize?
        </p>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowQuickCreate(false)}
          >
            Customize with Wizard
          </Button>
          <Button 
            onClick={handleQuickCreate}
            disabled={isLoading}
          >
            {isLoading ? <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" /> : 'Use Default Settings'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <WizardLayout
        title={`${featureName} Setup`}
        description={`Step ${currentStep + 1} of ${steps.length}`}
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        undo={enableUndoRedo ? undo : undefined}
        redo={enableUndoRedo ? redo : undefined}
      >
        <Wizard
          steps={steps.map(step => ({
            id: step.id,
            title: step.title,
            content: step.content
          }))}
          currentStepIndex={currentStep}
          onChangeStep={setCurrentStep}
          onComplete={handleComplete}
          onStepComplete={handleStepComplete}
          disabled={isLoading}
          previewMode={previewMode}
        />
      </WizardLayout>
      
      {showCelebration && (
        <Celebration
          title="Setup Complete!"
          onClose={() => setShowCelebration(false)}
        />
      )}
    </>
  );
}
