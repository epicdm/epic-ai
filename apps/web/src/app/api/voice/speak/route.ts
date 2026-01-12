/**
 * Voice TTS (Text-to-Speech) API
 */

import { getAuthWithBypass } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { textToSpeechBase64, VOICE_OPTIONS, isValidVoiceId, getContentType } from "@/lib/voice/tts";

/**
 * POST /api/voice/speak
 * Convert text to speech using OpenAI TTS
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice = "nova", speed = 1.0, returnBase64 = false } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { error: "Text too long. Maximum 4096 characters." },
        { status: 400 }
      );
    }

    if (!isValidVoiceId(voice)) {
      return NextResponse.json(
        { error: `Invalid voice. Valid options: ${Object.keys(VOICE_OPTIONS).join(", ")}` },
        { status: 400 }
      );
    }

    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json(
        { error: "Speed must be between 0.25 and 4.0" },
        { status: 400 }
      );
    }

    // Generate TTS
    const result = await textToSpeechBase64(text, {
      voice,
      speed,
      responseFormat: "mp3",
    });

    // Return based on preference
    if (returnBase64) {
      return NextResponse.json({
        audio: result.audio,
        format: result.format,
        contentType: getContentType(result.format),
      });
    }

    // Return as audio stream
    const audioBuffer = Buffer.from(result.audio, "base64");
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": getContentType(result.format),
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/speak
 * List available TTS voices
 */
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      voices: Object.entries(VOICE_OPTIONS).map(([id, info]) => ({
        id,
        ...info,
      })),
    });
  } catch (error) {
    console.error("Error listing voices:", error);
    return NextResponse.json(
      { error: "Failed to list voices" },
      { status: 500 }
    );
  }
}
