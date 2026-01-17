/**
 * useFirstVisit Hook
 *
 * Tracks whether this is a user's first visit to a specific area.
 * Uses localStorage to persist state across sessions.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "epic-ai-first-visit-";

interface UseFirstVisitOptions {
  /**
   * Unique key for this visit tracker (e.g., "dashboard", "automations")
   */
  key: string;
  /**
   * Whether to automatically mark as visited on first render
   * @default false
   */
  autoMark?: boolean;
}

interface UseFirstVisitReturn {
  /**
   * True if this is the user's first visit
   */
  isFirstVisit: boolean;
  /**
   * Loading state while checking localStorage
   */
  isLoading: boolean;
  /**
   * Mark the area as visited
   */
  markVisited: () => void;
  /**
   * Reset the first visit state (useful for testing)
   */
  reset: () => void;
}

/**
 * Hook to track first visits to different areas of the app
 * @param options Configuration options
 * @returns First visit state and controls
 */
export function useFirstVisit({
  key,
  autoMark = false,
}: UseFirstVisitOptions): UseFirstVisitReturn {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Check localStorage on mount
  useEffect(() => {
    try {
      const hasVisited = localStorage.getItem(storageKey);
      const firstVisit = hasVisited !== "true";
      setIsFirstVisit(firstVisit);

      if (firstVisit && autoMark) {
        localStorage.setItem(storageKey, "true");
        setIsFirstVisit(false);
      }
    } catch (error) {
      // localStorage not available (SSR or disabled)
      console.warn("localStorage not available:", error);
      setIsFirstVisit(false);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, autoMark]);

  const markVisited = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "true");
      setIsFirstVisit(false);
    } catch (error) {
      console.warn("Failed to mark as visited:", error);
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setIsFirstVisit(true);
    } catch (error) {
      console.warn("Failed to reset first visit:", error);
    }
  }, [storageKey]);

  return {
    isFirstVisit,
    isLoading,
    markVisited,
    reset,
  };
}

/**
 * Utility to check if any first-visit key exists
 * Useful for determining if user has been through onboarding
 */
export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}dashboard`) === "true";
  } catch {
    return false;
  }
}
