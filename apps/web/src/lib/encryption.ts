/**
 * Token Encryption Utility - PKG-022
 * AES-256-GCM encryption for OAuth tokens
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  // Key should be 32 bytes (256 bits) for AES-256
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns base64-encoded string: IV + encrypted data + auth tag
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString('base64');
}

/**
 * Decrypt a token that was encrypted with encryptToken
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedToken, 'base64');

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a new encryption key (for setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt token - returns original if encryption not configured
 * Use during development when encryption key may not be set
 */
export function safeEncryptToken(token: string): string {
  if (!isEncryptionConfigured()) {
    console.warn('Token encryption not configured - storing token unencrypted');
    return token;
  }
  return encryptToken(token);
}

/**
 * Safely decrypt token - handles both encrypted and unencrypted tokens
 */
export function safeDecryptToken(token: string): string {
  if (!isEncryptionConfigured()) {
    return token;
  }

  // Check if token looks like base64 encoded encrypted data
  // Encrypted tokens will be longer due to IV + auth tag
  try {
    const decoded = Buffer.from(token, 'base64');
    if (decoded.length > IV_LENGTH + AUTH_TAG_LENGTH) {
      return decryptToken(token);
    }
  } catch {
    // Not base64, return as-is
  }

  return token;
}
