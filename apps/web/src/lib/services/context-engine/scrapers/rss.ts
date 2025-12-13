/**
 * RSS Feed Scraper - Extracts content from RSS/Atom feeds
 */

import type { ScrapedContent, ScrapeResult, RSSFeedConfig } from '../types';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  content?: string;
}

export class RSSFeedScraper {
  private config: RSSFeedConfig;

  constructor(config: RSSFeedConfig) {
    this.config = {
      maxItems: 20,
      ...config,
    };
  }

  async scrape(): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.config.feedUrl, {
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
        .slice(0, this.config.maxItems)
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
      const itemXml = match[1];
      items.push(this.parseRSSItem(itemXml));
    }

    // If no RSS items, try Atom format
    if (items.length === 0) {
      const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((match = atomEntryRegex.exec(xml)) !== null) {
        const entryXml = match[1];
        items.push(this.parseAtomEntry(entryXml));
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
    // For Atom, link is in an attribute
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
