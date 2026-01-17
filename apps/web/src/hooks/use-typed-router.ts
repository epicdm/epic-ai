"use client";

import { useRouter } from "next/navigation";
import { type RoutePath } from "@/lib/routes/route-config";

/**
 * Type-safe router hook
 * Ensures navigation targets are valid routes from the centralized config
 *
 * Usage:
 * ```tsx
 * const router = useTypedRouter();
 * router.push("/dashboard/content"); // ✅ Valid
 * router.push("/invalid-route");     // ❌ TypeScript error
 * ```
 */
export function useTypedRouter() {
  const router = useRouter();

  return {
    push: (href: RoutePath, options?: { scroll?: boolean }) => {
      router.push(href, options);
    },
    replace: (href: RoutePath, options?: { scroll?: boolean }) => {
      router.replace(href, options);
    },
    prefetch: (href: RoutePath) => {
      router.prefetch(href);
    },
    back: router.back,
    forward: router.forward,
    refresh: router.refresh,
  };
}
