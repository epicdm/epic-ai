import { NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";

export async function GET() {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      result,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
        E2E_UAT_BYPASS: process.env.E2E_UAT_BYPASS,
        UAT_AUTH_BYPASS_len: process.env.UAT_AUTH_BYPASS?.length,
        NEXT_PUBLIC_E2E_UAT_BYPASS: process.env.NEXT_PUBLIC_E2E_UAT_BYPASS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
          E2E_UAT_BYPASS: process.env.E2E_UAT_BYPASS,
          UAT_AUTH_BYPASS_len: process.env.UAT_AUTH_BYPASS?.length,
          NEXT_PUBLIC_E2E_UAT_BYPASS: process.env.NEXT_PUBLIC_E2E_UAT_BYPASS,
        },
      },
      { status: 500 }
    );
  }
}
