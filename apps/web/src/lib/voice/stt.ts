import OpenAI from "openai";
import { Readable } from "stream";

// Lazy initialization to prevent build errors when env vars are not set
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export interface STTOptions {
  model?: "whisper-1";
  language?: string; // ISO 639-1 code (e.g., "en", "es", "fr")
  prompt?: string; // Optional context to improve accuracy
  temperature?: number; // 0 to 1
  responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

/**
 * Transcribe audio using OpenAI Whisper
 * @param audioBuffer - Audio data as Buffer
 * @param filename - Original filename (used to determine format)
 * @param options - Transcription options
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = "audio.webm",
  options: STTOptions = {}
): Promise<TranscriptionResult> {
  const { model = "whisper-1", language, prompt, temperature, responseFormat = "verbose_json" } = options;

  // Create a File-like object from the buffer - convert Buffer to Uint8Array for compatibility
  const file = new File([new Uint8Array(audioBuffer)], filename, {
    type: getMimeType(filename),
  });

  const transcription = await getOpenAI().audio.transcriptions.create({
    file,
    model,
    language,
    prompt,
    temperature,
    response_format: responseFormat,
  });

  // Handle different response formats
  if (responseFormat === "text") {
    return {
      text: transcription as unknown as string,
    };
  }

  if (responseFormat === "verbose_json") {
    const verbose = transcription as unknown as {
      text: string;
      language: string;
      duration: number;
      segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        avg_logprob?: number;
      }>;
    };

    return {
      text: verbose.text,
      language: verbose.language,
      duration: verbose.duration,
      segments: verbose.segments?.map((seg) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined,
      })),
    };
  }

  return {
    text: (transcription as { text: string }).text,
  };
}

/**
 * Transcribe audio from a stream
 */
export async function transcribeStream(
  stream: Readable,
  filename: string = "audio.webm",
  options: STTOptions = {}
): Promise<TranscriptionResult> {
  // Collect stream into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const audioBuffer = Buffer.concat(chunks);

  return transcribeAudio(audioBuffer, filename, options);
}

/**
 * Transcribe audio from base64-encoded string
 */
export async function transcribeBase64(
  base64Audio: string,
  filename: string = "audio.webm",
  options: STTOptions = {}
): Promise<TranscriptionResult> {
  const audioBuffer = Buffer.from(base64Audio, "base64");
  return transcribeAudio(audioBuffer, filename, options);
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
    m4a: "audio/m4a",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return mimeTypes[ext || ""] || "audio/webm";
}

/**
 * Supported audio formats for Whisper
 */
export const SUPPORTED_FORMATS = [
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg",
  "wav",
  "webm",
];

/**
 * Check if a file format is supported
 */
export function isSupportedFormat(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_FORMATS.includes(ext) : false;
}

/**
 * Language codes supported by Whisper
 */
export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  // ... many more supported
};

/**
 * Estimate transcription cost based on audio duration
 * Whisper API charges $0.006 per minute
 */
export function estimateCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  return minutes * 0.006;
}
