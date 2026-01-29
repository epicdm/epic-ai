"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TourContextType = {
  currentTour: string | null;
  currentStep: number;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
};

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = (tourId: string) => {
    setCurrentTour(tourId);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const endTour = () => {
    setCurrentTour(null);
    setCurrentStep(0);
  };

  return (
    <TourContext.Provider 
      value={{ currentTour, currentStep, startTour, nextStep, prevStep, endTour }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("useTour must be used within a TourProvider");
    }
    return {
      currentTour: null,
      currentStep: 0,
      startTour: () => {},
      nextStep: () => {},
      prevStep: () => {},
      endTour: () => {},
    };
  }
  return context;
}
