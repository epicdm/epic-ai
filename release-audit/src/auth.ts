import { Page } from "@playwright/test";
import readline from "node:readline/promises";
import { auditConfig } from "../audit.config.js";

function mask(v: string) {
  if (!v) return "";
  return v.length <= 4 ? "****" : v.slice(0, 2) + "****" + v.slice(-2);
}

export async function loginWith2FA(page: Page) {
  const loginUrl = new URL(auditConfig.auth.loginUrl, auditConfig.baseUrl).toString();
  console.log(`[AUTH] Navigating to login: ${loginUrl}`);

  await page.goto(loginUrl, { waitUntil: "networkidle" });

  // Wait for both fields to be visible and ready
  const emailField = page.getByRole('textbox', { name: 'Email address' });
  const passwordField = page.getByRole('textbox', { name: 'Password' });

  await emailField.waitFor({ state: 'visible', timeout: 5000 });
  await passwordField.waitFor({ state: 'visible', timeout: 5000 });

  // Fill both email and password fields (single-step form to avoid OAuth redirect)
  await emailField.fill(auditConfig.auth.email);
  await passwordField.fill(auditConfig.auth.password);

  // Wait a moment for Clerk's JS to register the filled values
  await page.waitForTimeout(500);

  console.log(`[AUTH] Submitting login for ${auditConfig.auth.email} / ${mask(auditConfig.auth.password)}`);

  // Submit the form by pressing Enter on password field (avoids clicking wrong Continue button)
  await passwordField.press('Enter');

  // Wait for navigation to 2FA page (/sign-in/factor-two)
  await page.waitForURL('**/sign-in/factor-two', { timeout: 10000 });
  await page.waitForLoadState("networkidle");

  // Step 3: Handle 2FA email code
  const otpInput = page.getByRole('textbox', { name: 'Enter verification code' });
  const otpExists = await otpInput.count() > 0;

  if (otpExists) {
    console.log(`[AUTH] 2FA email verification required.`);

    // Check for 2FA code in environment variable first
    let otp = process.env.OTP_CODE;

    if (!otp) {
      // Fall back to interactive prompt
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      otp = await rl.question("Enter verification code from email: ");
      rl.close();
    } else {
      console.log(`[AUTH] Using 2FA code from OTP_CODE environment variable`);
    }

    await otpInput.fill(otp.trim());
    await page.click('button:has-text("Continue")');
    await page.waitForLoadState("networkidle");

    console.log(`[AUTH] 2FA code submitted`);
  }

  // Verify login success by checking URL or dashboard presence
  try {
    // Wait for redirect to dashboard after successful login
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log(`[AUTH] Login successful - redirected to dashboard`);
  } catch (e) {
    // If not redirected to dashboard, check for other logged-in indicators
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding')) {
      console.log(`[AUTH] Login successful - at ${currentUrl}`);
    } else {
      throw new Error(`Login verification failed: unexpected URL ${currentUrl}`);
    }
  }
}
