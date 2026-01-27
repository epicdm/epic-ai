/**
 * Enrichment Engine - Website Scraper
 *
 * Fetches and cleans website text for AI extraction.
 * Simple, safe v1 implementation.
 *
 * @module engines/enrichment/scraper
 */

import * as cheerio from "cheerio";

// ============================================
// TYPES
// ============================================

export interface ScrapeResult {
  success: boolean;
  /** Cleaned text content (max 12KB) */
  cleanedText: string;
  /** Short excerpt for previews (max 1KB) */
  excerpt: string;
  /** Page title */
  title?: string;
  /** Meta description */
  metaDescription?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================
// SCRAPER
// ============================================

/**
 * Scrape and clean text from a website URL
 *
 * @param url Website URL to scrape
 * @returns Cleaned text content
 */
export async function scrapeWebsiteText(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        success: false,
        cleanedText: "",
        excerpt: "",
        error: "Invalid URL protocol - must be HTTP or HTTPS",
      };
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        cleanedText: "",
        excerpt: "",
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $("title").first().text().trim() || undefined;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      undefined;

    // Remove non-content elements
    $(
      "script, style, nav, footer, header, aside, iframe, noscript, svg, [role='navigation'], [role='banner'], [role='contentinfo']"
    ).remove();

    // Extract main content (prefer semantic elements)
    let text = "";
    const mainContent = $("main, article, [role='main']");

    if (mainContent.length > 0) {
      text = mainContent.text();
    } else {
      text = $("body").text();
    }

    // Clean whitespace
    const cleanedText = text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    return {
      success: true,
      cleanedText: cleanedText.slice(0, 12000), // Max 12KB
      excerpt: cleanedText.slice(0, 1000), // Max 1KB for previews
      title,
      metaDescription,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scrape error";

    // Handle specific errors
    if (message.includes("abort")) {
      return {
        success: false,
        cleanedText: "",
        excerpt: "",
        error: "Request timeout (10s)",
      };
    }

    return {
      success: false,
      cleanedText: "",
      excerpt: "",
      error: message,
    };
  }
}
