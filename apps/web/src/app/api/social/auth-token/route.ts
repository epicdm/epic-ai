import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import jwt from "jsonwebtoken";

// Use Postiz's JWT_SECRET (must match what Postiz is configured with)
const POSTIZ_JWT_SECRET = process.env.POSTIZ_JWT_SECRET;

/**
 * Generate a Postiz-compatible JWT token for auto-login
 *
 * Postiz expects a JWT signed with their JWT_SECRET containing user info.
 * The token is used to set the 'auth' cookie on the Postiz domain.
 */
export async function GET() {
  try {
    if (!POSTIZ_JWT_SECRET) {
      return NextResponse.json(
        { error: "POSTIZ_JWT_SECRET not configured" },
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

    // Get the Epic AI organization and its Postiz org ID
    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get Postiz organization details
    const epicOrg = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { postizOrgId: true },
    });

    if (!epicOrg?.postizOrgId) {
      return NextResponse.json(
        { error: "Postiz organization not provisioned" },
        { status: 404 }
      );
    }

    // Query Postiz database for the user's Postiz ID
    const { Client } = await import("pg");
    const postizDbUrl = process.env.POSTIZ_DATABASE_URL;

    if (!postizDbUrl) {
      return NextResponse.json(
        { error: "POSTIZ_DATABASE_URL not configured" },
        { status: 500 }
      );
    }

    const client = new Client({ connectionString: postizDbUrl });
    await client.connect();

    try {
      // Get the Postiz user ID and org ID for this email
      const result = await client.query(
        `SELECT u.id, u.email, u.activated, uo."organizationId"
         FROM "User" u
         JOIN "UserOrganization" uo ON u.id = uo."userId"
         WHERE u.email = $1 AND uo."organizationId" = $2
         LIMIT 1`,
        [email, epicOrg.postizOrgId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found in Postiz" },
          { status: 404 }
        );
      }

      const postizUser = result.rows[0];

      // Generate JWT matching Postiz's expected format
      // Postiz uses jsonwebtoken.sign(userObject, JWT_SECRET)
      const token = jwt.sign(
        {
          id: postizUser.id,
          email: postizUser.email,
          activated: postizUser.activated,
          organizationId: postizUser.organizationId,
        },
        POSTIZ_JWT_SECRET
      );

      return NextResponse.json({ token });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("Error generating Postiz auth token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
