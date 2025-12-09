/**
 * Postiz Multi-Tenant Provisioning Service
 *
 * This service automatically provisions Postiz organizations for Epic AI customers.
 * Each Epic AI organization gets its own isolated Postiz workspace.
 *
 * Postiz Schema (from github.com/gitroomhq/postiz-app):
 * - Organization: id (UUID), name, apiKey, allowTrial, createdAt, updatedAt
 * - User: id (UUID), email, providerName (enum), activated, createdAt, updatedAt
 * - UserOrganization: userId, organizationId, role (SUPERADMIN/ADMIN/USER)
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { SignJWT } from "jose";

// Lazy initialization for Postiz database client
let postizDbClient: PrismaClient | null = null;

function getPostizDb(): PrismaClient {
  if (!postizDbClient) {
    const postizUrl = process.env.POSTIZ_DATABASE_URL;
    if (!postizUrl) {
      throw new Error("POSTIZ_DATABASE_URL is not configured");
    }
    postizDbClient = new PrismaClient({
      datasources: {
        db: { url: postizUrl },
      },
    });
  }
  return postizDbClient;
}

/**
 * Generate a secure API key (matches Postiz format - 64 char hex)
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a UUID (matches Postiz format)
 */
function generateId(): string {
  return crypto.randomUUID();
}

export interface PostizOrgResult {
  id: string;
  name: string;
  apiKey: string;
}

/**
 * Create a new Postiz organization for an Epic AI customer
 */
export async function createPostizOrganization(
  name: string,
  ownerEmail: string
): Promise<PostizOrgResult> {
  const postizDb = getPostizDb();
  const orgId = generateId();
  const userId = generateId();
  const apiKey = generateApiKey();
  const now = new Date();

  // Use raw SQL to match Postiz schema exactly
  await postizDb.$transaction(async (tx) => {
    // Create organization
    await tx.$executeRaw`
      INSERT INTO "Organization" (id, name, "apiKey", "allowTrial", "createdAt", "updatedAt")
      VALUES (${orgId}, ${name}, ${apiKey}, true, ${now}, ${now})
    `;

    // Create user with LOCAL provider
    await tx.$executeRaw`
      INSERT INTO "User" (id, email, "providerName", activated, timezone, audience, "createdAt", "updatedAt")
      VALUES (${userId}, ${ownerEmail}, 'LOCAL', true, 0, 0, ${now}, ${now})
    `;

    // Link user to organization with SUPERADMIN role
    const userOrgId = generateId();
    await tx.$executeRaw`
      INSERT INTO "UserOrganization" (id, "userId", "organizationId", role, disabled, "createdAt", "updatedAt")
      VALUES (${userOrgId}, ${userId}, ${orgId}, 'SUPERADMIN', false, ${now}, ${now})
    `;
  });

  return { id: orgId, name, apiKey };
}

/**
 * Check if a Postiz organization exists by name
 */
export async function getPostizOrganizationByName(
  name: string
): Promise<PostizOrgResult | null> {
  const postizDb = getPostizDb();
  const result = await postizDb.$queryRaw<PostizOrgResult[]>`
    SELECT id, name, "apiKey" as "apiKey"
    FROM "Organization"
    WHERE name = ${name}
    LIMIT 1
  `;
  return result[0] || null;
}

/**
 * Check if a Postiz organization exists by ID
 */
export async function getPostizOrganizationById(
  id: string
): Promise<PostizOrgResult | null> {
  const postizDb = getPostizDb();
  const result = await postizDb.$queryRaw<PostizOrgResult[]>`
    SELECT id, name, "apiKey" as "apiKey"
    FROM "Organization"
    WHERE id = ${id}
    LIMIT 1
  `;
  return result[0] || null;
}

/**
 * Add a user to an existing Postiz organization
 */
export async function addUserToPostizOrganization(
  orgId: string,
  email: string,
  role: "SUPERADMIN" | "ADMIN" | "USER" = "USER"
): Promise<string> {
  const postizDb = getPostizDb();
  const userId = generateId();
  const userOrgId = generateId();
  const now = new Date();

  // Check if user already exists
  const existingUser = await postizDb.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE email = ${email} LIMIT 1
  `;

  let actualUserId = userId;

  if (existingUser[0]) {
    actualUserId = existingUser[0].id;

    // Check if already in org
    const existingMembership = await postizDb.$queryRaw<{ id: string }[]>`
      SELECT id FROM "UserOrganization"
      WHERE "userId" = ${actualUserId} AND "organizationId" = ${orgId}
      LIMIT 1
    `;

    if (existingMembership[0]) {
      return actualUserId; // Already a member
    }
  } else {
    // Create new user
    await postizDb.$executeRaw`
      INSERT INTO "User" (id, email, "providerName", activated, timezone, audience, "createdAt", "updatedAt")
      VALUES (${userId}, ${email}, 'LOCAL', true, 0, 0, ${now}, ${now})
    `;
  }

  // Add to organization
  await postizDb.$executeRaw`
    INSERT INTO "UserOrganization" (id, "userId", "organizationId", role, disabled, "createdAt", "updatedAt")
    VALUES (${userOrgId}, ${actualUserId}, ${orgId}, ${role}::"Role", false, ${now}, ${now})
  `;

  return actualUserId;
}

/**
 * Get or create Postiz organization for an Epic AI org
 * This is the main entry point - handles all provisioning logic
 */
export async function ensurePostizOrganization(
  epicOrgId: string,
  epicOrgName: string,
  ownerEmail: string
): Promise<PostizOrgResult> {
  // Import Epic AI's prisma client
  const { prisma } = await import("@epic-ai/database");

  // First check if we already have a Postiz org for this Epic org
  const epicOrg = await prisma.organization.findUnique({
    where: { id: epicOrgId },
    select: { postizOrgId: true, postizApiKey: true },
  });

  // If already provisioned, verify it still exists and return
  if (epicOrg?.postizOrgId && epicOrg?.postizApiKey) {
    const existing = await getPostizOrganizationById(epicOrg.postizOrgId);
    if (existing) {
      return {
        id: epicOrg.postizOrgId,
        name: epicOrgName,
        apiKey: epicOrg.postizApiKey,
      };
    }
    // If Postiz org was deleted, we need to re-provision
  }

  // Check if org exists in Postiz by name (edge case: manual creation)
  let postizOrg = await getPostizOrganizationByName(epicOrgName);

  // If not exists, create it
  if (!postizOrg) {
    postizOrg = await createPostizOrganization(epicOrgName, ownerEmail);
  }

  // Store the Postiz org reference in Epic AI database
  await prisma.organization.update({
    where: { id: epicOrgId },
    data: {
      postizOrgId: postizOrg.id,
      postizApiKey: postizOrg.apiKey,
      postizConnectedAt: new Date(),
    },
  });

  return postizOrg;
}

/**
 * Regenerate API key for an organization
 */
export async function regenerateApiKey(orgId: string): Promise<string> {
  const postizDb = getPostizDb();
  const newApiKey = generateApiKey();
  const now = new Date();

  await postizDb.$executeRaw`
    UPDATE "Organization"
    SET "apiKey" = ${newApiKey}, "updatedAt" = ${now}
    WHERE id = ${orgId}
  `;

  return newApiKey;
}

/**
 * Delete Postiz organization (for cleanup/testing)
 */
export async function deletePostizOrganization(orgId: string): Promise<void> {
  const postizDb = getPostizDb();

  await postizDb.$transaction(async (tx) => {
    // Delete in order of dependencies
    // Note: This may need adjustment based on actual Postiz foreign keys
    await tx.$executeRaw`DELETE FROM "UserOrganization" WHERE "organizationId" = ${orgId}`;
    await tx.$executeRaw`DELETE FROM "Integration" WHERE "organizationId" = ${orgId}`;
    await tx.$executeRaw`DELETE FROM "Post" WHERE "organizationId" = ${orgId}`;
    await tx.$executeRaw`DELETE FROM "Organization" WHERE id = ${orgId}`;
  });
}

/**
 * Check if Postiz database is accessible
 */
export async function checkPostizDbHealth(): Promise<boolean> {
  try {
    const postizDb = getPostizDb();
    await postizDb.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the Postiz user ID for an Epic AI organization
 */
export async function getPostizUserId(postizOrgId: string): Promise<string | null> {
  const postizDb = getPostizDb();
  const result = await postizDb.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "UserOrganization"
    WHERE "organizationId" = ${postizOrgId}
    AND role = 'SUPERADMIN'
    LIMIT 1
  `;
  return result[0]?.userId || null;
}

/**
 * Generate a JWT token for auto-login to Postiz
 * This allows Epic AI users to seamlessly access Postiz integration pages
 */
export async function generatePostizAuthToken(
  postizOrgId: string
): Promise<string | null> {
  const jwtSecret = process.env.POSTIZ_JWT_SECRET;
  if (!jwtSecret) {
    console.error("POSTIZ_JWT_SECRET is not configured");
    return null;
  }

  const userId = await getPostizUserId(postizOrgId);
  if (!userId) {
    console.error("No user found for Postiz org:", postizOrgId);
    return null;
  }

  // Generate JWT matching Postiz's expected format
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({
    id: userId,
    orgId: postizOrgId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return token;
}
