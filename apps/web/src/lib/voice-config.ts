/**
 * Voice Service Configuration
 *
 * Centralized configuration for the voice service connection.
 * Automatically detects the environment and uses the appropriate URL.
 */

// Voice service URL for Magnus Billing integration
// In production (Vercel), default to DigitalOcean App Platform voice service
// In development, default to local Flask server
export const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  (process.env.VERCEL
    ? "https://openclaw-platform-zcjiu.ondigitalocean.app/voice"
    : "http://localhost:5000");

// Timeout for voice service requests (30 seconds)
export const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * Create an AbortController with timeout for voice service requests
 */
export function createTimeoutController(timeoutMs: number = VOICE_SERVICE_TIMEOUT_MS): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}
