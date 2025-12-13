/**
 * Context Manager - Orchestrates context source management
 *
 * Handles:
 * - Adding/removing context sources
 * - Triggering sync operations
 * - Storing processed content to database
 */

import { prisma } from '@epic-ai/database';
import type { ContextSourceType, ContextSourceStatus } from '@prisma/client';
import { WebsiteScraper } from './scrapers/website';
import { RSSFeedScraper } from './scrapers/rss';
import { DocumentProcessor } from './processors/document';
import { AIProcessor } from './processors/ai-processor';
import type { ScrapedContent, ProcessedContext, WebsiteScraperConfig, RSSFeedConfig, DocumentConfig, ManualNoteConfig } from './types';

type SourceConfig = WebsiteScraperConfig | RSSFeedConfig | DocumentConfig | ManualNoteConfig;

export class ContextManager {
  private brandId: string;
  private aiProcessor: AIProcessor;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.aiProcessor = new AIProcessor();
  }

  /**
   * Add a new context source
   */
  async addSource(
    type: ContextSourceType,
    name: string,
    config: SourceConfig
  ): Promise<string> {
    const source = await prisma.contextSource.create({
      data: {
        brandId: this.brandId,
        type,
        name,
        config: config as object,
        status: 'PENDING',
      },
    });

    // Trigger initial sync
    await this.syncSource(source.id);

    return source.id;
  }

  /**
   * Sync a specific context source
   */
  async syncSource(sourceId: string): Promise<{ success: boolean; itemsAdded: number; error?: string }> {
    const source = await prisma.contextSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return { success: false, itemsAdded: 0, error: 'Source not found' };
    }

    // Update status to syncing
    await prisma.contextSource.update({
      where: { id: sourceId },
      data: { status: 'SYNCING' },
    });

    try {
      // Scrape content based on source type
      const scrapedContent = await this.scrapeSource(source.type, source.config as unknown as SourceConfig);

      if (!scrapedContent.success) {
        await prisma.contextSource.update({
          where: { id: sourceId },
          data: {
            status: 'ERROR',
            syncError: scrapedContent.error,
          },
        });
        return { success: false, itemsAdded: 0, error: scrapedContent.error };
      }

      // Process with AI
      const processedItems = await this.aiProcessor.processBatch(scrapedContent.items);

      // Store to database
      const itemsAdded = await this.storeContextItems(sourceId, processedItems);

      // Update source status
      await prisma.contextSource.update({
        where: { id: sourceId },
        data: {
          status: 'ACTIVE',
          lastSync: new Date(),
          syncError: null,
        },
      });

      return { success: true, itemsAdded };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.contextSource.update({
        where: { id: sourceId },
        data: {
          status: 'ERROR',
          syncError: errorMessage,
        },
      });

      return { success: false, itemsAdded: 0, error: errorMessage };
    }
  }

  /**
   * Sync all sources for the brand
   */
  async syncAllSources(): Promise<{ total: number; successful: number; failed: number }> {
    const sources = await prisma.contextSource.findMany({
      where: {
        brandId: this.brandId,
        status: { not: 'PAUSED' },
      },
    });

    let successful = 0;
    let failed = 0;

    for (const source of sources) {
      const result = await this.syncSource(source.id);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { total: sources.length, successful, failed };
  }

  /**
   * Get all context items for the brand
   */
  async getContextItems(options?: {
    contentType?: string;
    minImportance?: number;
    evergreenOnly?: boolean;
    limit?: number;
  }): Promise<ProcessedContext[]> {
    const items = await prisma.contextItem.findMany({
      where: {
        source: { brandId: this.brandId },
        ...(options?.contentType && { contentType: options.contentType }),
        ...(options?.minImportance && { importance: { gte: options.minImportance } }),
        ...(options?.evergreenOnly && { isEvergreen: true }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 100,
    });

    return items.map((item) => ({
      title: item.title,
      content: item.content,
      summary: item.summary || '',
      url: item.url || undefined,
      contentType: item.contentType,
      importance: item.importance,
      isEvergreen: item.isEvergreen,
      keywords: item.keywords,
      topics: item.topics,
      publishedAt: item.publishedAt || undefined,
      expiresAt: item.expiresAt || undefined,
    }));
  }

  /**
   * Search context items by relevance
   */
  async searchContext(query: string, limit: number = 10): Promise<ProcessedContext[]> {
    // Simple keyword-based search
    // For production, implement vector similarity search
    const items = await prisma.contextItem.findMany({
      where: {
        source: { brandId: this.brandId },
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { keywords: { has: query.toLowerCase() } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { importance: 'desc' },
      take: limit,
    });

    return items.map((item) => ({
      title: item.title,
      content: item.content,
      summary: item.summary || '',
      url: item.url || undefined,
      contentType: item.contentType,
      importance: item.importance,
      isEvergreen: item.isEvergreen,
      keywords: item.keywords,
      topics: item.topics,
    }));
  }

  /**
   * Add a manual note as context
   */
  async addManualNote(title: string, content: string, contentType?: string): Promise<string> {
    // Create or get manual notes source
    let source = await prisma.contextSource.findFirst({
      where: {
        brandId: this.brandId,
        type: 'MANUAL_NOTE',
      },
    });

    if (!source) {
      source = await prisma.contextSource.create({
        data: {
          brandId: this.brandId,
          type: 'MANUAL_NOTE',
          name: 'Manual Notes',
          config: {},
          status: 'ACTIVE',
        },
      });
    }

    // Process with AI
    const processed = await this.aiProcessor.process({
      title,
      content,
      contentType: (contentType as ScrapedContent['contentType']) || 'text',
    });

    // Store
    const item = await prisma.contextItem.create({
      data: {
        sourceId: source.id,
        title: processed.title,
        content: processed.content,
        summary: processed.summary,
        contentType: processed.contentType,
        importance: processed.importance,
        isEvergreen: processed.isEvergreen,
        keywords: processed.keywords,
        topics: processed.topics,
      },
    });

    return item.id;
  }

  /**
   * Remove a context source and all its items
   */
  async removeSource(sourceId: string): Promise<void> {
    await prisma.contextSource.delete({
      where: { id: sourceId },
    });
  }

  /**
   * Pause/resume a context source
   */
  async setSourceStatus(sourceId: string, status: ContextSourceStatus): Promise<void> {
    await prisma.contextSource.update({
      where: { id: sourceId },
      data: { status },
    });
  }

  // Private methods

  private async scrapeSource(
    type: ContextSourceType,
    config: SourceConfig
  ): Promise<{ success: boolean; items: ScrapedContent[]; error?: string }> {
    switch (type) {
      case 'WEBSITE':
      case 'COMPETITOR': {
        const scraper = new WebsiteScraper(config as WebsiteScraperConfig);
        return scraper.scrape();
      }

      case 'RSS_FEED':
      case 'NEWS_SEARCH': {
        const scraper = new RSSFeedScraper(config as RSSFeedConfig);
        return scraper.scrape();
      }

      case 'PDF_UPLOAD': {
        const processor = new DocumentProcessor(config as DocumentConfig);
        return processor.process();
      }

      case 'MANUAL_NOTE': {
        const noteConfig = config as ManualNoteConfig;
        return {
          success: true,
          items: [
            {
              title: noteConfig.title,
              content: noteConfig.content,
              contentType: (noteConfig.contentType as ScrapedContent['contentType']) || 'text',
            },
          ],
        };
      }

      default:
        return {
          success: false,
          items: [],
          error: `Unsupported source type: ${type}`,
        };
    }
  }

  private async storeContextItems(sourceId: string, items: ProcessedContext[]): Promise<number> {
    let added = 0;

    for (const item of items) {
      // Check for duplicates by content hash or URL
      const existingByUrl = item.url
        ? await prisma.contextItem.findFirst({
            where: { sourceId, url: item.url },
          })
        : null;

      if (existingByUrl) {
        // Update existing
        await prisma.contextItem.update({
          where: { id: existingByUrl.id },
          data: {
            title: item.title,
            content: item.content,
            summary: item.summary,
            contentType: item.contentType,
            importance: item.importance,
            isEvergreen: item.isEvergreen,
            keywords: item.keywords,
            topics: item.topics,
            publishedAt: item.publishedAt,
            expiresAt: item.expiresAt,
          },
        });
      } else {
        // Create new
        await prisma.contextItem.create({
          data: {
            sourceId,
            title: item.title,
            content: item.content,
            summary: item.summary,
            url: item.url,
            contentType: item.contentType,
            importance: item.importance,
            isEvergreen: item.isEvergreen,
            keywords: item.keywords,
            topics: item.topics,
            publishedAt: item.publishedAt,
            expiresAt: item.expiresAt,
          },
        });
        added++;
      }
    }

    return added;
  }
}
