/**
 * Website Scraper - Extracts content from websites
 *
 * Uses a simple fetch + HTML parsing approach.
 * For production, consider using a headless browser for JS-rendered sites.
 */

import type { ScrapedContent, ScrapeResult, WebsiteScraperConfig } from '../types';

interface PageContent {
  url: string;
  title: string;
  content: string;
  type: ScrapedContent['contentType'];
}

export class WebsiteScraper {
  private config: WebsiteScraperConfig;
  private visitedUrls: Set<string> = new Set();

  constructor(config: WebsiteScraperConfig) {
    this.config = {
      maxPages: 10,
      includeSubpages: true,
      excludePatterns: ['/blog/', '/news/', '/press/', '/careers/', '/jobs/'],
      ...config,
    };
  }

  async scrape(): Promise<ScrapeResult> {
    const startTime = Date.now();
    const items: ScrapedContent[] = [];

    try {
      const baseUrl = new URL(this.config.url);

      // Start with the main page
      const pagesToScrape = [this.config.url];

      while (pagesToScrape.length > 0 && items.length < (this.config.maxPages || 10)) {
        const url = pagesToScrape.shift()!;

        if (this.visitedUrls.has(url)) continue;
        this.visitedUrls.add(url);

        try {
          const pageContent = await this.scrapePage(url);
          if (pageContent) {
            items.push({
              title: pageContent.title,
              content: pageContent.content,
              url: pageContent.url,
              contentType: pageContent.type,
            });

            // Find more pages to scrape if enabled
            if (this.config.includeSubpages) {
              const links = await this.extractLinks(url, baseUrl.origin);
              for (const link of links) {
                if (!this.visitedUrls.has(link) && !pagesToScrape.includes(link)) {
                  pagesToScrape.push(link);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to scrape ${url}:`, err);
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

  private async scrapePage(url: string): Promise<PageContent | null> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract content using simple regex (for production, use a proper HTML parser)
    const title = this.extractTitle(html);
    const content = this.extractMainContent(html);
    const type = this.detectPageType(url, content);

    if (!content || content.length < 100) return null;

    return { url, title, content, type };
  }

  private extractTitle(html: string): string {
    // Try og:title first
    const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogMatch) return ogMatch[1];

    // Fall back to <title>
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  private extractMainContent(html: string): string {
    // Remove script and style tags
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Try to find main content areas
    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const contentDiv = cleanHtml.match(/<div[^>]*(?:class|id)="[^"]*(?:content|main|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let content = mainMatch?.[1] || articleMatch?.[1] || contentDiv?.[1] || cleanHtml;

    // Strip remaining HTML tags
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    // Limit content length
    return content.slice(0, 10000);
  }

  private detectPageType(url: string, content: string): ScrapedContent['contentType'] {
    const lowerUrl = url.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (lowerUrl.includes('/about') || lowerUrl.includes('/who-we-are')) {
      return 'about';
    }
    if (lowerUrl.includes('/faq') || lowerUrl.includes('/help')) {
      return 'faq';
    }
    if (lowerUrl.includes('/product') || lowerUrl.includes('/service')) {
      return 'product';
    }
    if (lowerUrl.includes('/testimonial') || lowerUrl.includes('/review') || lowerUrl.includes('/case-stud')) {
      return 'testimonial';
    }
    if (lowerContent.includes('pricing') || lowerContent.includes('$ per month')) {
      return 'service';
    }

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

        // Skip non-http links
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          continue;
        }

        // Convert relative URLs to absolute
        if (href.startsWith('/')) {
          href = baseOrigin + href;
        } else if (!href.startsWith('http')) {
          continue;
        }

        // Only include same-origin links
        try {
          const linkUrl = new URL(href);
          if (linkUrl.origin !== baseOrigin) continue;

          // Check exclude patterns
          const shouldExclude = this.config.excludePatterns?.some((pattern) =>
            linkUrl.pathname.toLowerCase().includes(pattern.toLowerCase())
          );
          if (shouldExclude) continue;

          links.push(href.split('?')[0].split('#')[0]); // Remove query and hash
        } catch {
          continue;
        }
      }

      return [...new Set(links)]; // Dedupe
    } catch {
      return [];
    }
  }
}
