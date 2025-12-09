import { prisma } from "@epic-ai/database";

const POSTIZ_DB_URL = process.env.POSTIZ_DATABASE_URL;

interface QueryResult {
  id?: string;
  apiKey?: string;
  orgId?: string;
  orgName?: string;
}

/**
 * Execute query on Postiz database
 */
async function queryPostizDB<T extends QueryResult>(
  query: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  if (!POSTIZ_DB_URL) {
    throw new Error("POSTIZ_DATABASE_URL not configured");
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString: POSTIZ_DB_URL });

  try {
    await client.connect();
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Check if user exists in Postiz by email
 */
export async function postizUserExists(email: string): Promise<boolean> {
  const results = await queryPostizDB<{ id: string }>(
    `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
    [email]
  );
  return results.length > 0;
}

/**
 * Get Postiz user by email
 */
export async function getPostizUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  organizationId: string | null;
} | null> {
  const results = await queryPostizDB<{
    id: string;
    email: string;
    organizationId: string | null;
  }>(
    `SELECT id, email, "organizationId" FROM "User" WHERE email = $1 LIMIT 1`,
    [email]
  );
  return results[0] || null;
}

/**
 * Get Postiz API key for a user by their email
 */
export async function getPostizApiKeyByEmail(email: string): Promise<{
  apiKey: string;
  orgId: string;
  orgName: string;
} | null> {
  const results = await queryPostizDB<{
    apiKey: string;
    orgId: string;
    orgName: string;
  }>(
    `SELECT o."apiKey" as "apiKey", o.id as "orgId", o.name as "orgName"
     FROM "User" u
     JOIN "UserOrganization" uo ON u.id = uo."userId"
     JOIN "Organization" o ON uo."organizationId" = o.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );

  const result = results[0];
  if (!result || !result.apiKey) {
    return null;
  }

  return result;
}

/**
 * Sync Postiz API key to Epic AI organization
 */
export async function syncPostizApiKey(
  epicOrgId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postizData = await getPostizApiKeyByEmail(userEmail);

    if (!postizData) {
      return {
        success: false,
        error: "User not found in Postiz. Please connect your accounts first.",
      };
    }

    if (!postizData.apiKey) {
      return {
        success: false,
        error: "No API key found in Postiz.",
      };
    }

    // Store in Epic AI
    await prisma.organization.update({
      where: { id: epicOrgId },
      data: {
        postizOrgId: postizData.orgId,
        postizApiKey: postizData.apiKey,
        postizConnectedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error syncing Postiz API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
