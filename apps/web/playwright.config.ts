import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

/**
 * Playwright Configuration for Epic AI E2E Tests
 *
 * Configured for:
 * - Deterministic testing with database seeding
 * - Trace, screenshot, and video capture on failure
 * - CI/CD integration with retries
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in parallel within same file
  fullyParallel: false, // Sequential for deterministic seeding

  // Fail the build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers for deterministic behavior
  workers: 1,

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],

  // Global timeout for tests
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Shared settings for all projects
  use: {
    // Base URL for the test server
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Collect trace on failure
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "on-first-retry",

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers/scenarios
  projects: [
    // Main test project with Chromium
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // Mobile viewport tests
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  // Run development server before tests (only when testing locally)
  // When PLAYWRIGHT_BASE_URL is set to a remote URL, skip starting local server
  webServer: process.env.PLAYWRIGHT_BASE_URL?.startsWith("http://localhost")
    || !process.env.PLAYWRIGHT_BASE_URL
    ? {
        command: "pnpm dev",
        port: 3000,
        reuseExistingServer: !process.env.CI, // Reuse existing server in local dev
        timeout: 120000, // 2 minutes for dev server startup
        // Pass environment variables to the spawned process
        // E2E_UAT_BYPASS bypasses authentication checks server-side
        // NEXT_PUBLIC_ prefix makes it available to client-side code
        // CLERK_SIGN_IN_FALLBACK_REDIRECT_URL helps Clerk initialization in test mode
        env: {
          ...process.env,
          E2E_UAT_BYPASS: "true",
          NEXT_PUBLIC_E2E_UAT_BYPASS: "true",
          CLERK_TESTING: "true",
          CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "/dashboard",
        },
      }
    : undefined,

  // Output folder for test artifacts
  outputDir: "playwright-results",
});
