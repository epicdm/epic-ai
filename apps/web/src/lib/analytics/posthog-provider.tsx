"use client";

import posthog from "posthog-js";
import { useEffect, createContext, useContext, useState, ReactNode, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";

// PostHog configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

interface PostHogContextValue {
  isInitialized: boolean;
  isEnabled: boolean;
}

const PostHogContext = createContext<PostHogContextValue>({
  isInitialized: false,
  isEnabled: false,
});

export function usePostHog() {
  return useContext(PostHogContext);
}

// Page view tracker component
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && POSTHOG_KEY) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

// User identification component
function PostHogUserIdentifier() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!POSTHOG_KEY || !isLoaded) return;

    if (userId && user) {
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        username: user.username,
        created_at: user.createdAt,
        image_url: user.imageUrl,
      });
    } else if (!userId) {
      // Reset when user logs out
      posthog.reset();
    }
  }, [userId, user, isLoaded]);

  return null;
}

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const isEnabled = Boolean(POSTHOG_KEY);

  useEffect(() => {
    if (POSTHOG_KEY && typeof window !== "undefined") {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false, // We handle this manually
        capture_pageleave: true,
        loaded: () => {
          setIsInitialized(true);
          if (process.env.NODE_ENV === "development") {
            console.log("[PostHog] Initialized");
          }
        },
      });
    } else {
      // If no key, still mark as initialized (just disabled)
      setIsInitialized(true);
    }
  }, []);

  return (
    <PostHogContext.Provider value={{ isInitialized, isEnabled }}>
      {isEnabled && (
        <Suspense fallback={null}>
          <PostHogPageView />
          <PostHogUserIdentifier />
        </Suspense>
      )}
      {children}
    </PostHogContext.Provider>
  );
}
