/**
 * E2E Test Fixtures
 *
 * Extends Playwright's base test with custom fixtures for:
 * - Authenticated user sessions
 * - Mock API responses
 * - Database access
 */

import { test as base, expect, Page, BrowserContext } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_IDS } from "../utils/seed";

// Custom fixture types
interface TestFixtures {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
  testUser: {
    id: string;
    email: string;
    orgId: string;
    brandId: string;
  };
}

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  // Provide test user data
  testUser: async ({}, use) => {
    await use({
      id: TEST_IDS.TEST_USER_ID,
      email: TEST_IDS.TEST_USER_EMAIL,
      orgId: TEST_IDS.TEST_ORG_ID,
      brandId: TEST_IDS.TEST_BRAND_ID,
    });
  },

  // Authenticated browser context
  authenticatedContext: async ({ browser }, use) => {
    // Create a new context with stored auth state
    const context = await browser.newContext({
      storageState: "playwright/.auth/user.json",
    });
    await use(context);
    await context.close();
  },

  // Authenticated page
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    // Set up Clerk testing token for authentication
    await setupClerkTestingToken({ page });
    await use(page);
  },
});

export { expect };

// Re-export test IDs for convenience
export { TEST_IDS };

/**
 * Helper: Wait for page to be fully loaded
 * Uses domcontentloaded instead of networkidle because ClerkProvider's
 * dynamic mode keeps persistent network connections to Clerk's servers,
 * preventing networkidle from being reached.
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Helper: Navigate to dashboard and wait for load
 */
export async function navigateToDashboard(page: Page) {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await waitForPageLoad(page);
  // Wait for main content to appear
  await page.waitForSelector('[data-testid="dashboard-content"], .dashboard-content, main', {
    timeout: 15000,
  });
}

/**
 * Helper: Navigate to setup wizard
 */
export async function navigateToSetup(page: Page, phase?: string) {
  const url = phase ? `/setup/${phase}` : "/setup";
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForPageLoad(page);
}

/**
 * Helper: Navigate to onboarding
 */
export async function navigateToOnboarding(page: Page) {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await waitForPageLoad(page);
}

/**
 * Helper: Click and wait for navigation
 */
export async function clickAndWait(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click(selector),
  ]);
}

/**
 * Helper: Fill form field with label
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const input = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") input`);
  await input.fill(value);
}

/**
 * Helper: Take screenshot with timestamp
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `playwright-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Helper: Mock Clerk auth for testing
 * This sets up bypass cookies that the app can check and the Clerk testing token
 */
export async function setupMockAuth(page: Page) {
  // Set up Clerk testing token (required by @clerk/testing)
  await setupClerkTestingToken({ page });

  // Set the UAT bypass cookie that the app checks
  await page.context().addCookies([
    {
      name: "uat_bypass",
      value: "true",
      domain: "localhost",
      path: "/",
    },
    {
      name: "uat_user_id",
      value: TEST_IDS.TEST_USER_ID,
      domain: "localhost",
      path: "/",
    },
  ]);
}

/**
 * Helper: Clear mock auth
 */
export async function clearMockAuth(page: Page) {
  await page.context().clearCookies();
}

/**
 * Helper: Verify element is visible with text
 */
export async function expectTextVisible(page: Page, text: string, timeout = 10000) {
  await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout });
}

/**
 * Helper: Verify toast/notification appears
 */
export async function expectToast(page: Page, message: string) {
  // Common toast selectors
  const toastSelector = '[role="alert"], .toast, [data-testid="toast"]';
  await expect(page.locator(toastSelector).filter({ hasText: message })).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Helper: Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === "string"
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  );
}
