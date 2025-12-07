import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPostizHealth, getPostizDashboardUrl } from "@/lib/services/postiz";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postizUrl = process.env.POSTIZ_URL;
    const isConfigured = !!postizUrl && postizUrl !== "http://localhost:5000";

    // Skip health check if not configured for production
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        status: "not_configured",
        postizAvailable: false,
        postizUrl: getPostizDashboardUrl(),
        message: "Postiz is not configured for production. Set POSTIZ_URL environment variable.",
      });
    }

    const isPostizHealthy = await checkPostizHealth();

    return NextResponse.json({
      configured: true,
      status: isPostizHealthy ? "connected" : "unreachable",
      postizAvailable: isPostizHealthy,
      postizUrl: getPostizDashboardUrl(),
      message: isPostizHealthy
        ? "Postiz is running and ready"
        : "Postiz is configured but not reachable. Check the Postiz deployment.",
    });
  } catch (error) {
    console.error("Error checking social status:", error);
    return NextResponse.json(
      { error: "Failed to check social status" },
      { status: 500 }
    );
  }
}
