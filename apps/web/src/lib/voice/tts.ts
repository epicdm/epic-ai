import OpenAI from "openai";

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

export type VoiceId = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TTSOptions {
  voice?: VoiceId;
  model?: "tts-1" | "tts-1-hd";
  speed?: number; // 0.25 to 4.0
  responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

/**
 * Available voice options with descriptions
 */
export const VOICE_OPTIONS: Record<VoiceId, { name: string; description: string }> = {
  alloy: { name: "Alloy", description: "Neutral and balanced" },
  echo: { name: "Echo", description: "Warm and conversational" },
  fable: { name: "Fable", description: "British accent, storyteller" },
  onyx: { name: "Onyx", description: "Deep and authoritative" },
  nova: { name: "Nova", description: "Friendly and upbeat" },
  shimmer: { name: "Shimmer", description: "Soft and gentle" },
};

/**
 * Convert text to speech using OpenAI TTS
 * Returns audio as Buffer
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const {
    voice = "nova",
    model = "tts-1",
    speed = 1.0,
    responseFormat = "mp3",
  } = options;

  const response = await getOpenAI().audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: responseFormat,
  });

  // Get the audio data as ArrayBuffer and convert to Buffer
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert text to speech and return as base64-encoded string
 */
export async function textToSpeechBase64(
  text: string,
  options: TTSOptions = {}
): Promise<{ audio: string; format: string }> {
  const format = options.responseFormat || "mp3";
  const audioBuffer = await textToSpeech(text, options);

  return {
    audio: audioBuffer.toString("base64"),
    format,
  };
}

/**
 * Get the content type for a given audio format
 */
export function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
    wav: "audio/wav",
    pcm: "audio/pcm",
  };
  return contentTypes[format] || "audio/mpeg";
}

/**
 * Stream text to speech (for real-time applications)
 */
export async function* streamTextToSpeech(
  text: string,
  options: TTSOptions = {}
): AsyncGenerator<Buffer> {
  const {
    voice = "nova",
    model = "tts-1",
    speed = 1.0,
    responseFormat = "mp3",
  } = options;

  const response = await getOpenAI().audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: responseFormat,
  });

  // Stream the response in chunks
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield Buffer.from(value);
  }
}

/**
 * Validate voice ID
 */
export function isValidVoiceId(voiceId: string): voiceId is VoiceId {
  return voiceId in VOICE_OPTIONS;
}

/**
 * Get default TTS options for a persona tone
 */
export function getTTSOptionsForTone(tone: string): TTSOptions {
  const toneMapping: Record<string, TTSOptions> = {
    friendly: { voice: "nova", speed: 1.0 },
    professional: { voice: "onyx", speed: 0.95 },
    energetic: { voice: "alloy", speed: 1.1 },
    calm: { voice: "shimmer", speed: 0.9 },
    storytelling: { voice: "fable", speed: 0.95 },
    warm: { voice: "echo", speed: 1.0 },
  };

  return toneMapping[tone.toLowerCase()] || { voice: "nova", speed: 1.0 };
}
