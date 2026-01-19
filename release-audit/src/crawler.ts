import { BrowserContext, Page } from "@playwright/test";
import { auditConfig } from "../audit.config.js";

export type CrawlIssue = {
  type: "broken-link" | "http-error" | "asset-error" | "console-error" | "redirect-chain";
  url: string;
  detail: string;
  severity: "blocker" | "high" | "medium" | "low";
};

export type CrawlPage = {
  url: string;
  status?: number;
  title?: string;
  depth: number;
  links: string[];
  redirectChain?: string[];
  consoleErrors: string[];
  failedRequests: string[];
};

function normalize(url: string) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function isInternal(url: string) {
  try {
    const u = new URL(url);
    return u.origin === new URL(auditConfig.baseUrl).origin;
  } catch {
    return false;
  }
}

export async function crawlSite(context: BrowserContext, startUrl: string) {
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];

  const pages: CrawlPage[] = [];
  const issues: CrawlIssue[] = [];

  while (queue.length && pages.length < auditConfig.crawl.maxPages) {
    const item = queue.shift()!;
    const url = normalize(item.url);

    if (visited.has(url)) continue;
    visited.add(url);

    if (!isInternal(url)) continue;
    if (auditConfig.crawl.excludePatterns.some((r) => r.test(url))) continue;
    if (item.depth > auditConfig.crawl.maxDepth) continue;

    const page: Page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText || "failed"}`);
    });

    let status: number | undefined;
    const redirectChain: string[] = [];

    try {
      const response = await page.goto(url, { waitUntil: "networkidle" });
      status = response?.status();

      const req = response?.request();
      if (req) {
        let r = req.redirectedFrom();
        while (r) {
          redirectChain.unshift(r.url());
          r = r.redirectedFrom();
        }
      }

      const title = await page.title().catch(() => "");

      const linkHrefs = await page.$$eval("a[href]", (as) =>
        as.map((a) => (a as HTMLAnchorElement).href).filter(Boolean)
      );

      const links = [...new Set(linkHrefs.map(normalize))];

      pages.push({
        url,
        status,
        title,
        depth: item.depth,
        links,
        redirectChain,
        consoleErrors,
        failedRequests
      });

      if (status && status >= 400) {
        issues.push({
          type: "http-error",
          url,
          detail: `HTTP ${status}`,
          severity: status >= 500 ? "blocker" : "high"
        });
      }

      if (consoleErrors.length) {
        for (const e of consoleErrors) {
          issues.push({
            type: "console-error",
            url,
            detail: e,
            severity: "high"
          });
        }
      }

      if (failedRequests.length) {
        for (const f of failedRequests) {
          issues.push({
            type: "asset-error",
            url,
            detail: f,
            severity: "medium"
          });
        }
      }

      for (const link of links) {
        if (!isInternal(link)) continue;
        if (visited.has(link)) continue;
        if (auditConfig.crawl.excludePatterns.some((r) => r.test(link))) continue;

        queue.push({ url: link, depth: item.depth + 1 });
      }
    } catch (err: any) {
      issues.push({
        type: "http-error",
        url,
        detail: err?.message || "Navigation failed",
        severity: "blocker"
      });
    } finally {
      await page.close();
    }
  }

  return { pages, issues };
}
