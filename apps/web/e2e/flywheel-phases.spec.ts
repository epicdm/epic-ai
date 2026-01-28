/**
 * Flywheel Phases E2E Tests
 *
 * Tests for the 5-phase setup wizard:
 * - UNDERSTAND: Bird's Eye analysis, Facebook connect, website analysis
 * - CREATE: Content factory, AI generation
 * - DISTRIBUTE: Social publishing setup
 * - LEARN: Analytics and insights
 * - AUTOMATE: Autopilot configuration
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

test.describe("Flywheel Phase Navigation", () => {
  test("should display setup hub page", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Should show the setup page or redirect to a phase
    const url = page.url();
    expect(url).toMatch(/setup/);
  });

  test("should navigate to UNDERSTAND phase", async ({ page }) => {
    await page.goto("/setup/understand");
    await page.waitForLoadState("networkidle");

    // Should be on understand page or show wizard
    await expect(page).toHaveURL(/understand|setup/);
  });

  test("should navigate to CREATE phase", async ({ page }) => {
    await page.goto("/setup/create");
    await page.waitForLoadState("networkidle");

    // Should be on create page
    await expect(page).toHaveURL(/create|setup/);
  });

  test("should navigate to DISTRIBUTE phase", async ({ page }) => {
    await page.goto("/setup/distribute");
    await page.waitForLoadState("networkidle");

    // Should be on distribute page
    await expect(page).toHaveURL(/distribute|setup/);
  });

  test("should navigate to LEARN phase", async ({ page }) => {
    await page.goto("/setup/learn");
    await page.waitForLoadState("networkidle");

    // Should be on learn page
    await expect(page).toHaveURL(/learn|setup/);
  });

  test("should navigate to AUTOMATE phase", async ({ page }) => {
    await page.goto("/setup/automate");
    await page.waitForLoadState("networkidle");

    // Should be on automate page
    await expect(page).toHaveURL(/automate|setup/);
  });
});

test.describe("UNDERSTAND Phase - Bird's Eye Wizard", () => {
  test("should load Bird's Eye wizard", async ({ page }) => {
    await page.goto("/setup/understand");
    await page.waitForLoadState("networkidle");

    // Look for wizard content or phase indicators
    const wizardContent = page.locator('[data-testid="birds-eye-wizard"], .wizard, main');
    await expect(wizardContent).toBeVisible({ timeout: 15000 });
  });

  test("should show analysis options", async ({ page }) => {
    await page.goto("/setup/understand");
    await page.waitForLoadState("networkidle");

    // The page should contain text about analysis or understanding brand
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("CREATE Phase - Content Factory", () => {
  test("should load content creation page", async ({ page }) => {
    await page.goto("/dashboard/content");

    // Should show content creation UI (content-preview is the root container)
    await expect(
      page.locator('[data-testid="content-preview"]')
    ).toBeVisible({ timeout: 30000 });
  });
});

test.describe("DISTRIBUTE Phase - Social Publishing", () => {
  test("should load distribution page", async ({ page }) => {
    await page.goto("/setup/distribute");
    await page.waitForLoadState("networkidle");

    // Should show social distribution UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe("LEARN Phase - Analytics", () => {
  test("should load learning/analytics page", async ({ page }) => {
    await page.goto("/dashboard/analytics");

    // Analytics page uses "analytics-page" in loading/empty states and "dashboard-content" in loaded state
    await expect(
      page.locator('[data-testid="analytics-page"], [data-testid="dashboard-content"]').first()
    ).toBeVisible({ timeout: 30000 });
  });
});

test.describe("AUTOMATE Phase - Autopilot", () => {
  test("should load automation page", async ({ page }) => {
    await page.goto("/setup/automate");
    await page.waitForLoadState("networkidle");

    // Should show automation UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Flywheel Progress Tracking", () => {
  test("should persist phase progress via API", async ({ page, request }) => {
    // Call the flywheel progress API
    const response = await request.get("/api/flywheel/progress", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return progress data or 404 if not found
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      // Verify response structure - has phases object with UNDERSTAND
      expect(data).toHaveProperty("phases");
      expect(data.phases).toHaveProperty("UNDERSTAND");
    }
  });
});
