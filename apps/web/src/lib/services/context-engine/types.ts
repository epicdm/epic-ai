/**
 * Context Engine Types
 */

export interface ScrapedContent {
  title: string | null;
  content: string;
  url?: string;
  publishedAt?: Date;
  contentType: 'text' | 'news' | 'product' | 'service' | 'testimonial' | 'about' | 'faq';
  metadata?: Record<string, unknown>;
}

export interface ProcessedContext {
  title: string | null;
  content: string;
  summary: string;
  url?: string;
  contentType: string;
  importance: number;
  isEvergreen: boolean;
  keywords: string[];
  topics: string[];
  publishedAt?: Date;
  expiresAt?: Date;
}

export interface WebsiteScraperConfig {
  url: string;
  maxPages?: number;
  includeSubpages?: boolean;
  excludePatterns?: string[];
}

export interface RSSFeedConfig {
  feedUrl: string;
  maxItems?: number;
}

export interface DocumentConfig {
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface ManualNoteConfig {
  title: string;
  content: string;
  contentType?: string;
}

export interface ContextSourceConfig {
  WEBSITE: WebsiteScraperConfig;
  RSS_FEED: RSSFeedConfig;
  PDF_UPLOAD: DocumentConfig;
  MANUAL_NOTE: ManualNoteConfig;
  // Add more as needed
}

export interface ScrapeResult {
  success: boolean;
  items: ScrapedContent[];
  error?: string;
  metadata?: {
    pagesScraped?: number;
    duration?: number;
  };
}
