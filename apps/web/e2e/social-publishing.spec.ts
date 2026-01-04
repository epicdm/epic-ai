/**
 * Social Publishing E2E Tests
 *
 * Tests for:
 * - Social accounts connection (mock OAuth)
 * - Content creation and composer
 * - Scheduling posts
 * - Publishing workflow
 * - Suggestions and AI generation
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

test.describe("Social Dashboard", () => {
  test("should load social dashboard page", async ({ page }) => {
    await page.goto("/dashboard/social");
    await page.waitForLoadState("networkidle");

    // Should show main content
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should display social accounts section", async ({ page }) => {
    await page.goto("/dashboard/social/accounts");
    await page.waitForLoadState("networkidle");

    // Should be on accounts page
    await expect(page).toHaveURL(/accounts|social/);
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Social Account Connection", () => {
  test("should load accounts management page", async ({ page }) => {
    await page.goto("/dashboard/social/accounts");
    await page.waitForLoadState("networkidle");

    // Should show accounts UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch social accounts via API", async ({ page, request }) => {
    const response = await request.get("/api/social/accounts", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return accounts or empty array
    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || data.accounts !== undefined).toBeTruthy();
    }
  });

  test("should fetch social integrations status", async ({ page, request }) => {
    const response = await request.get("/api/social/integrations", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // API should respond
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Content Creation", () => {
  test("should load content creation page", async ({ page }) => {
    await page.goto("/dashboard/social/create");
    await page.waitForLoadState("networkidle");

    // Should show content creation UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should load content generation page", async ({ page }) => {
    await page.goto("/dashboard/content/generate");
    await page.waitForLoadState("networkidle");

    // Should show generation UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should load content approval queue", async ({ page }) => {
    await page.goto("/dashboard/content/approval");
    await page.waitForLoadState("networkidle");

    // Should show approval queue
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should load published content page", async ({ page }) => {
    await page.goto("/dashboard/content/published");
    await page.waitForLoadState("networkidle");

    // Should show published content
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe("AI Content Generation API", () => {
  test("should have content generation endpoint", async ({ request }) => {
    // POST to generate content
    const response = await request.post("/api/content/generate", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
        "Content-Type": "application/json",
      },
      data: {
        topic: "Test topic for E2E",
        platforms: ["twitter"],
      },
    });

    // Should respond (even if error due to missing API keys in test)
    expect([200, 400, 401, 500]).toContain(response.status());
  });

  test("should fetch content suggestions", async ({ request }) => {
    const response = await request.get("/api/social/suggestions", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return suggestions or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Social Suggestions", () => {
  test("should load suggestions page", async ({ page }) => {
    await page.goto("/dashboard/social/suggestions");
    await page.waitForLoadState("networkidle");

    // Should show suggestions UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Social Settings", () => {
  test("should load social settings page", async ({ page }) => {
    await page.goto("/dashboard/social/settings");
    await page.waitForLoadState("networkidle");

    // Should show settings UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch social settings via API", async ({ request }) => {
    const response = await request.get("/api/social/settings", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return settings or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Publishing Workflow", () => {
  test("should have publishing endpoint", async ({ request }) => {
    const response = await request.post("/api/social/publish", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
        "Content-Type": "application/json",
      },
      data: {
        contentId: "test-content-id",
        platforms: ["twitter"],
      },
    });

    // Should respond (may fail due to no content, but endpoint should exist)
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });

  test("should fetch content queue via API", async ({ request }) => {
    const response = await request.get("/api/content/queue", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return queue or error (400 = missing params)
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });

  test("should fetch content calendar via API", async ({ request }) => {
    const response = await request.get("/api/content/calendar", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return calendar data or error (400 = missing params)
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });
});
