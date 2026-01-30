import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, X, Check, Sparkles, Home, ChevronRight as ChevronRightIcon, Undo2, Redo2, History, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import type { WizardStep, WizardNavigation } from "@/lib/flywheel/types";
import { useCelebration } from "@/components/ui/celebration";

interface WizardLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number, data?: any) => void;
  onComplete: () => Promise<void>;
  onSave: () => Promise<void>;
  children: React.ReactNode;
  canProceed?: boolean;
  isLoading?: boolean;
  // New props for enhancements
  autoSave?: boolean;
  showHistory?: boolean;
  showPreview?: boolean;
  progressVariant?: "bar" | "ring";
  celebrationType?: "confetti" | "minimal" | "interactive";
}

export function WizardLayout({
  title,
  description,
  icon,
  color,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onSave,
  children,
  canProceed = true,
  isLoading = false,
  // New props with defaults
  autoSave = true,
  showHistory = false,
  showPreview = true,
  progressVariant = "bar",
  celebrationType = "minimal",
}: WizardLayoutProps) {
  const router = useRouter();
  const { celebrate } = useCelebration();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [history, setHistory] = useState<Array<{step: number, data: any}>>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Auto-save effect
  useEffect(() => {
    if (!autoSave) return;
    
    const timer = setInterval(async () => {
      try {
        await onSave();
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 10000);
    
    return () => clearInterval(timer);
  }, [autoSave, onSave]);

  // History tracking
  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    onStepChange(last.step, last.data);
    setHistory(history.slice(0, -1));
  };

  const redo = () => {
    // Would need to implement redo stack
  };

  // Enhanced completion with celebration
  const handleComplete = useCallback(async () => {
    if (isLoading || isCompleting) return;

    setIsCompleting(true);
    try {
      await onSave();
      await onComplete();
      showCelebration(celebrationType);
    } finally {
      setIsCompleting(false);
    }
  }, [isLoading, isCompleting, onSave, onComplete, celebrationType]);

  // Render preview mode
  if (showPreview && isPreviewMode) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Preview Before Completing</h2>
        {children}
        <div className="flex gap-4 mt-6">
          <Button onClick={() => setIsPreviewMode(false)}>Back to Edit</Button>
          <Button onClick={handleComplete} disabled={isCompleting}>
            Confirm & Complete
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Enhanced header with progress and history */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        
        {showHistory && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => console.log("Show history panel")}>
                  <History className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>History</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Progress visualization */}
      {progressVariant === "bar" ? (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round(((currentStep + 1) / steps.length) * 100)}%` }} />
            </div>
      ) : (
        <CircularProgress percent={Math.round(((currentStep + 1) / steps.length) * 100)} className="mb-6" />
      )}

      {/* Content */}
      {children}

      {/* Enhanced footer with undo/redo and preview */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          {showHistory && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={undo} disabled={history.length === 0}>
                      <Undo2 className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={redo} disabled={true /* TODO */}>
                      <Redo2 className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>

        <div className="flex gap-4">
          {currentStep !== 0 && (
            <Button variant="outline" onClick={() => onStepChange(currentStep - 1)} disabled={isLoading}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Back
            </Button>
          )}
          
          {showPreview && currentStep !== steps.length - 1 && (
            <Button variant="outline" onClick={() => setIsPreviewMode(true)} disabled={!canProceed || isLoading}>
              <Eye className="w-5 h-5 mr-2" /> Preview
            </Button>
          )}
          
          {currentStep === steps.length - 1 ? (
            <Button onClick={handleComplete} disabled={isCompleting || !canProceed || isLoading}>
              Complete <Check className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => onStepChange(currentStep + 1)} disabled={!canProceed || isLoading || isSaving}>
              Next <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
      
      {draftSaved && (
        <div className="text-sm text-muted-foreground mt-2 animate-pulse">
          Draft saved automatically
        </div>
      )}
    </div>
  );
}

// Helper components for step layout
export function WizardStepContainer({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function WizardStepHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

export function WizardStepContent({ children }: { children: React.ReactNode }) {
  return <div className="mt-6">{children}</div>;
}
