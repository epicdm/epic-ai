"use client";

/**
 * Auto-Save Hook for Wizard Progress
 *
 * Provides debounced auto-save functionality for wizard progress,
 * with visual indicators and offline fallback support.
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type SetupPath = "AI_EXPRESS" | "GUIDED" | "EXPERT";

interface AutoSaveOptions {
  brandId: string;
  setupPath: SetupPath;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

interface AutoSaveState {
  saveProgress: (step: number, stepId: string, data: Record<string, unknown>) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

const LOCAL_STORAGE_KEY = "wizard_progress_backup";

export function useWizardAutoSave({
  brandId,
  setupPath,
  debounceMs = 1500,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: AutoSaveOptions): AutoSaveState {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<{
    step: number;
    stepId: string;
    data: Record<string, unknown>;
  } | null>(null);

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback(
    (step: number, stepId: string, data: Record<string, unknown>) => {
      try {
        const backup = {
          brandId,
          setupPath,
          step,
          stepId,
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backup));
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }
    },
    [brandId, setupPath]
  );

  // Clear localStorage backup after successful save
  const clearLocalStorageBackup = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }
  }, []);

  // Perform the actual API save
  const performSave = useCallback(
    async (step: number, stepId: string, data: Record<string, unknown>) => {
      setIsSaving(true);
      setSaveStatus("saving");
      setError(null);
      onSaveStart?.();

      try {
        const response = await fetch("/api/flywheel/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            setupPath,
            currentStep: step,
            stepId,
            data,
            overallProgress: Math.round(((step + 1) / 12) * 100),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save progress: ${response.status}`);
        }

        setLastSaved(new Date());
        setSaveStatus("saved");
        clearLocalStorageBackup();
        onSaveComplete?.();

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 3000);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setSaveStatus("error");
        // Keep localStorage backup on error
        saveToLocalStorage(step, stepId, data);
        onSaveError?.(error);
      } finally {
        setIsSaving(false);
        pendingDataRef.current = null;
      }
    },
    [brandId, setupPath, onSaveStart, onSaveComplete, onSaveError, clearLocalStorageBackup, saveToLocalStorage]
  );

  // Debounced save function
  const saveProgress = useCallback(
    (step: number, stepId: string, data: Record<string, unknown>) => {
      // Store pending data
      pendingDataRef.current = { step, stepId, data };

      // Immediately save to localStorage as backup
      saveToLocalStorage(step, stepId, data);

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new debounced timeout
      debounceTimeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          performSave(
            pendingDataRef.current.step,
            pendingDataRef.current.stepId,
            pendingDataRef.current.data
          );
        }
      }, debounceMs);
    },
    [debounceMs, performSave, saveToLocalStorage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Check for offline backup on mount
  useEffect(() => {
    try {
      const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        // If backup is from same brand and less than 24 hours old, restore
        if (
          parsed.brandId === brandId &&
          new Date(parsed.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ) {
          console.log("Found offline backup, will sync on next save");
        }
      }
    } catch (e) {
      console.warn("Failed to check localStorage backup:", e);
    }
  }, [brandId]);

  return {
    saveProgress,
    isSaving,
    lastSaved,
    error,
    saveStatus,
  };
}

/**
 * SaveStatusIndicator Component
 *
 * Visual indicator for save status.
 */
export function getSaveStatusText(status: "idle" | "saving" | "saved" | "error"): string {
  switch (status) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return "";
  }
}
