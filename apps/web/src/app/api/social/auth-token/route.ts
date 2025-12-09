import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { SignJWT } from "jose";

const POSTIZ_SSO_SECRET = process.env.POSTIZ_SSO_SECRET;

/**
 * Generate a signed token for Postiz auto-login
 */
export async function GET() {
  try {
    if (!POSTIZ_SSO_SECRET) {
      return NextResponse.json(
        { error: "SSO not configured" },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const org = await getUserOrganization();
    const orgName = org?.name || user?.firstName || email.split("@")[0];

    // Generate signed token with 5 minute expiry using jose
    const secret = new TextEncoder().encode(POSTIZ_SSO_SECRET);
    const token = await new SignJWT({
      email,
      userId,
      orgName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating auth token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
