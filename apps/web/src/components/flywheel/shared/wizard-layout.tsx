import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader, Progress, Button, Link, Tooltip } from "@heroui/react";
import { ChevronLeft, ChevronRight, X, Check, Sparkles, Home, ChevronRight as ChevronRightIcon, Undo2, Redo2, History, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import type { WizardStep, WizardNavigation } from "@/lib/flywheel/types";
import { showCelebration } from "@/components/ui/celebration";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [history, setHistory] = useState<Array<{step: number, data: any}>>([]);
  const [showPreview, setShowPreview] = useState(false);
  
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
          <Button onClick={handleComplete} isLoading={isCompleting}>
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
          <Tooltip content="History">
            <Button variant="ghost" size="icon" onClick={() => console.log("Show history panel")}>
              <History className="w-5 h-5" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Progress visualization */}
      {progressVariant === "bar" ? (
        <Progress value={Math.round(((currentStep + 1) / steps.length) * 100)} className="mb-6" />
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
              <Tooltip content="Undo">
                <Button variant="ghost" size="icon" onClick={undo} disabled={history.length === 0}>
                  <Undo2 className="w-5 h-5" />
                </Button>
              </Tooltip>
              <Tooltip content="Redo">
                <Button variant="ghost" size="icon" onClick={redo} disabled={true /* TODO */}>
                  <Redo2 className="w-5 h-5" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>

        <div className="flex gap-4">
          {currentStep !== 0 && (
            <Button variant="bordered" onClick={() => onStepChange(currentStep - 1)} disabled={isLoading}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Back
            </Button>
          )}
          
          {showPreview && currentStep !== steps.length - 1 && (
            <Button variant="bordered" onClick={() => setIsPreviewMode(true)} disabled={!canProceed || isLoading}>
              <Eye className="w-5 h-5 mr-2" /> Preview
            </Button>
          )}
          
          {currentStep === steps.length - 1 ? (
            <Button onClick={handleComplete} isLoading={isCompleting} disabled={!canProceed || isLoading}>
              Complete <Check className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => onStepChange(currentStep + 1)} isLoading={isLoading || isSaving} disabled={!canProceed || isLoading || isSaving}>
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
