import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type ApiError = { code: string; message: string; details?: unknown };
type WarningItem = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field_path?: string;
};

export function normalizeDid(input: string) {
  const trimmed = (input || "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");
  return `${plus}${digits}`;
}

export function normalizeCaller(input: string) {
  // Caller can be unknown/anonymous, don't hard fail.
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `${plus}${digits}`;
}

export function requestId(req: NextRequest) {
  return req.headers.get("x-request-id") || randomUUID();
}

export function requireInternalToken(req: NextRequest) {
  const token = process.env.TELEPHONY_INTERNAL_TOKEN;
  if (!token) return { ok: true as const };

  const header = req.headers.get("x-epic-internal-token") || "";
  if (header !== token) {
    return {
      ok: false as const,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing/invalid internal token",
      } satisfies ApiError,
    };
  }
  return { ok: true as const };
}

export function jsonOk<T>(
  data: T,
  opts?: { warnings?: WarningItem[]; confidence?: Record<string, number> }
) {
  return NextResponse.json(
    {
      data,
      confidence: opts?.confidence ?? {},
      gaps: [],
      warnings: opts?.warnings ?? [],
      error: undefined,
    },
    { status: 200 }
  );
}

export function jsonErr(
  error: ApiError,
  status = 400,
  opts?: { warnings?: WarningItem[] }
) {
  return NextResponse.json(
    {
      data: null,
      confidence: {},
      gaps: [],
      warnings: opts?.warnings ?? [],
      error,
    },
    { status }
  );
}
