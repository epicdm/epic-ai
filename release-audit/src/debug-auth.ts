import { chromium } from "@playwright/test";
import { auditConfig } from "../audit.config.js";
import readline from "node:readline/promises";

async function debugAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable request/response logging
  page.on('request', req => {
    if (req.url().includes('clerk') || req.url().includes('sign')) {
      console.log(`→ ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async res => {
    if (res.url().includes('clerk') || res.url().includes('sign')) {
      const status = res.status();
      console.log(`← ${status} ${res.url()}`);
      if (status >= 400) {
        try {
          const body = await res.json();
          console.log('   Error response:', JSON.stringify(body, null, 2));
        } catch {
          console.log('   (Could not parse response body)');
        }
      }
    }
  });

  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));

  // Navigate to sign-in
  console.log('\n[1] Navigating to sign-in...');
  await page.goto(`${auditConfig.baseUrl}/sign-in`, { waitUntil: "networkidle" });

  // Fill credentials
  console.log('\n[2] Filling credentials...');
  const emailField = page.getByRole('textbox', { name: 'Email address' });
  const passwordField = page.getByRole('textbox', { name: 'Password' });

  await emailField.waitFor({ state: 'visible', timeout: 5000 });
  await passwordField.waitFor({ state: 'visible', timeout: 5000 });

  await emailField.fill(auditConfig.auth.email);
  await passwordField.fill(auditConfig.auth.password);
  await page.waitForTimeout(500);

  console.log('\n[3] Submitting credentials...');
  await passwordField.press('Enter');

  // Wait for 2FA page
  console.log('\n[4] Waiting for 2FA page...');
  await page.waitForURL('**/sign-in/factor-two', { timeout: 10000 });
  await page.waitForLoadState("networkidle");

  console.log('\n[5] Taking screenshot of 2FA page...');
  await page.screenshot({ path: '/opt/epic-ai/release-audit/output/2fa-page.png', fullPage: true });

  // Get 2FA code
  let otp = process.env.OTP_CODE;
  if (!otp) {
    console.log('\n⏳ Waiting for 2FA code...');
    console.log('   Checking /tmp/otp-code.txt for code...');

    // Poll for code file
    const otpFile = '/tmp/otp-code.txt';
    let attempts = 0;
    while (attempts < 120) { // Wait up to 2 minutes
      try {
        const fs = await import('node:fs/promises');
        const code = await fs.readFile(otpFile, 'utf-8');
        otp = code.trim();
        if (otp) {
          console.log(`\n[6] Got 2FA code from file: ${otp}`);
          await fs.unlink(otpFile); // Delete file after reading
          break;
        }
      } catch {
        // File doesn't exist yet, keep waiting
      }
      await page.waitForTimeout(1000);
      attempts++;
    }

    if (!otp) {
      console.log('\n⚠️  Timeout waiting for OTP code');
      await browser.close();
      return;
    }
  } else {
    console.log(`\n[6] Using 2FA code from environment: ${otp}`);
  }

  console.log(`\n[6] Filling 2FA code: ${otp}`);
  const otpInput = page.getByRole('textbox', { name: 'Enter verification code' });
  await otpInput.fill(otp.trim());
  await page.waitForTimeout(300);

  // Take screenshot before clicking Continue
  console.log('\n[7] Taking screenshot before Continue...');
  await page.screenshot({ path: '/opt/epic-ai/release-audit/output/2fa-filled.png', fullPage: true });

  // Wait for redirect after successful 2FA
  console.log('\n[8] Waiting for redirect after successful 2FA...');
  try {
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('\n✅ Successfully redirected to dashboard!');
  } catch {
    console.log('\n⚠️  Did not redirect to dashboard, checking current URL...');
  }

  // Check current URL
  const currentUrl = page.url();
  console.log(`\n[9] Current URL: ${currentUrl}`);

  // Take screenshot of result
  console.log('\n[10] Taking screenshot of result...');
  await page.screenshot({ path: '/opt/epic-ai/release-audit/output/auth-success.png', fullPage: true });

  // Save authenticated state
  console.log('\n[11] Saving authenticated browser state...');
  await context.storageState({ path: '/opt/epic-ai/release-audit/output/auth-state.json' });

  console.log('\n✅ Authentication complete! State saved to output/auth-state.json');

  await browser.close();
}

debugAuth().catch(console.error);
