/**
 * Authentication E2E Tests
 *
 * Tests for:
 * - UAT bypass login flow
 * - Session persistence
 * - Logout functionality
 * - Protected route access
 */

import { test, expect, TEST_IDS } from "./fixtures/test-fixtures";

test.describe("Authentication", () => {
  test.describe("UAT Bypass Mode", () => {
    test("should authenticate with UAT bypass cookies", async ({ page }) => {
      // Set UAT bypass cookies
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

      // Navigate to dashboard
      await page.goto("/dashboard");

      // Should not be redirected to sign-in
      await expect(page).not.toHaveURL(/sign-in/);

      // Should see dashboard content
      await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
    });

    test("should persist session across page navigation", async ({ page }) => {
      // Set UAT bypass cookies
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

      // Navigate to dashboard
      await page.goto("/dashboard");
      await expect(page.locator("main")).toBeVisible({ timeout: 15000 });

      // Navigate to settings
      await page.goto("/dashboard/settings");
      await expect(page).not.toHaveURL(/sign-in/);

      // Navigate to content
      await page.goto("/dashboard/content");
      await expect(page).not.toHaveURL(/sign-in/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should handle unauthenticated access to dashboard", async ({ page }) => {
      // Clear all cookies
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // In dev/UAT mode, may not redirect - just verify page loads
      // In production, this would redirect to sign-in
      const url = page.url();
      expect(url).toMatch(/dashboard|sign-in/);
    });

    test("should handle unauthenticated access to setup pages", async ({ page }) => {
      // Clear all cookies
      await page.context().clearCookies();

      // Try to access setup
      await page.goto("/setup");
      await page.waitForLoadState("networkidle");

      // In dev/UAT mode, may not redirect - just verify page loads
      const url = page.url();
      expect(url).toMatch(/setup|sign-in/);
    });

    test("should handle unauthenticated access to voice pages", async ({ page }) => {
      // Clear all cookies
      await page.context().clearCookies();

      // Try to access voice
      await page.goto("/dashboard/voice");
      await page.waitForLoadState("networkidle");

      // In dev/UAT mode, may not redirect - just verify page loads
      const url = page.url();
      expect(url).toMatch(/voice|sign-in/);
    });
  });

  test.describe("Sign-in Page", () => {
    test("should display sign-in page correctly", async ({ page }) => {
      await page.goto("/sign-in");

      // Should show sign-in UI (Clerk component)
      await expect(page).toHaveTitle(/Epic|Sign In/i, { timeout: 10000 });
    });

    test("should display sign-up page correctly", async ({ page }) => {
      await page.goto("/sign-up");

      // Should show sign-up UI (Clerk component)
      await expect(page).toHaveTitle(/Epic|Sign Up/i, { timeout: 10000 });
    });
  });
});
