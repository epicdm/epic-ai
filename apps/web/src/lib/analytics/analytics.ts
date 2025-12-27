"use client";

import posthog from "posthog-js";
import { useCallback } from "react";
import type { AnalyticsEvent } from "./events";

/**
 * Track an analytics event
 */
export function trackEvent<T extends AnalyticsEvent["name"]>(
  eventName: T,
  properties?: Extract<AnalyticsEvent, { name: T }>["properties"]
): void {
  if (typeof window === "undefined") return;

  // Check if PostHog is initialized
  if (posthog && posthog.__loaded) {
    posthog.capture(eventName, properties || {});

    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${eventName}`, properties);
    }
  } else if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] (disabled) ${eventName}`, properties);
  }
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (posthog && posthog.__loaded) {
    posthog.identify(userId, properties);

    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Identified user: ${userId}`, properties);
    }
  }
}

/**
 * Reset user identity (for logout)
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;

  if (posthog && posthog.__loaded) {
    posthog.reset();

    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] User reset");
    }
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (posthog && posthog.__loaded) {
    posthog.people.set(properties);
  }
}

/**
 * Set one-time user properties (only set if not already set)
 */
export function setUserPropertiesOnce(properties: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (posthog && posthog.__loaded) {
    posthog.people.set_once(properties);
  }
}

/**
 * Hook for analytics tracking
 */
export function useAnalytics() {
  const track = useCallback(<T extends AnalyticsEvent["name"]>(
    eventName: T,
    properties?: Extract<AnalyticsEvent, { name: T }>["properties"]
  ) => {
    trackEvent(eventName, properties);
  }, []);

  const identify = useCallback((
    userId: string,
    properties?: Record<string, unknown>
  ) => {
    identifyUser(userId, properties);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  return {
    track,
    identify,
    reset,
    setProperties: setUserProperties,
    setPropertiesOnce: setUserPropertiesOnce,
  };
}
