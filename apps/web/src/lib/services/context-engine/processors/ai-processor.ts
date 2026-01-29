/**
 * AI Processor - Uses OpenAI to analyze and enrich scraped content
 *
 * - Generates summaries
 * - Extracts keywords and topics
 * - Determines content importance
 * - Classifies content type
 */

import OpenAI from 'openai';
import type { ScrapedContent, ProcessedContext } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisResult {
  summary: string;
  keywords: string[];
  topics: string[];
  importance: number;
  isEvergreen: boolean;
  contentType: string;
  expiresInDays?: number;
}

export class AIProcessor {
  /**
   * Process a single piece of scraped content
   */
  async process(content: ScrapedContent): Promise<ProcessedContext> {
    const analysis = await this.analyzeContent(content);

    return {
      title: content.title,
      content: content.content,
      summary: analysis.summary,
      url: content.url,
      contentType: analysis.contentType,
      importance: analysis.importance,
      isEvergreen: analysis.isEvergreen,
      keywords: analysis.keywords,
      topics: analysis.topics,
      publishedAt: content.publishedAt,
      expiresAt: analysis.expiresInDays
        ? new Date(Date.now() + analysis.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    };
  }

  /**
   * Process multiple pieces of content in batch
   */
  async processBatch(contents: ScrapedContent[]): Promise<ProcessedContext[]> {
    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: ProcessedContext[] = [];

    for (let i = 0; i < contents.length; i += concurrencyLimit) {
      const batch = contents.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map((c) => this.process(c)));
      results.push(...batchResults);
    }

    return results;
  }

  private async analyzeContent(content: ScrapedContent): Promise<AnalysisResult> {
    const prompt = `Analyze this content for a social media marketing AI system.

Content Title: ${content.title || 'Untitled'}
Content Type Hint: ${content.contentType}
Content:
${content.content.slice(0, 3000)}

Respond with JSON only:
{
  "summary": "2-3 sentence summary of the key information",
  "keywords": ["keyword1", "keyword2", ...], // 5-10 relevant keywords
  "topics": ["topic1", "topic2", ...], // 3-5 main topics/themes
  "importance": 1-10, // How important is this for social media content? 10 = very important
  "isEvergreen": true/false, // Is this content timeless or time-sensitive?
  "contentType": "product|service|news|testimonial|about|faq|educational|promotional",
  "expiresInDays": null or number // If time-sensitive, when does it expire?
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a content analysis AI. Always respond with valid JSON only, no markdown.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content || '{}';

      // Parse JSON, handling potential markdown code blocks
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonText) as AnalysisResult;

      return {
        summary: result.summary || content.content.slice(0, 200),
        keywords: result.keywords || [],
        topics: result.topics || [],
        importance: Math.min(10, Math.max(1, result.importance || 5)),
        isEvergreen: result.isEvergreen ?? false,
        contentType: result.contentType || content.contentType,
        expiresInDays: result.expiresInDays,
      };
    } catch (error) {
      console.error('AI analysis failed:', error);

      // Return default analysis on failure
      return {
        summary: content.content.slice(0, 200),
        keywords: [],
        topics: [],
        importance: 5,
        isEvergreen: false,
        contentType: content.contentType,
      };
    }
  }
}
