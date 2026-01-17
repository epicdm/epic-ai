import Link, { LinkProps } from "next/link";
import { type RoutePath } from "@/lib/routes/route-config";
import React from "react";

/**
 * Type-safe Link component
 * Ensures href is a valid route from the centralized config
 *
 * Usage:
 * ```tsx
 * <TypedLink href="/dashboard/content">Content</TypedLink>
 * // TypeScript error if route doesn't exist:
 * <TypedLink href="/invalid-route">Invalid</TypedLink>
 * ```
 */
export interface TypedLinkProps extends Omit<LinkProps, "href"> {
  href: RoutePath;
  children: React.ReactNode;
  className?: string;
}

export function TypedLink({ href, children, className, ...props }: TypedLinkProps) {
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}
