/**
 * Focus Utilities for Wizard Deep-Linking
 *
 * These utilities allow the wizard to scroll to and highlight
 * specific form fields based on focusPath from gaps.
 */

/**
 * Find an element by focusPath using multiple strategies:
 * 1. Element with id matching focusPath
 * 2. Element with data-focus-path attribute matching focusPath
 * 3. Element with data-focus-path starting with focusPath (prefix match)
 */
export function findElementByFocusPath(focusPath: string): HTMLElement | null {
  // Strategy 1: Direct ID match
  const byId = document.getElementById(focusPath);
  if (byId) return byId;

  // Strategy 2: Exact data-focus-path match
  const byExact = document.querySelector<HTMLElement>(
    `[data-focus-path="${focusPath}"]`
  );
  if (byExact) return byExact;

  // Strategy 3: Prefix match (e.g., "company.hours" matches "company.hours.monday")
  const byPrefix = document.querySelector<HTMLElement>(
    `[data-focus-path^="${focusPath}"]`
  );
  if (byPrefix) return byPrefix;

  // Strategy 4: Check if focusPath contains a prefix that matches
  const parts = focusPath.split(".");
  for (let i = parts.length - 1; i > 0; i--) {
    const prefix = parts.slice(0, i).join(".");
    const byPartialPrefix = document.querySelector<HTMLElement>(
      `[data-focus-path="${prefix}"]`
    );
    if (byPartialPrefix) return byPartialPrefix;
  }

  return null;
}

/**
 * Scroll to an element matching the focusPath and highlight it
 */
export function scrollToFocusPath(focusPath: string): boolean {
  const element = findElementByFocusPath(focusPath);
  if (!element) {
    console.warn(`[focus] No element found for focusPath: ${focusPath}`);
    return false;
  }

  // Scroll element into view
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  // Add highlight class temporarily
  element.classList.add("focus-highlight");

  // Try to focus the element if it's focusable
  const focusable = element.querySelector<HTMLElement>(
    'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) {
    focusable.focus();
  } else if (element.tabIndex >= 0) {
    element.focus();
  }

  // Remove highlight after animation
  setTimeout(() => {
    element.classList.remove("focus-highlight");
  }, 2000);

  return true;
}

/**
 * Apply focusPath after the DOM has settled using double RAF
 * (requestAnimationFrame twice to ensure paint has completed)
 */
export function applyFocusPathAfterPaint(focusPath: string): void {
  if (!focusPath) return;

  // Double RAF ensures the DOM has fully rendered
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToFocusPath(focusPath);
    });
  });
}

/**
 * Get focusPath from URL search params
 */
export function getFocusPathFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("focus") || params.get("focusPath");
}

/**
 * Set focusPath in URL without navigation
 */
export function setFocusPathInUrl(focusPath: string | null): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (focusPath) {
    url.searchParams.set("focus", focusPath);
  } else {
    url.searchParams.delete("focus");
    url.searchParams.delete("focusPath");
  }

  window.history.replaceState({}, "", url.toString());
}
