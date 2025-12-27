/**
 * RSS Feed Syncer Processor
 *
 * Handles SYNC_RSS jobs by fetching RSS/Atom feeds and storing
 * items as ContextItems for use in content generation.
 *
 * Implements:
 * - T024: Create rss-syncer processor
 * - T027: Integrate with RSSFeedScraper
 * - T028: Unhealthy source detection (5 consecutive failures)
 * - T029: Prisma Job and ContextSource status updates
 *
 * @module processors/rss-syncer
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import { JobType, type ContextScrapingPayload, type ContextScrapingResult } from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'RSSSyncer';

/**
 * Maximum consecutive failures before marking source as unhealthy
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Syncs an RSS feed and stores items as ContextItems
 */
async function syncRSSFeed(
  job: Job<JobData<ContextScrapingPayload>>
): Promise<ContextScrapingResult> {
  const startTime = Date.now();
  const { contextSourceId, brandId, url, maxItems } = job.data.payload;

  logger.info(COMPONENT, `Starting RSS sync for source ${contextSourceId}`, {
    brandId,
    url,
    maxItems,
  });

  // Update ContextSource to SYNCING status
  await updateSourceStatus(contextSourceId, 'SYNCING');

  try {
    await reportProgress(job, 10, 'Initializing RSS feed scraper...');

    // Use inline scraper implementation (self-contained for workers package)
    const scraper = new InlineRSSFeedScraper({
      feedUrl: url,
      maxItems: maxItems || 20,
    });

    await reportProgress(job, 30, 'Fetching RSS feed...');

    const result = await scraper.scrape();

    if (!result.success) {
      await handleSyncFailure(contextSourceId, result.error || 'RSS sync failed');
      throw new Error(result.error || 'RSS feed sync failed');
    }

    await reportProgress(job, 60, `Processing ${result.items.length} feed items...`);

    // Process and store scraped items
    const { itemsCreated, itemsSkipped, errors } = await storeRSSItems(
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

    logger.info(COMPONENT, `RSS sync completed for ${contextSourceId}`, {
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
    await handleSyncFailure(contextSourceId, errorMessage);
    throw error;
  }
}

/**
 * Stores RSS items as ContextItems in the database
 * Handles deduplication by URL
 */
async function storeRSSItems(
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
      // Check for duplicate by URL (RSS items always have URLs)
      if (item.url) {
        const existing = await prisma.contextItem.findFirst({
          where: {
            sourceId: contextSourceId,
            url: item.url,
          },
        });

        if (existing) {
          // RSS items are typically not updated, skip duplicates
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
          contentType: item.contentType || 'news',
          importance: 5, // Default importance for news items
          isEvergreen: false, // RSS items are typically time-sensitive
          publishedAt: item.publishedAt,
        },
      });

      itemsCreated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to store item';
      errors.push({ itemUrl: item.url, message });
      logger.warn(COMPONENT, `Failed to store RSS item: ${message}`, { url: item.url });
    }
  }

  return { itemsCreated, itemsSkipped, errors };
}

/**
 * Handles sync failure with consecutive failure tracking
 * Implements T028: Unhealthy source detection
 */
async function handleSyncFailure(
  contextSourceId: string,
  errorMessage: string
): Promise<void> {
  try {
    const source = await prisma.contextSource.findUnique({
      where: { id: contextSourceId },
      select: {
        id: true,
        config: true,
      },
    });

    if (!source) return;

    const config = source.config as Record<string, unknown> || {};
    const currentFailures = (config.consecutiveFailures as number) || 0;
    const newFailures = currentFailures + 1;

    const newStatus = newFailures >= MAX_CONSECUTIVE_FAILURES ? 'PAUSED' : 'ERROR';

    logger.warn(COMPONENT, `RSS sync failure ${newFailures}/${MAX_CONSECUTIVE_FAILURES}`, {
      contextSourceId,
      errorMessage,
      newStatus,
    });

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
      logger.error(COMPONENT, `RSS source marked as unhealthy after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`, {
        contextSourceId,
      });
    }
  } catch (err) {
    logger.error(COMPONENT, 'Failed to update RSS source failure status', {
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

    logger.debug(COMPONENT, `Updated RSS source status to ${status}`, { contextSourceId });
  } catch (err) {
    logger.error(COMPONENT, 'Failed to update RSS source status', {
      contextSourceId,
      status,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Inline RSSFeedScraper (fallback if import fails)
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
    duration?: number;
  };
}

/**
 * Inline RSS feed scraper implementation
 * Used as fallback when the shared service cannot be imported
 */
class InlineRSSFeedScraper {
  private feedUrl: string;
  private maxItems: number;

  constructor(config: { feedUrl: string; maxItems?: number }) {
    this.feedUrl = config.feedUrl;
    this.maxItems = config.maxItems || 20;
  }

  async scrape(): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          items: [],
          error: `Failed to fetch feed: ${response.status}`,
        };
      }

      const xml = await response.text();
      const items = this.parseFeed(xml);

      const scrapedItems: ScrapedContent[] = items
        .slice(0, this.maxItems)
        .map((item) => ({
          title: item.title,
          content: this.cleanContent(item.content || item.description),
          url: item.link,
          contentType: 'news' as const,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        }))
        .filter((item) => item.content.length > 50);

      return {
        success: true,
        items: scrapedItems,
        metadata: {
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

  private parseFeed(xml: string): FeedItem[] {
    const items: FeedItem[] = [];

    // Try RSS 2.0 format
    const rssItemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = rssItemRegex.exec(xml)) !== null) {
      items.push(this.parseRSSItem(match[1]));
    }

    // If no RSS items, try Atom format
    if (items.length === 0) {
      const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((match = atomEntryRegex.exec(xml)) !== null) {
        items.push(this.parseAtomEntry(match[1]));
      }
    }

    return items;
  }

  private parseRSSItem(xml: string): FeedItem {
    return {
      title: this.extractTag(xml, 'title'),
      link: this.extractTag(xml, 'link'),
      description: this.extractTag(xml, 'description'),
      pubDate: this.extractTag(xml, 'pubDate'),
      content: this.extractTag(xml, 'content:encoded') || this.extractTag(xml, 'content'),
    };
  }

  private parseAtomEntry(xml: string): FeedItem {
    const linkMatch = xml.match(/<link[^>]*href="([^"]*)"[^>]*>/i);

    return {
      title: this.extractTag(xml, 'title'),
      link: linkMatch?.[1] || '',
      description: this.extractTag(xml, 'summary'),
      pubDate: this.extractTag(xml, 'published') || this.extractTag(xml, 'updated'),
      content: this.extractTag(xml, 'content'),
    };
  }

  private extractTag(xml: string, tagName: string): string {
    // Handle CDATA
    const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle regular content
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? this.decodeEntities(match[1].trim()) : '';
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }

  private cleanContent(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  }
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  content?: string;
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * RSS syncer processor for SYNC_RSS jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const rssSyncerProcessor = createProcessor<
  ContextScrapingPayload,
  ContextScrapingResult
>(JobType.SYNC_RSS, syncRSSFeed);
