import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPostizHealth, getPostizDashboardUrl } from "@/lib/services/postiz";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPostizHealthy = await checkPostizHealth();

    return NextResponse.json({
      postizAvailable: isPostizHealthy,
      postizUrl: getPostizDashboardUrl(),
      message: isPostizHealthy
        ? "Postiz is running and ready"
        : "Postiz is not available. Please check Docker containers.",
    });
  } catch (error) {
    console.error("Error checking social status:", error);
    return NextResponse.json(
      { error: "Failed to check social status" },
      { status: 500 }
    );
  }
}
