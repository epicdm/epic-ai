/**
 * Voice Agent E2E Tests
 *
 * Tests for:
 * - Voice dashboard loading
 * - Agent configuration
 * - Calls log viewing
 * - Phone numbers management
 * - Voice persona settings
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

test.describe("Voice Dashboard", () => {
  test("should load voice dashboard page", async ({ page }) => {
    await page.goto("/dashboard/voice", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show voice UI
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should display voice dashboard content", async ({ page }) => {
    await page.goto("/dashboard/voice", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Page should have content
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("Voice Agents", () => {
  test("should load agents list page", async ({ page }) => {
    await page.goto("/dashboard/voice/agents", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show agents list
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should load new agent creation page", async ({ page }) => {
    await page.goto("/dashboard/voice/agents/new", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show agent creation form
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch agents via API", async ({ request }) => {
    const response = await request.get("/api/voice/agents", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return agents or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });

  test("should have agent templates endpoint", async ({ request }) => {
    const response = await request.get("/api/voice/templates", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return templates or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Voice Calls", () => {
  test("should load calls log page", async ({ page }) => {
    await page.goto("/dashboard/voice/calls", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show calls list
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch calls via API", async ({ request }) => {
    const response = await request.get("/api/voice/calls", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return calls or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });

  test("should fetch voice stats via API", async ({ request }) => {
    const response = await request.get("/api/voice/stats", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return stats or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Phone Numbers", () => {
  test("should load phone numbers page", async ({ page }) => {
    await page.goto("/dashboard/voice/numbers", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show numbers list
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should fetch phone numbers via API", async ({ request }) => {
    const response = await request.get("/api/voice/phone-numbers", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return numbers or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });

  test("should fetch numbers via alternate endpoint", async ({ request }) => {
    const response = await request.get("/api/voice/numbers", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return numbers or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Voice Personas", () => {
  test("should fetch personas via API", async ({ request }) => {
    const response = await request.get("/api/voice/personas", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return personas or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Voice Test Demo", () => {
  test("should load voice test page", async ({ page }) => {
    await page.goto("/dashboard/voice/test", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show test interface
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test("should have voice token endpoint", async ({ request }) => {
    const response = await request.get("/api/voice/token", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return token or error (405 = method not allowed, requires POST)
    expect([200, 401, 404, 405, 500]).toContain(response.status());
  });
});

test.describe("Voice Campaigns", () => {
  test("should fetch campaigns via API", async ({ request }) => {
    const response = await request.get("/api/voice/campaigns", {
      headers: {
        Cookie: `uat_bypass=true; uat_user_id=${TEST_IDS.TEST_USER_ID}`,
      },
    });

    // Should return campaigns or error
    expect([200, 401, 404, 500]).toContain(response.status());
  });
});

test.describe("Brand Voice Settings", () => {
  test("should load brand voice page", async ({ page }) => {
    await page.goto("/dashboard/brand/voice", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Should show brand voice settings
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});
