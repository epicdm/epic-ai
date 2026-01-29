import { getAuthWithBypass } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, transcribeBase64, isSupportedFormat, SUPPORTED_LANGUAGES } from "@/lib/voice/stt";

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using OpenAI Whisper
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("audio") as File | null;
      const language = formData.get("language") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
      }

      // Validate file format
      if (!isSupportedFormat(file.name)) {
        return NextResponse.json(
          { error: "Unsupported audio format. Supported: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm" },
          { status: 400 }
        );
      }

      // Check file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Maximum 25MB." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const result = await transcribeAudio(audioBuffer, file.name, {
        language: language || undefined,
        responseFormat: "verbose_json",
      });

      return NextResponse.json({
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      });
    }

    // Handle JSON body (base64 audio)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { audio, filename = "audio.webm", language } = body;

      if (!audio) {
        return NextResponse.json(
          { error: "Audio data (base64) is required" },
          { status: 400 }
        );
      }

      // Validate filename format
      if (!isSupportedFormat(filename)) {
        return NextResponse.json(
          { error: "Unsupported audio format. Supported: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm" },
          { status: 400 }
        );
      }

      const result = await transcribeBase64(audio, filename, {
        language: language || undefined,
        responseFormat: "verbose_json",
      });

      return NextResponse.json({
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      });
    }

    return NextResponse.json(
      { error: "Invalid content type. Use multipart/form-data or application/json" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/transcribe/languages
 * List supported transcription languages
 */
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
        code,
        name,
      })),
    });
  } catch (error) {
    console.error("Error listing languages:", error);
    return NextResponse.json(
      { error: "Failed to list languages" },
      { status: 500 }
    );
  }
}
