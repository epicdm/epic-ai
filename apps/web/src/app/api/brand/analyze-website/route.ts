/**
 * Website Analysis API for Brand Setup Wizard
 *
 * Analyzes a website and extracts brand metadata including:
 * - Company name
 * - Description
 * - Logo (og:image)
 * - Favicon
 * - Social links
 * - Suggested template based on content
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { WebsiteScraper, type BrandMetadata } from "@/lib/services/context-engine/scrapers/website";
import { brandTemplates } from "@/lib/brand-brain/templates";

interface AnalyzeWebsiteRequest {
  url: string;
}

interface AnalyzeWebsiteResponse {
  success: boolean;
  data?: {
    companyName: string | null;
    description: string | null;
    logo: string | null;
    favicon: string | null;
    socialLinks: BrandMetadata["socialLinks"];
    colors: string[];
    keywords: string[];
    suggestedTemplate: string | null;
    suggestedTemplateReason: string | null;
  };
  error?: string;
}

// Keywords that map to specific templates
const templateKeywordMap: Record<string, string[]> = {
  "tech-startup": [
    "software", "saas", "app", "platform", "tech", "technology", "startup",
    "api", "cloud", "ai", "machine learning", "automation", "digital"
  ],
  "ecommerce": [
    "shop", "store", "buy", "cart", "ecommerce", "e-commerce", "retail",
    "products", "sale", "discount", "shipping", "online store"
  ],
  "professional-services": [
    "consulting", "legal", "law", "attorney", "accounting", "cpa", "advisory",
    "b2b", "enterprise", "corporate", "professional"
  ],
  "healthcare": [
    "health", "medical", "doctor", "clinic", "hospital", "wellness", "care",
    "patient", "healthcare", "therapy", "treatment", "medicine"
  ],
  "real-estate": [
    "real estate", "property", "homes", "houses", "realty", "broker", "agent",
    "listings", "mortgage", "apartment", "rental"
  ],
  "restaurant": [
    "restaurant", "food", "menu", "dining", "cafe", "coffee", "bar", "cuisine",
    "chef", "reservation", "delivery", "takeout"
  ],
  "creative-agency": [
    "agency", "creative", "design", "marketing", "branding", "advertising",
    "media", "digital marketing", "brand", "studio"
  ],
  "fitness": [
    "fitness", "gym", "workout", "training", "sports", "exercise", "yoga",
    "personal trainer", "health club", "athletic"
  ],
  "education": [
    "education", "learning", "course", "training", "school", "university",
    "tutorial", "class", "teach", "student", "certification"
  ],
};

/**
 * Suggest a template based on website content
 */
function suggestTemplate(metadata: BrandMetadata): { id: string | null; reason: string | null } {
  const contentToAnalyze = [
    metadata.companyName || "",
    metadata.description || "",
    ...metadata.keywords,
  ].join(" ").toLowerCase();

  let bestMatch: { id: string; score: number; reason: string } | null = null;

  for (const [templateId, keywords] of Object.entries(templateKeywordMap)) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (contentToAnalyze.includes(keyword)) {
        score++;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      const template = brandTemplates.find((t) => t.id === templateId);
      bestMatch = {
        id: templateId,
        score,
        reason: `Matches ${template?.name || templateId} keywords: ${matchedKeywords.slice(0, 3).join(", ")}`,
      };
    }
  }

  return {
    id: bestMatch?.id || null,
    reason: bestMatch?.reason || null,
  };
}

/**
 * Normalize URL to include protocol
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  // Validate URL
  try {
    new URL(normalized);
    return normalized;
  } catch {
    throw new Error("Invalid URL format");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeWebsiteResponse>> {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as AnalyzeWebsiteRequest;

    if (!body.url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Normalize and validate URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(body.url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Create scraper and extract metadata
    const scraper = new WebsiteScraper({ url: normalizedUrl });
    const metadata = await scraper.extractBrandMetadata();

    // Suggest a template
    const { id: suggestedTemplate, reason: suggestedTemplateReason } = suggestTemplate(metadata);

    return NextResponse.json({
      success: true,
      data: {
        companyName: metadata.companyName,
        description: metadata.description,
        logo: metadata.logo,
        favicon: metadata.favicon,
        socialLinks: metadata.socialLinks,
        colors: metadata.colors,
        keywords: metadata.keywords,
        suggestedTemplate,
        suggestedTemplateReason,
      },
    });
  } catch (error) {
    console.error("Error analyzing website:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze website"
      },
      { status: 500 }
    );
  }
}
