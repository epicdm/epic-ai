import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { auditConfig } from "../audit.config.js";
import { crawlSite } from "./crawler.js";
import { runJourneys } from "./journeys.js";
import { writeReport } from "./report.js";

async function main() {
  if (!auditConfig.baseUrl || auditConfig.baseUrl.includes("YOUR_DOMAIN_HERE")) {
    throw new Error("Set BASE_URL to your live site domain.");
  }

  fs.mkdirSync(auditConfig.outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Load authenticated state from debug-auth.ts session
  const authStatePath = path.join(auditConfig.outputDir, 'auth-state.json');
  const context = await browser.newContext({
    storageState: authStatePath
  });

  const startUrl = auditConfig.baseUrl;

  console.log(chalk.cyan(`\n[Audit] Base URL: ${auditConfig.baseUrl}`));

  console.log(chalk.yellow("\n[Audit] Running journeys..."));
  const journeys = await runJourneys(context);

  console.log(chalk.yellow("\n[Audit] Crawling site..."));
  const { pages, issues } = await crawlSite(context, startUrl);

  console.log(chalk.green(`\n[Audit] Crawl completed. Pages=${pages.length} Issues=${issues.length}`));

  console.log(chalk.yellow("\n[Audit] Writing report..."));
  writeReport({ pages, issues, journeys });

  await context.close();
  await browser.close();

  console.log(chalk.green(`\n✅ Done. Reports in: ${path.resolve(auditConfig.outputDir)}`));
}

main().catch((e) => {
  console.error("\n❌ Audit failed:", e);
  process.exit(1);
});
