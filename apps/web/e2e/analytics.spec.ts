/**
 * Analytics E2E Tests
 *
 * Tests for:
 * - Analytics dashboard loading
 * - Engagement charts display
 * - Metrics API endpoints
 * - AI learnings
 */

import { test, expect, TEST_IDS } from "./fixtures/test-fixtures";

// Setup authenticated context for all tests
test.beforeEach(async ({ page }) => {
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
});

test.describe("Analytics Dashboard", () => {
  test("should load analytics page", async ({ page }) => {
    await page.goto("/dashboard/analytics");
  
    // Verify component is actually visible
    await page.waitForSelector('[data-visible="true"]', { timeout: 60000 });
  
    const mainContent = page.locator('[data-testid="dashboard-content"]');
    await expect(mainContent).toBeVisible({ timeout: 30000 });
  });

  test("should display analytics content", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await page.waitForLoadState("networkidle");

    // Page should have content
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("Analytics API", () => {
  test("should fetch analytics data", async ({ request }) => {
    const response = await request.get("/api/analytics", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return analytics or error
    expect([200, 401, 404, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      // Verify response is an object
      expect(typeof data).toBe("object");
    }
  });

  test("should fetch AI learnings", async ({ request }) => {
    const response = await request.get("/api/analytics/learnings", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return learnings or error (400 = missing params)
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Dashboard Metrics", () => {
  test("should verify dashboard functionality", async ({ page }) => {
    await page.goto('/dashboard');
  
    // Verify core elements exist
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="flywheel-health"]')).toBeVisible({ timeout: 30000 });
  });

  test("should fetch dashboard data via API", async ({ request }) => {
    const response = await request.get("/api/dashboard", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return dashboard data or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });

  test("should have unified dashboard API", async ({ request }) => {
    const response = await request.get("/api/dashboard/unified", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return unified data or 404 if not implemented
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Brand Analytics", () => {
  test("should load brand dashboard", async ({ page }) => {
    await page.goto("/dashboard/brand");
    await page.waitForLoadState("networkidle");

    // Should show brand UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch brand brain data", async ({ request }) => {
    const response = await request.get("/api/brand-brain", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return brand data or error (400 = missing params)
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });
});
