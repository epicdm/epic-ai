import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ data: null, error: { message: "Not implemented" } }, { status: 501 });
}
