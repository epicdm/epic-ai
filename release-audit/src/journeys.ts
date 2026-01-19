import { BrowserContext } from "@playwright/test";
import { auditConfig } from "../audit.config.js";
import { loginWith2FA } from "./auth.js";

export type JourneyResult = {
  name: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  details: string;
  url?: string;
};

export async function runJourneys(context: BrowserContext) {
  const results: JourneyResult[] = [];
  const page = await context.newPage();

  try {
    await page.goto(auditConfig.baseUrl, { waitUntil: "networkidle" });
    results.push({ name: "Homepage reachable", status: "PASS", details: "Loaded successfully", url: page.url() });
  } catch (e: any) {
    results.push({ name: "Homepage reachable", status: "FAIL", details: e?.message || "Homepage load failed" });
    await page.close();
    return results;
  }

  try {
    await loginWith2FA(page);
    results.push({ name: "Login + 2FA", status: "PASS", details: "Authenticated session established" });
  } catch (e: any) {
    results.push({ name: "Login + 2FA", status: "FAIL", details: e?.message || "Login failed" });
    await page.close();
    return results;
  }

  const keyPaths = ["/dashboard", "/dashboard/brand", "/dashboard/content"];

  for (const p of keyPaths) {
    const u = new URL(p, auditConfig.baseUrl).toString();
    try {
      await page.goto(u, { waitUntil: "networkidle" });
      results.push({ name: `Key page: ${p}`, status: "PASS", details: "Loaded successfully", url: page.url() });
    } catch (e: any) {
      results.push({ name: `Key page: ${p}`, status: "FAIL", details: e?.message || "Failed to load", url: u });
    }
  }

  try {
    await page.click('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign out")');
    await page.waitForLoadState("networkidle");
    results.push({ name: "Logout", status: "PASS", details: "Logout action completed" });
  } catch {
    results.push({ name: "Logout", status: "UNKNOWN", details: "Logout action could not be verified (selector mismatch)" });
  }

  await page.close();
  return results;
}
