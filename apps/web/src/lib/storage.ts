/**
 * Storage Utility - DigitalOcean Spaces (S3-compatible)
 *
 * Handles persistent storage for media files (images, etc.)
 * Uses DigitalOcean Spaces which is S3-compatible.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const DO_SPACES_KEY = process.env.DO_SPACES_KEY;
const DO_SPACES_SECRET = process.env.DO_SPACES_SECRET;
const DO_SPACES_BUCKET = process.env.DO_SPACES_BUCKET || 'openclaw-media';
const DO_SPACES_REGION = process.env.DO_SPACES_REGION || 'nyc3';
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || `https://${DO_SPACES_REGION}.digitaloceanspaces.com`;
const DO_SPACES_CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || `https://${DO_SPACES_BUCKET}.${DO_SPACES_REGION}.cdn.digitaloceanspaces.com`;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!DO_SPACES_KEY || !DO_SPACES_SECRET) {
    console.warn('[Storage] DigitalOcean Spaces not configured - missing DO_SPACES_KEY or DO_SPACES_SECRET');
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: DO_SPACES_ENDPOINT,
      region: DO_SPACES_REGION,
      credentials: {
        accessKeyId: DO_SPACES_KEY,
        secretAccessKey: DO_SPACES_SECRET,
      },
      forcePathStyle: false,
    });
  }

  return s3Client;
}

/**
 * Upload a file to DigitalOcean Spaces
 *
 * @param buffer - File data as Buffer
 * @param filename - Target filename (including path)
 * @param contentType - MIME type
 * @returns CDN URL of uploaded file, or null if storage not configured
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  const client = getS3Client();
  if (!client) {
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: DO_SPACES_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await client.send(command);

    const cdnUrl = `${DO_SPACES_CDN_ENDPOINT}/${filename}`;
    console.log('[Storage] File uploaded successfully:', cdnUrl);
    return cdnUrl;
  } catch (error) {
    console.error('[Storage] Failed to upload file:', error);
    throw error;
  }
}

/**
 * Download a file from a URL and upload it to storage
 *
 * @param sourceUrl - URL to download from
 * @param targetPath - Target path in storage (e.g., 'generated-images/brand-123/image.png')
 * @returns CDN URL of uploaded file, or original URL if storage not configured
 */
export async function persistImageFromUrl(
  sourceUrl: string,
  targetPath: string
): Promise<string> {
  // Check if storage is configured
  const client = getS3Client();
  if (!client) {
    console.warn('[Storage] Storage not configured, returning original URL');
    return sourceUrl;
  }

  try {
    // Download the image
    console.log('[Storage] Downloading image from:', sourceUrl.substring(0, 80) + '...');
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Storage] Downloaded image, size:', buffer.length, 'bytes');

    // Upload to storage
    const cdnUrl = await uploadFile(buffer, targetPath, contentType);

    if (!cdnUrl) {
      console.warn('[Storage] Upload returned null, returning original URL');
      return sourceUrl;
    }

    console.log('[Storage] Image persisted to:', cdnUrl);
    return cdnUrl;
  } catch (error) {
    console.error('[Storage] Failed to persist image:', error);
    // Return original URL as fallback
    return sourceUrl;
  }
}

/**
 * Generate a unique filename for a generated image
 */
export function generateImagePath(brandId: string, prefix: string = 'generated'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `generated-images/${brandId}/${prefix}-${timestamp}-${random}.png`;
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(DO_SPACES_KEY && DO_SPACES_SECRET);
}
