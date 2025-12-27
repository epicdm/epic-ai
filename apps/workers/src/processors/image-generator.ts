/**
 * Image Generator Processor
 *
 * Handles GENERATE_IMAGE jobs by generating images via DALL-E 3 API
 * and storing them in cloud storage.
 *
 * Implements:
 * - T045: Generate images via DALL-E 3 API
 * - Store in Cloudflare R2 / S3-compatible storage
 * - Return image URLs for content
 *
 * @module processors/image-generator
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import OpenAI from 'openai';
import { createProcessor, reportProgress, type JobData } from './base';
import {
  JobType,
  type ImageGenerationPayload,
  type ImageGenerationResult,
} from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'ImageGenerator';

/**
 * OpenAI client instance
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * DALL-E 3 size options based on aspect ratio
 */
const ASPECT_RATIO_SIZES: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
  '1:1': '1024x1024',
  '16:9': '1792x1024',
  '9:16': '1024x1792',
  '4:3': '1024x1024', // DALL-E 3 doesn't support 4:3, use square
};

/**
 * Style modifiers for different image styles
 */
const STYLE_MODIFIERS: Record<string, string> = {
  realistic: 'photorealistic, high detail, professional photography',
  artistic: 'artistic, creative, expressive, vibrant colors',
  minimal: 'minimalist, clean, simple, modern design',
  branded: 'professional, corporate, clean, business-appropriate',
};

/**
 * Generates an image using DALL-E 3
 */
async function generateImage(
  job: Job<JobData<ImageGenerationPayload>>
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const { brandId, prompt, style, aspectRatio, contentItemId } = job.data.payload;

  logger.info(COMPONENT, 'Starting image generation', {
    brandId,
    style,
    aspectRatio,
    promptLength: prompt.length,
  });

  try {
    await reportProgress(job, 10, 'Preparing prompt...');

    // Get brand context for better prompts
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        industry: true,
        brandBrain: {
          select: {
            voiceTone: true,
          },
        },
      },
    });

    // Enhance prompt with style and brand context
    const enhancedPrompt = buildEnhancedPrompt(prompt, style, brand);

    await reportProgress(job, 30, 'Generating image with DALL-E 3...');

    // Determine image size based on aspect ratio
    const size = ASPECT_RATIO_SIZES[aspectRatio || '1:1'] || '1024x1024';

    // Generate the image
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size,
      quality: 'standard',
      response_format: 'url',
    });

    if (!response.data?.[0]?.url) {
      throw new Error('No image URL returned from DALL-E');
    }

    const tempImageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;

    await reportProgress(job, 60, 'Downloading and storing image...');

    // Download the image from OpenAI (temporary URL)
    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);

    await reportProgress(job, 80, 'Uploading to storage...');

    // Store the image
    const { imageUrl, thumbnailUrl } = await storeImage(
      imageData,
      brandId,
      contentItemId
    );

    await reportProgress(job, 90, 'Updating records...');

    // If linked to a content item, update its media URLs
    if (contentItemId) {
      await updateContentItemMedia(contentItemId, imageUrl, thumbnailUrl);
    }

    // Log the revised prompt for debugging
    if (revisedPrompt && revisedPrompt !== enhancedPrompt) {
      logger.debug(COMPONENT, 'DALL-E revised prompt', {
        original: enhancedPrompt.slice(0, 100),
        revised: revisedPrompt.slice(0, 100),
      });
    }

    await reportProgress(job, 100, 'Image generation complete');

    const generationTimeMs = Date.now() - startTime;

    logger.info(COMPONENT, 'Image generated successfully', {
      brandId,
      imageUrl,
      size,
      generationTimeMs,
    });

    return {
      imageUrl,
      thumbnailUrl,
      generationTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      logger.error(COMPONENT, 'OpenAI API error', {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      // Rate limiting
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }

      // Content policy violation
      if (error.code === 'content_policy_violation') {
        throw new Error('Image prompt violates content policy. Please revise the prompt.');
      }
    }

    logger.error(COMPONENT, 'Image generation failed', {
      brandId,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Builds an enhanced prompt with style and brand context
 */
function buildEnhancedPrompt(
  basePrompt: string,
  style?: string,
  brand?: {
    name: string;
    industry: string | null;
    brandBrain?: {
      voiceTone: string;
    } | null;
  } | null
): string {
  const parts: string[] = [basePrompt];

  // Add style modifier
  if (style && STYLE_MODIFIERS[style]) {
    parts.push(STYLE_MODIFIERS[style]);
  }

  // Add industry context if available
  if (brand?.industry) {
    parts.push(`for ${brand.industry} industry`);
  }

  // Add quality and safety hints
  parts.push('high quality, professional, suitable for social media');

  return parts.join(', ');
}

/**
 * Stores image in cloud storage
 * Uses Cloudflare R2 or S3-compatible storage via fetch API
 *
 * Note: For production, consider using @aws-sdk/client-s3
 * For now, we use a simple fetch-based upload or base64 fallback
 */
async function storeImage(
  imageData: Buffer,
  brandId: string,
  contentItemId?: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const timestamp = Date.now();
  const filename = contentItemId
    ? `${brandId}/${contentItemId}-${timestamp}.png`
    : `${brandId}/generated-${timestamp}.png`;

  // Check for R2/S3 configuration with presigned URL endpoint
  const uploadEndpoint = process.env.R2_UPLOAD_ENDPOINT || process.env.S3_UPLOAD_ENDPOINT;
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL;

  if (uploadEndpoint && publicUrl) {
    try {
      // Use presigned URL endpoint for upload
      const response = await fetch(`${uploadEndpoint}?key=${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
        },
        body: imageData,
      });

      if (response.ok) {
        const imageUrl = `${publicUrl}/${filename}`;
        return {
          imageUrl,
          thumbnailUrl: imageUrl,
        };
      }

      logger.warn(COMPONENT, 'Upload failed, using fallback', {
        status: response.status,
      });
    } catch (err) {
      logger.warn(COMPONENT, 'Failed to upload to storage, using fallback', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Fallback: Store as base64 data URL (not ideal for production)
  logger.warn(COMPONENT, 'No cloud storage configured, using base64 fallback');

  const base64 = imageData.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  // In production, you'd want proper cloud storage
  return {
    imageUrl: dataUrl,
    thumbnailUrl: dataUrl,
  };
}

/**
 * Updates a content item with generated media URLs
 */
async function updateContentItemMedia(
  contentItemId: string,
  imageUrl: string,
  _thumbnailUrl: string // Not currently used, but kept for API compatibility
): Promise<void> {
  try {
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: { mediaUrls: true },
    });

    const existingUrls = contentItem?.mediaUrls || [];

    await prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        mediaUrls: [...existingUrls, imageUrl],
        mediaType: 'image',
      },
    });

    logger.debug(COMPONENT, 'Updated content item with media URLs', {
      contentItemId,
      imageUrl: imageUrl.slice(0, 50) + '...',
    });
  } catch (err) {
    logger.error(COMPONENT, 'Failed to update content item media', {
      contentItemId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * Image generator processor for GENERATE_IMAGE jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const imageGeneratorProcessor = createProcessor<
  ImageGenerationPayload,
  ImageGenerationResult
>(JobType.GENERATE_IMAGE, generateImage);
