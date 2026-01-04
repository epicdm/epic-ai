/**
 * Global Teardown for E2E Tests
 *
 * Runs after all tests to:
 * 1. Clean up test data from database
 * 2. Generate test summary
 */

import { FullConfig } from "@playwright/test";
import { cleanupTestData, disconnectDatabase } from "./utils/seed";

async function globalTeardown(config: FullConfig) {
  console.log("[Global Teardown] Starting E2E test cleanup...");

  // Only cleanup if not preserving data for debugging
  if (process.env.E2E_PRESERVE_DATA !== "true") {
    try {
      await cleanupTestData();
      console.log("[Global Teardown] Test data cleaned up");
    } catch (error) {
      console.error("[Global Teardown] Failed to cleanup test data:", error);
      // Don't throw - cleanup failures shouldn't fail the test run
    }
  } else {
    console.log("[Global Teardown] Preserving test data (E2E_PRESERVE_DATA=true)");
  }

  // Disconnect from database
  await disconnectDatabase();

  console.log("[Global Teardown] E2E test cleanup completed!");
}

export default globalTeardown;
