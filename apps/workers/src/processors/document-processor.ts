/**
 * Document Processor
 *
 * Handles PROCESS_DOCUMENT jobs by extracting text from PDF/DOCX/TXT files
 * and storing them as ContextItems for use in content generation.
 *
 * Implements:
 * - T043: Handle PDF/DOCX/TXT file processing
 * - Extract text content and create ContextItems
 * - Store in Context Engine for Brand Brain
 *
 * @module processors/document-processor
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import {
  JobType,
  type DocumentProcessingPayload,
  type DocumentProcessingResult,
} from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'DocumentProcessor';

/**
 * Maximum file size to process (10MB)
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum text content to extract (100K characters)
 */
const MAX_TEXT_LENGTH = 100_000;

/**
 * Processes a document file and extracts text content
 */
async function processDocument(
  job: Job<JobData<DocumentProcessingPayload>>
): Promise<DocumentProcessingResult> {
  const startTime = Date.now();
  const { contextSourceId, brandId, fileUrl, fileName, mimeType } = job.data.payload;

  logger.info(COMPONENT, `Starting document processing for ${fileName}`, {
    contextSourceId,
    brandId,
    mimeType,
  });

  try {
    await reportProgress(job, 10, 'Fetching document...');

    // Update ContextSource to SYNCING status
    await updateSourceStatus(contextSourceId, 'SYNCING');

    // Fetch the document
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }

    // Check file size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE_BYTES})`);
    }

    await reportProgress(job, 30, 'Extracting text content...');

    // Get the file content
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Extract text based on mime type
    let extractedText: string;

    switch (mimeType) {
      case 'text/plain':
      case 'text/markdown':
        extractedText = new TextDecoder().decode(uint8Array);
        break;
      case 'application/pdf':
        extractedText = await extractPdfText(uint8Array);
        break;
      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    // Truncate if too long
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_TEXT_LENGTH);
      logger.warn(COMPONENT, `Document truncated to ${MAX_TEXT_LENGTH} characters`, {
        fileName,
        originalLength: extractedText.length,
      });
    }

    // Clean up the text
    extractedText = cleanText(extractedText);

    if (extractedText.length < 50) {
      throw new Error('Extracted text too short (less than 50 characters)');
    }

    await reportProgress(job, 60, 'Creating context item...');

    // Create the context item
    const contextItem = await prisma.contextItem.create({
      data: {
        sourceId: contextSourceId,
        title: fileName.replace(/\.[^.]+$/, ''), // Remove extension
        content: extractedText,
        contentType: 'text',
        importance: 7, // Documents are generally important
        isEvergreen: true, // Documents are typically evergreen content
      },
    });

    await reportProgress(job, 90, 'Finalizing...');

    // Update source to ACTIVE
    await updateSourceStatus(contextSourceId, 'ACTIVE', {
      lastSync: new Date(),
      syncError: null,
    });

    const processingTimeMs = Date.now() - startTime;

    logger.info(COMPONENT, `Document processed successfully: ${fileName}`, {
      contextItemId: contextItem.id,
      extractedCharacters: extractedText.length,
      processingTimeMs,
    });

    return {
      contextItemId: contextItem.id,
      extractedText: extractedText.length,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update source to ERROR
    await updateSourceStatus(contextSourceId, 'ERROR', {
      syncError: errorMessage,
    });

    logger.error(COMPONENT, `Document processing failed: ${fileName}`, {
      contextSourceId,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Extracts text from a PDF file
 * Uses a simple text extraction approach for Node.js environment
 */
async function extractPdfText(data: Uint8Array): Promise<string> {
  // Simple PDF text extraction
  // For production, consider using pdf-parse or pdfjs-dist

  const text = new TextDecoder('utf-8', { fatal: false }).decode(data);

  // Try to extract text between stream markers
  const textParts: string[] = [];

  // Look for text between BT (begin text) and ET (end text) markers
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;

  while ((match = btEtRegex.exec(text)) !== null) {
    const content = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      textParts.push(tjMatch[1]);
    }
  }

  // If we found structured text, use it
  if (textParts.length > 0) {
    return textParts.join(' ');
  }

  // Fallback: extract any readable ASCII text
  const readableText = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Look for longer sequences of readable text
  const sentences = readableText.match(/[A-Za-z][A-Za-z\s,.\-:;'"!?()]{20,}/g) || [];

  if (sentences.length > 0) {
    return sentences.join(' ');
  }

  // If no readable text found, return empty with warning
  logger.warn(COMPONENT, 'Could not extract readable text from PDF');
  return '';
}

/**
 * Cleans extracted text content
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Trim
    .trim();
}

/**
 * Updates ContextSource status
 */
async function updateSourceStatus(
  contextSourceId: string,
  status: 'PENDING' | 'ACTIVE' | 'SYNCING' | 'ERROR' | 'PAUSED',
  additionalData?: {
    lastSync?: Date;
    syncError?: string | null;
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
// Export Processor
// =============================================================================

/**
 * Document processor for PROCESS_DOCUMENT jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const documentProcessor = createProcessor<
  DocumentProcessingPayload,
  DocumentProcessingResult
>(JobType.PROCESS_DOCUMENT, processDocument);
