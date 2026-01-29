import { NextResponse } from "next/server";
import { initializeEvents, isEventsInitialized } from "@/lib/events/init";

// Initialize on module load
initializeEvents();

/**
 * GET /api/init
 * Health check endpoint that ensures events are initialized
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    eventsInitialized: isEventsInitialized(),
    message: "Event system initialized"
  });
}
