import fs from "node:fs";
import path from "node:path";
import { auditConfig } from "../audit.config.js";
import { CrawlIssue, CrawlPage } from "./crawler.js";
import { JourneyResult } from "./journeys.js";

export function writeReport(opts: {
  pages: CrawlPage[];
  issues: CrawlIssue[];
  journeys: JourneyResult[];
}) {
  const outDir = auditConfig.outputDir;
  fs.mkdirSync(outDir, { recursive: true });

  const severityCount = opts.issues.reduce(
    (acc, i) => ((acc[i.severity] = (acc[i.severity] || 0) + 1), acc),
    {} as Record<string, number>
  );

  const blockers = severityCount["blocker"] || 0;
  const highs = severityCount["high"] || 0;

  const overall = blockers > 0 || highs > 0 ? "NO-GO" : "GO";

  const reportJson = {
    generatedAt: new Date().toISOString(),
    baseUrl: auditConfig.baseUrl,
    overall,
    severityCount,
    journeys: opts.journeys,
    pages: opts.pages,
    issues: opts.issues
  };

  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(reportJson, null, 2));

  const md = [
    `# Release Audit Report`,
    ``,
    `Base URL: ${auditConfig.baseUrl}`,
    `Generated: ${reportJson.generatedAt}`,
    ``,
    `## Executive Summary`,
    `**Decision: ${overall}**`,
    ``,
    `### Severity Counts`,
    `- Blocker: ${severityCount["blocker"] || 0}`,
    `- High: ${severityCount["high"] || 0}`,
    `- Medium: ${severityCount["medium"] || 0}`,
    `- Low: ${severityCount["low"] || 0}`,
    ``,
    `## Journeys`,
    ...opts.journeys.map(j => `- **${j.name}**: ${j.status} — ${j.details}${j.url ? ` (${j.url})` : ""}`),
    ``,
    `## Issues`,
    ...opts.issues
      .sort((a, b) =>
        (["blocker", "high", "medium", "low"].indexOf(a.severity) -
          ["blocker", "high", "medium", "low"].indexOf(b.severity))
      )
      .map(i => `- [${i.severity.toUpperCase()}] ${i.type} @ ${i.url} — ${i.detail}`),
    ``,
    `## Crawl Map`,
    ...opts.pages.map(p => `- ${p.status || "?"} ${p.url} (depth=${p.depth}) title="${(p.title || "").slice(0, 80)}"`),
    ``
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "report.md"), md);
}
