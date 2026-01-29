/**
 * Video Generator - AI-powered video creation using Pika via fal.ai
 *
 * Pika 2.2 offers high-quality text-to-video and image-to-video generation.
 * Pricing: $0.20/5s (720p), $0.45/5s (1080p)
 */

import { fal } from '@fal-ai/client';
import { persistImageFromUrl, generateImagePath, isStorageConfigured } from '@/lib/storage';

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
});

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '3:2' | '2:3';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = 5 | 10;

export interface VideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  resolution?: VideoResolution;
  duration?: VideoDuration;
  seed?: number;
  /** For image-to-video: URL of the source image */
  sourceImageUrl?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  contentType: string;
  fileName: string;
  fileSize: number;
  duration: number;
  resolution: VideoResolution;
  cost: number;
}

interface PikaTextToVideoResponse {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

interface PikaImageToVideoResponse {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

/**
 * Calculate estimated cost for video generation
 */
function calculateCost(resolution: VideoResolution, duration: VideoDuration): number {
  const baseCost = resolution === '1080p' ? 0.45 : 0.20;
  return baseCost * (duration / 5);
}

/**
 * Generate video from text prompt using Pika 2.2
 */
export async function generateVideoFromText(
  request: VideoGenerationRequest,
  onProgress?: (status: string, position?: number) => void
): Promise<VideoGenerationResult> {
  const {
    prompt,
    negativePrompt = 'ugly, bad, terrible, blurry, low quality',
    aspectRatio = '16:9',
    resolution = '720p',
    duration = 5,
    seed,
  } = request;

  console.log('[VideoGenerator] Generating video from text:', {
    prompt: prompt.substring(0, 50) + '...',
    aspectRatio,
    resolution,
    duration,
  });

  const result = await fal.subscribe('fal-ai/pika/v2.2/text-to-video', {
    input: {
      prompt,
      negative_prompt: negativePrompt,
      aspect_ratio: aspectRatio,
      resolution,
      duration: String(duration) as '5' | '10',
      ...(seed && { seed }),
    },
    onQueueUpdate: (update) => {
      if (onProgress) {
        if (update.status === 'IN_QUEUE') {
          const queueUpdate = update as { position?: number };
          onProgress('queued', queueUpdate.position);
        } else if (update.status === 'IN_PROGRESS') {
          onProgress('generating');
        }
      }
    },
    logs: true,
  });

  console.log('[VideoGenerator] Video generated successfully');

  const data = result.data as PikaTextToVideoResponse;
  return {
    videoUrl: data.video.url,
    contentType: data.video.content_type,
    fileName: data.video.file_name,
    fileSize: data.video.file_size,
    duration,
    resolution,
    cost: calculateCost(resolution, duration),
  };
}

/**
 * Generate video from image using Pika 2.2 image-to-video
 */
export async function generateVideoFromImage(
  request: VideoGenerationRequest,
  onProgress?: (status: string, position?: number) => void
): Promise<VideoGenerationResult> {
  const {
    sourceImageUrl,
    prompt,
    negativePrompt = 'ugly, bad, terrible, blurry, low quality',
    aspectRatio = '16:9',
    resolution = '720p',
    duration = 5,
    seed,
  } = request;

  if (!sourceImageUrl) {
    throw new Error('sourceImageUrl is required for image-to-video generation');
  }

  console.log('[VideoGenerator] Generating video from image:', {
    sourceImage: sourceImageUrl.substring(0, 50) + '...',
    prompt: prompt?.substring(0, 50) + '...',
    aspectRatio,
    resolution,
    duration,
  });

  // Note: image-to-video inherits aspect ratio from the source image
  const result = await fal.subscribe('fal-ai/pika/v2.2/image-to-video', {
    input: {
      image_url: sourceImageUrl,
      prompt,
      negative_prompt: negativePrompt,
      resolution,
      duration: String(duration) as '5' | '10',
      ...(seed && { seed }),
    },
    onQueueUpdate: (update) => {
      if (onProgress) {
        if (update.status === 'IN_QUEUE') {
          const queueUpdate = update as { position?: number };
          onProgress('queued', queueUpdate.position);
        } else if (update.status === 'IN_PROGRESS') {
          onProgress('generating');
        }
      }
    },
    logs: true,
  });

  console.log('[VideoGenerator] Video from image generated successfully');

  const data = result.data as PikaImageToVideoResponse;
  return {
    videoUrl: data.video.url,
    contentType: data.video.content_type,
    fileName: data.video.file_name,
    fileSize: data.video.file_size,
    duration,
    resolution,
    cost: calculateCost(resolution, duration),
  };
}

/**
 * Persist video to permanent storage (DigitalOcean Spaces)
 */
export async function persistVideo(
  videoUrl: string,
  brandId: string
): Promise<string> {
  if (!isStorageConfigured()) {
    console.warn('[VideoGenerator] Storage not configured, returning original URL');
    return videoUrl;
  }

  const targetPath = generateImagePath(brandId, 'video').replace('.png', '.mp4');
  console.log('[VideoGenerator] Persisting video to storage:', targetPath);

  const permanentUrl = await persistImageFromUrl(videoUrl, targetPath);
  console.log('[VideoGenerator] Video persisted successfully');

  return permanentUrl;
}

/**
 * VideoGenerator class for content factory integration
 */
export class VideoGenerator {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Generate a video ad from a text prompt
   */
  async generateVideoAd(
    prompt: string,
    options: {
      aspectRatio?: AspectRatio;
      resolution?: VideoResolution;
      duration?: VideoDuration;
      persistToStorage?: boolean;
    } = {}
  ): Promise<VideoGenerationResult> {
    const {
      aspectRatio = '16:9',
      resolution = '720p',
      duration = 5,
      persistToStorage = true,
    } = options;

    const result = await generateVideoFromText({
      prompt,
      aspectRatio,
      resolution,
      duration,
    });

    // Persist to permanent storage if configured
    if (persistToStorage) {
      result.videoUrl = await persistVideo(result.videoUrl, this.brandId);
    }

    return result;
  }

  /**
   * Generate a video from an existing image (e.g., DALL-E generated)
   */
  async animateImage(
    imageUrl: string,
    prompt: string,
    options: {
      aspectRatio?: AspectRatio;
      resolution?: VideoResolution;
      duration?: VideoDuration;
      persistToStorage?: boolean;
    } = {}
  ): Promise<VideoGenerationResult> {
    const {
      aspectRatio = '16:9',
      resolution = '720p',
      duration = 5,
      persistToStorage = true,
    } = options;

    const result = await generateVideoFromImage({
      sourceImageUrl: imageUrl,
      prompt,
      aspectRatio,
      resolution,
      duration,
    });

    // Persist to permanent storage if configured
    if (persistToStorage) {
      result.videoUrl = await persistVideo(result.videoUrl, this.brandId);
    }

    return result;
  }

  /**
   * Generate a video prompt from content using AI
   */
  async generateVideoPrompt(content: string, style: string = 'modern'): Promise<string> {
    // Use OpenAI to generate an optimized video prompt
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating prompts for AI video generation.
Style preference: ${style}
Create prompts that describe dynamic, visually engaging scenes.
Focus on motion, camera movements, lighting, and atmosphere.
Keep prompts under 200 characters for best results.`,
        },
        {
          role: 'user',
          content: `Create a video generation prompt for this social media ad content:

"${content}"

Return only the prompt, no explanation.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Check if video generation is configured
 */
export function isVideoGenerationConfigured(): boolean {
  return !!process.env.FAL_KEY;
}
