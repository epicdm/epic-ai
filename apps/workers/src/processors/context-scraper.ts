/**
 * Context Scraper Processor
 *
 * Handles SCRAPE_WEBSITE jobs by scraping website content and storing
 * it as ContextItems for use in content generation.
 *
 * Implements:
 * - T023: Create context-scraper processor
 * - T026: Integrate with WebsiteScraper
 * - T028: Unhealthy source detection (5 consecutive failures)
 * - T029: Prisma Job and ContextSource status updates
 *
 * @module processors/context-scraper
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import { JobType, type ContextScrapingPayload, type ContextScrapingResult } from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'ContextScraper';

/**
 * Maximum consecutive failures before marking source as unhealthy
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Scrapes a website for content and stores as ContextItems
 */
async function scrapeWebsite(
  job: Job<JobData<ContextScrapingPayload>>
): Promise<ContextScrapingResult> {
  const startTime = Date.now();
  const { contextSourceId, brandId, url, maxItems } = job.data.payload;

  logger.info(COMPONENT, `Starting website scrape for source ${contextSourceId}`, {
    brandId,
    url,
    maxItems,
  });

  // Update ContextSource to SYNCING status
  await updateSourceStatus(contextSourceId, 'SYNCING');

  try {
    await reportProgress(job, 10, 'Initializing website scraper...');

    // Use inline scraper implementation (self-contained for workers package)
    const scraper = new InlineWebsiteScraper({
      url,
      maxPages: maxItems || 10,
      includeSubpages: true,
      excludePatterns: ['/blog/', '/news/', '/press/', '/careers/', '/jobs/'],
    });

    await reportProgress(job, 20, 'Scraping website pages...');

    const result = await scraper.scrape();

    if (!result.success) {
      await handleScrapeFailure(contextSourceId, result.error || 'Scrape failed');
      throw new Error(result.error || 'Website scrape failed');
    }

    await reportProgress(job, 60, `Processing ${result.items.length} pages...`);

    // Process and store scraped items
    const { itemsCreated, itemsSkipped, errors } = await storeScrapedItems(
      contextSourceId,
      result.items,
      job
    );

    await reportProgress(job, 90, 'Finalizing...');

    // Update source to ACTIVE status on success
    await updateSourceStatus(contextSourceId, 'ACTIVE', {
      lastSync: new Date(),
      syncError: null,
      consecutiveFailures: 0,
    });

    const scrapeDurationMs = Date.now() - startTime;

    logger.info(COMPONENT, `Website scrape completed for ${contextSourceId}`, {
      itemsProcessed: result.items.length,
      itemsCreated,
      itemsSkipped,
      scrapeDurationMs,
    });

    return {
      itemsProcessed: result.items.length,
      itemsCreated,
      itemsSkipped,
      errors,
      scrapeDurationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await handleScrapeFailure(contextSourceId, errorMessage);
    throw error;
  }
}

/**
 * Stores scraped items as ContextItems in the database
 */
async function storeScrapedItems(
  contextSourceId: string,
  items: ScrapedContent[],
  job: Job<JobData<ContextScrapingPayload>>
): Promise<{
  itemsCreated: number;
  itemsSkipped: number;
  errors: { itemUrl?: string; message: string }[];
}> {
  let itemsCreated = 0;
  let itemsSkipped = 0;
  const errors: { itemUrl?: string; message: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = 60 + Math.floor((i / items.length) * 30);
    await reportProgress(job, progress, `Storing item ${i + 1}/${items.length}...`);

    try {
      // Check for duplicate by URL
      if (item.url) {
        const existing = await prisma.contextItem.findFirst({
          where: {
            sourceId: contextSourceId,
            url: item.url,
          },
        });

        if (existing) {
          // Update existing item instead of creating duplicate
          await prisma.contextItem.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              content: item.content,
              contentType: item.contentType,
              updatedAt: new Date(),
            },
          });
          itemsSkipped++;
          continue;
        }
      }

      // Create new context item
      await prisma.contextItem.create({
        data: {
          sourceId: contextSourceId,
          title: item.title,
          content: item.content,
          url: item.url,
          contentType: item.contentType,
          importance: 5, // Default importance
          isEvergreen: item.contentType === 'about' || item.contentType === 'faq',
          publishedAt: item.publishedAt,
        },
      });

      itemsCreated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to store item';
      errors.push({ itemUrl: item.url, message });
      logger.warn(COMPONENT, `Failed to store item: ${message}`, { url: item.url });
    }
  }

  return { itemsCreated, itemsSkipped, errors };
}

/**
 * Handles scrape failure with consecutive failure tracking
 * Implements T028: Unhealthy source detection
 */
async function handleScrapeFailure(
  contextSourceId: string,
  errorMessage: string
): Promise<void> {
  try {
    // Get current source to check failure count
    const source = await prisma.contextSource.findUnique({
      where: { id: contextSourceId },
      select: {
        id: true,
        config: true,
      },
    });

    if (!source) return;

    // Extract consecutive failures from config (stored as JSON)
    const config = source.config as Record<string, unknown> || {};
    const currentFailures = (config.consecutiveFailures as number) || 0;
    const newFailures = currentFailures + 1;

    // Determine new status based on failure count
    const newStatus = newFailures >= MAX_CONSECUTIVE_FAILURES ? 'PAUSED' : 'ERROR';

    logger.warn(COMPONENT, `Scrape failure ${newFailures}/${MAX_CONSECUTIVE_FAILURES}`, {
      contextSourceId,
      errorMessage,
      newStatus,
    });

    // Update source with error status and failure count
    await prisma.contextSource.update({
      where: { id: contextSourceId },
      data: {
        status: newStatus,
        syncError: errorMessage,
        config: {
          ...config,
          consecutiveFailures: newFailures,
          lastFailure: new Date().toISOString(),
        },
      },
    });

    if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
      logger.error(COMPONENT, `Source marked as unhealthy after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`, {
        contextSourceId,
      });
    }
  } catch (err) {
    logger.error(COMPONENT, 'Failed to update source failure status', {
      contextSourceId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Updates ContextSource status and metadata
 * Implements T029: ContextSource status updates
 */
async function updateSourceStatus(
  contextSourceId: string,
  status: 'PENDING' | 'ACTIVE' | 'SYNCING' | 'ERROR' | 'PAUSED',
  additionalData?: {
    lastSync?: Date;
    syncError?: string | null;
    consecutiveFailures?: number;
  }
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = { status };

    if (additionalData?.lastSync) {
      updateData.lastSync = additionalData.lastSync;
    }
    if (additionalData?.syncError !== undefined) {
      updateData.syncError = additionalData.syncError;
    }

    // Update consecutive failures in config if provided
    if (additionalData?.consecutiveFailures !== undefined) {
      const source = await prisma.contextSource.findUnique({
        where: { id: contextSourceId },
        select: { config: true },
      });

      const config = (source?.config as Record<string, unknown>) || {};
      updateData.config = {
        ...config,
        consecutiveFailures: additionalData.consecutiveFailures,
      };
    }

    await prisma.contextSource.update({
      where: { id: contextSourceId },
      data: updateData,
    });

    logger.debug(COMPONENT, `Updated source status to ${status}`, { contextSourceId });
  } catch (err) {
    logger.error(COMPONENT, 'Failed to update source status', {
      contextSourceId,
      status,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Inline WebsiteScraper (fallback if import fails)
// =============================================================================

interface ScrapedContent {
  title: string | null;
  content: string;
  url?: string;
  publishedAt?: Date;
  contentType: 'text' | 'news' | 'product' | 'service' | 'testimonial' | 'about' | 'faq';
}

interface ScrapeResult {
  success: boolean;
  items: ScrapedContent[];
  error?: string;
  metadata?: {
    pagesScraped?: number;
    duration?: number;
  };
}

/**
 * Inline website scraper implementation
 * Used as fallback when the shared service cannot be imported
 */
class InlineWebsiteScraper {
  private url: string;
  private maxPages: number;
  private includeSubpages: boolean;
  private excludePatterns: string[];
  private visitedUrls: Set<string> = new Set();

  constructor(config: {
    url: string;
    maxPages?: number;
    includeSubpages?: boolean;
    excludePatterns?: string[];
  }) {
    this.url = config.url;
    this.maxPages = config.maxPages || 10;
    this.includeSubpages = config.includeSubpages ?? true;
    this.excludePatterns = config.excludePatterns || [];
  }

  async scrape(): Promise<ScrapeResult> {
    const startTime = Date.now();
    const items: ScrapedContent[] = [];

    try {
      const baseUrl = new URL(this.url);
      const pagesToScrape = [this.url];

      while (pagesToScrape.length > 0 && items.length < this.maxPages) {
        const url = pagesToScrape.shift()!;

        if (this.visitedUrls.has(url)) continue;
        this.visitedUrls.add(url);

        try {
          const pageContent = await this.scrapePage(url);
          if (pageContent) {
            items.push(pageContent);

            if (this.includeSubpages) {
              const links = await this.extractLinks(url, baseUrl.origin);
              for (const link of links) {
                if (!this.visitedUrls.has(link) && !pagesToScrape.includes(link)) {
                  pagesToScrape.push(link);
                }
              }
            }
          }
        } catch {
          // Continue with next page on error
        }
      }

      return {
        success: true,
        items,
        metadata: {
          pagesScraped: items.length,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async scrapePage(url: string): Promise<ScrapedContent | null> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const title = this.extractTitle(html);
    const content = this.extractMainContent(html);
    const contentType = this.detectPageType(url, content);

    if (!content || content.length < 100) return null;

    return { url, title, content, contentType };
  }

  private extractTitle(html: string): string {
    const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogMatch) return ogMatch[1];

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  private extractMainContent(html: string): string {
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

    let content = mainMatch?.[1] || articleMatch?.[1] || cleanHtml;

    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    return content.slice(0, 10000);
  }

  private detectPageType(url: string, _content: string): ScrapedContent['contentType'] {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('/about')) return 'about';
    if (lowerUrl.includes('/faq') || lowerUrl.includes('/help')) return 'faq';
    if (lowerUrl.includes('/product') || lowerUrl.includes('/service')) return 'product';
    if (lowerUrl.includes('/testimonial') || lowerUrl.includes('/review')) return 'testimonial';

    return 'text';
  }

  private async extractLinks(pageUrl: string, baseOrigin: string): Promise<string[]> {
    try {
      const response = await fetch(pageUrl);
      const html = await response.text();

      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi;
      const links: string[] = [];
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];

        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          continue;
        }

        if (href.startsWith('/')) {
          href = baseOrigin + href;
        } else if (!href.startsWith('http')) {
          continue;
        }

        try {
          const linkUrl = new URL(href);
          if (linkUrl.origin !== baseOrigin) continue;

          const shouldExclude = this.excludePatterns.some((pattern) =>
            linkUrl.pathname.toLowerCase().includes(pattern.toLowerCase())
          );
          if (shouldExclude) continue;

          links.push(href.split('?')[0].split('#')[0]);
        } catch {
          continue;
        }
      }

      return [...new Set(links)];
    } catch {
      return [];
    }
  }
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * Context scraper processor for SCRAPE_WEBSITE jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const contextScraperProcessor = createProcessor<
  ContextScrapingPayload,
  ContextScrapingResult
>(JobType.SCRAPE_WEBSITE, scrapeWebsite);
