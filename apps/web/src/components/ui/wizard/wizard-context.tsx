"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  isOptional?: boolean;
}

export interface WizardContextType {
  steps: WizardStep[];
  currentStep: number;
  data: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setData: (key: string, value: unknown) => void;
  setAllData: (data: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export interface WizardProviderProps {
  children: ReactNode;
  steps: WizardStep[];
  initialStep?: number;
  initialData?: Record<string, unknown>;
  onStepChange?: (step: number, data: Record<string, unknown>) => void;
  onComplete?: (data: Record<string, unknown>) => void;
}

export function WizardProvider({
  children,
  steps,
  initialStep = 0,
  initialData = {},
  onStepChange,
  onComplete,
}: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setDataState] = useState<Record<string, unknown>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
        setError(null);
        onStepChange?.(step, data);
      }
    },
    [steps.length, data, onStepChange]
  );

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      // On last step, trigger onComplete
      onComplete?.(data);
    }
  }, [currentStep, steps.length, goToStep, data, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const setData = useCallback((key: string, value: unknown) => {
    setDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAllData = useCallback((newData: Record<string, unknown>) => {
    setDataState((prev) => ({ ...prev, ...newData }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setErrorCallback = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const value: WizardContextType = {
    steps,
    currentStep,
    data,
    isLoading,
    error,
    goToStep,
    nextStep,
    prevStep,
    setData,
    setAllData,
    setLoading,
    setError: setErrorCallback,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100,
    canGoBack: currentStep > 0,
    canGoForward: currentStep < steps.length - 1,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
