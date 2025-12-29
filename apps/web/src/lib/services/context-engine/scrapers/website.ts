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

/**
 * Brand metadata extracted from a website for brand setup wizard
 */
export interface BrandMetadata {
  companyName: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  colors: string[];
  keywords: string[];
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

  /**
   * Extract brand metadata from a website (used for brand setup wizard)
   */
  async extractBrandMetadata(): Promise<BrandMetadata> {
    try {
      const response = await fetch(this.config.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const html = await response.text();
      const baseUrl = new URL(this.config.url);

      return {
        companyName: this.extractCompanyName(html),
        description: this.extractDescription(html),
        logo: this.extractLogo(html, baseUrl.origin),
        favicon: this.extractFavicon(html, baseUrl.origin),
        socialLinks: this.extractSocialLinks(html),
        colors: this.extractBrandColors(html),
        keywords: this.extractKeywords(html),
      };
    } catch (error) {
      console.error('Failed to extract brand metadata:', error);
      return {
        companyName: null,
        description: null,
        logo: null,
        favicon: null,
        socialLinks: {},
        colors: [],
        keywords: [],
      };
    }
  }

  /**
   * Extract company name from og:site_name or title
   */
  private extractCompanyName(html: string): string | null {
    // Try og:site_name first (most reliable for company name)
    const ogSiteName = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogSiteName?.[1]) return ogSiteName[1].trim();

    // Try application-name
    const appName = html.match(/<meta[^>]*name="application-name"[^>]*content="([^"]*)"[^>]*>/i);
    if (appName?.[1]) return appName[1].trim();

    // Fall back to title, but clean it up
    const title = this.extractTitle(html);
    if (title) {
      // Remove common suffixes like " - Home", " | Official Site", etc.
      return title
        .split(/\s*[|\-–—]\s*/)[0]
        .trim();
    }

    return null;
  }

  /**
   * Extract description from og:description or meta description
   */
  private extractDescription(html: string): string | null {
    // Try og:description first
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogDesc?.[1]) return ogDesc[1].trim();

    // Also try the other attribute order
    const ogDescAlt = html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"[^>]*>/i);
    if (ogDescAlt?.[1]) return ogDescAlt[1].trim();

    // Fall back to meta description
    const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    if (metaDesc?.[1]) return metaDesc[1].trim();

    // Also try alternate order
    const metaDescAlt = html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);
    if (metaDescAlt?.[1]) return metaDescAlt[1].trim();

    return null;
  }

  /**
   * Extract logo from og:image or other common locations
   */
  private extractLogo(html: string, origin: string): string | null {
    // Try og:image first (often used for social sharing)
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogImage?.[1]) return this.resolveUrl(ogImage[1], origin);

    // Also try alternate order
    const ogImageAlt = html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i);
    if (ogImageAlt?.[1]) return this.resolveUrl(ogImageAlt[1], origin);

    // Try twitter:image
    const twitterImage = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i);
    if (twitterImage?.[1]) return this.resolveUrl(twitterImage[1], origin);

    // Look for logo in img tags with common naming patterns
    const logoImg = html.match(/<img[^>]*(?:class|id|alt)="[^"]*logo[^"]*"[^>]*src="([^"]*)"[^>]*>/i);
    if (logoImg?.[1]) return this.resolveUrl(logoImg[1], origin);

    // Try src first, then class/id
    const logoImgAlt = html.match(/<img[^>]*src="([^"]*)"[^>]*(?:class|id|alt)="[^"]*logo[^"]*"[^>]*>/i);
    if (logoImgAlt?.[1]) return this.resolveUrl(logoImgAlt[1], origin);

    return null;
  }

  /**
   * Extract favicon
   */
  private extractFavicon(html: string, origin: string): string | null {
    // Try apple-touch-icon first (higher res)
    const appleIcon = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*href="([^"]*)"[^>]*>/i);
    if (appleIcon?.[1]) return this.resolveUrl(appleIcon[1], origin);

    // Try icon
    const icon = html.match(/<link[^>]*rel="icon"[^>]*href="([^"]*)"[^>]*>/i);
    if (icon?.[1]) return this.resolveUrl(icon[1], origin);

    // Try shortcut icon
    const shortcutIcon = html.match(/<link[^>]*rel="shortcut icon"[^>]*href="([^"]*)"[^>]*>/i);
    if (shortcutIcon?.[1]) return this.resolveUrl(shortcutIcon[1], origin);

    // Default to /favicon.ico
    return `${origin}/favicon.ico`;
  }

  /**
   * Extract social media links
   */
  private extractSocialLinks(html: string): BrandMetadata['socialLinks'] {
    const links: BrandMetadata['socialLinks'] = {};

    // Twitter/X
    const twitter = html.match(/href="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i);
    if (twitter?.[1]) links.twitter = twitter[1];

    // LinkedIn
    const linkedin = html.match(/href="(https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^"]+)"/i);
    if (linkedin?.[1]) links.linkedin = linkedin[1];

    // Facebook
    const facebook = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i);
    if (facebook?.[1]) links.facebook = facebook[1];

    // Instagram
    const instagram = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i);
    if (instagram?.[1]) links.instagram = instagram[1];

    return links;
  }

  /**
   * Extract brand colors from CSS variables or common elements
   */
  private extractBrandColors(html: string): string[] {
    const colors: string[] = [];

    // Try to find theme-color meta tag
    const themeColor = html.match(/<meta[^>]*name="theme-color"[^>]*content="([^"]*)"[^>]*>/i);
    if (themeColor?.[1]) colors.push(themeColor[1]);

    // Look for CSS custom properties for brand colors
    const cssVars = html.match(/--(?:primary|brand|main|accent)(?:-color)?:\s*([^;]+);/gi);
    if (cssVars) {
      for (const match of cssVars) {
        const color = match.match(/:\s*([^;]+)/)?.[1]?.trim();
        if (color && !colors.includes(color)) {
          colors.push(color);
        }
      }
    }

    return colors.slice(0, 5); // Limit to 5 colors
  }

  /**
   * Extract keywords from meta tags
   */
  private extractKeywords(html: string): string[] {
    const metaKeywords = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"[^>]*>/i);
    if (metaKeywords?.[1]) {
      return metaKeywords[1]
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .slice(0, 10);
    }
    return [];
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(url: string, origin: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `${origin}${url}`;
    }
    return `${origin}/${url}`;
  }
}
