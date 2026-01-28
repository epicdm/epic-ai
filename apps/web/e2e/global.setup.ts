/**
 * Global Setup for E2E Tests
 *
 * Runs before all tests to:
 * 1. Set up Clerk testing environment using @clerk/testing
 * 2. Seed the database with test data
 * 3. Set up authenticated session
 */

import { chromium, FullConfig } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";
import { seedTestDatabase, TEST_IDS } from "./utils/seed";
import * as fs from "fs";
import * as path from "path";

async function globalSetup(config: FullConfig) {
  console.log("[Global Setup] Starting E2E test setup...");

  // 1. Set up Clerk testing environment
  // This initializes the Clerk testing client and bypasses authentication
  console.log("[Global Setup] Setting up Clerk test environment...");
  await clerkSetup();
  console.log("[Global Setup] Clerk test environment configured");

  // Ensure auth directory exists
  const authDir = path.join(__dirname, "..", "playwright", ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 2. Seed the database
  console.log("[Global Setup] Seeding database...");
  try {
    await seedTestDatabase();
    console.log("[Global Setup] Database seeded successfully");
  } catch (error) {
    console.error("[Global Setup] Failed to seed database:", error);
    throw error;
  }

  // 3. Set up authenticated session
  console.log("[Global Setup] Setting up authenticated session...");
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Get base URL from config
    const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

    // Set UAT bypass cookies for testing without Clerk auth validation
    await context.addCookies([
      {
        name: "uat_bypass",
        value: "true",
        domain: new URL(baseURL).hostname,
        path: "/",
      },
      {
        name: "uat_user_id",
        value: TEST_IDS.TEST_USER_ID,
        domain: new URL(baseURL).hostname,
        path: "/",
      },
    ]);

    // Navigate to verify the session works
    await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");

    // Take a screenshot for debugging
    await page.screenshot({
      path: path.join(__dirname, "..", "playwright-results", "setup-dashboard.png"),
    });

    // Save storage state
    await context.storageState({ path: path.join(authDir, "user.json") });
    console.log("[Global Setup] Authentication state saved");
  } catch (error) {
    console.error("[Global Setup] Failed to set up auth:", error);
    // Take error screenshot
    await page.screenshot({
      path: path.join(__dirname, "..", "playwright-results", "setup-error.png"),
    });
    throw error;
  } finally {
    await browser.close();
  }

  console.log("[Global Setup] E2E test setup completed!");
}

export default globalSetup;
