/**
 * FocusAnchor Component
 *
 * Wrapper component that adds focusPath support to any form section.
 * When the wizard redirects with a focusPath, the matching FocusAnchor
 * will be scrolled into view and highlighted.
 */

"use client";

import { type ReactNode, type ElementType, createElement } from "react";

interface FocusAnchorProps {
  /** The focusPath this anchor responds to (e.g., "company.hours") */
  focusPath: string;
  /** Child elements to wrap */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Element tag to render (default: "div") */
  as?: ElementType;
}

/**
 * FocusAnchor wraps a form section and enables deep-linking via focusPath.
 *
 * Usage:
 * ```tsx
 * <FocusAnchor focusPath="company.hours">
 *   <h3>Business Hours</h3>
 *   <input name="hours.monday" />
 * </FocusAnchor>
 * ```
 *
 * When the wizard redirects with `?focus=company.hours`, this section
 * will scroll into view and be highlighted.
 */
export function FocusAnchor({
  focusPath,
  children,
  className = "",
  as: Component = "div",
}: FocusAnchorProps) {
  return createElement(
    Component,
    {
      id: focusPath,
      "data-focus-path": focusPath,
      className: `focus-anchor ${className}`.trim(),
      tabIndex: -1,
    },
    children
  );
}

/**
 * CSS styles for focus highlighting (add to global CSS or component):
 *
 * .focus-anchor {
 *   transition: box-shadow 0.3s ease, background-color 0.3s ease;
 *   border-radius: 0.5rem;
 *   outline: none;
 * }
 *
 * .focus-anchor.focus-highlight {
 *   box-shadow: 0 0 0 2px var(--color-primary, #3b82f6);
 *   background-color: rgba(59, 130, 246, 0.05);
 * }
 *
 * @keyframes focus-pulse {
 *   0%, 100% { box-shadow: 0 0 0 2px var(--color-primary, #3b82f6); }
 *   50% { box-shadow: 0 0 0 4px var(--color-primary, #3b82f6); }
 * }
 *
 * .focus-anchor.focus-highlight {
 *   animation: focus-pulse 1s ease-in-out 2;
 * }
 */

export default FocusAnchor;
