/**
 * Document Processor - Extracts content from uploaded documents
 *
 * Supports: PDF, TXT, Markdown, DOCX (basic)
 */

import type { ScrapedContent, ScrapeResult, DocumentConfig } from '../types';

export class DocumentProcessor {
  private config: DocumentConfig;

  constructor(config: DocumentConfig) {
    this.config = config;
  }

  async process(): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.config.fileUrl);
      if (!response.ok) {
        return {
          success: false,
          items: [],
          error: `Failed to fetch document: ${response.status}`,
        };
      }

      let content: string;

      switch (this.config.mimeType) {
        case 'text/plain':
        case 'text/markdown':
          content = await response.text();
          break;

        case 'application/pdf':
          content = await this.extractPdfText(response);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.extractDocxText(response);
          break;

        default:
          return {
            success: false,
            items: [],
            error: `Unsupported file type: ${this.config.mimeType}`,
          };
      }

      if (!content || content.length < 50) {
        return {
          success: false,
          items: [],
          error: 'No content extracted from document',
        };
      }

      // Split into chunks if document is long
      const chunks = this.splitIntoChunks(content);

      const items: ScrapedContent[] = chunks.map((chunk, index) => ({
        title: chunks.length > 1 ? `${this.config.fileName} (Part ${index + 1})` : this.config.fileName,
        content: chunk,
        contentType: 'text' as const,
        metadata: {
          fileName: this.config.fileName,
          mimeType: this.config.mimeType,
          partIndex: index,
          totalParts: chunks.length,
        },
      }));

      return {
        success: true,
        items,
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

  private async extractPdfText(response: Response): Promise<string> {
    // For PDF extraction, we'll use a simple text extraction approach
    // In production, use pdf-parse or similar library
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Convert to string and extract text between stream markers
    // This is a very basic approach - production should use pdf-parse
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    // Try to extract text content (very basic)
    const textContent: string[] = [];

    // Look for text objects in PDF
    const textRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = textRegex.exec(text)) !== null) {
      const extracted = match[1];
      // Filter out obvious non-text
      if (extracted.length > 2 && /[a-zA-Z]/.test(extracted)) {
        textContent.push(extracted);
      }
    }

    // Also look for text between BT and ET markers
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      const tjRegex = /\[([^\]]+)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const parts = tjMatch[1].match(/\(([^)]+)\)/g);
        if (parts) {
          textContent.push(parts.map((p) => p.slice(1, -1)).join(''));
        }
      }
    }

    const result = textContent.join(' ').replace(/\s+/g, ' ').trim();

    // If we couldn't extract much, return a message
    if (result.length < 100) {
      return `[PDF document: ${this.config.fileName}] - Text extraction limited. Consider using OCR for image-based PDFs.`;
    }

    return result;
  }

  private async extractDocxText(response: Response): Promise<string> {
    // DOCX files are ZIP archives containing XML
    // For basic extraction, we'll look for the document.xml content
    // In production, use mammoth or docx library

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    // Extract text from w:t tags (Word text elements)
    const textContent: string[] = [];
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;

    while ((match = textRegex.exec(text)) !== null) {
      if (match[1]) {
        textContent.push(match[1]);
      }
    }

    return textContent.join(' ').replace(/\s+/g, ' ').trim();
  }

  private splitIntoChunks(content: string, maxChunkSize: number = 4000): string[] {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
