import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import jwt from "jsonwebtoken";

const POSTIZ_URL = (process.env.NEXT_PUBLIC_POSTIZ_URL || "http://localhost:5000").trim();
const POSTIZ_SSO_SECRET = process.env.POSTIZ_SSO_SECRET;

/**
 * GET - Redirect to Postiz with auto-login
 * This endpoint generates the SSO token and redirects directly
 * Use this as an href instead of calling fetch + window.open
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in if not authenticated
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    // Get destination from query param
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    // Build the redirect path
    let connectPath = "/integrations/social";
    if (platform) {
      connectPath = `/integrations/social/${platform}`;
    }

    // If SSO secret is configured, use the auto-login flow
    if (POSTIZ_SSO_SECRET && email) {
      // Generate SSO token signed with shared secret
      const ssoToken = jwt.sign(
        {
          email,
          orgName: org.name,
          epicOrgId: org.id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300, // 5 minute expiry
        },
        POSTIZ_SSO_SECRET
      );

      // Redirect to auto-login endpoint
      const autoLoginUrl = `${POSTIZ_URL}/auth/auto-login?token=${encodeURIComponent(ssoToken)}&redirect=${encodeURIComponent(connectPath)}`;
      return NextResponse.redirect(autoLoginUrl);
    }

    // Fallback: redirect directly to Postiz (user will need to login manually)
    return NextResponse.redirect(`${POSTIZ_URL}${connectPath}`);
  } catch (error) {
    console.error("Error in connect-redirect:", error);
    // Fallback to Postiz
    return NextResponse.redirect(`${POSTIZ_URL}/integrations/social`);
  }
}
