import { prisma, Prisma } from "@epic-ai/database";
import { slugify } from "@epic-ai/shared";

export interface CreateOrganizationInput {
  name: string;
  userId: string;
}

export interface CreateBrandInput {
  organizationId: string;
  name: string;
  website?: string;
  logo?: string;
}

/**
 * Create a new organization and set the user as owner.
 */
export async function createOrganization(input: CreateOrganizationInput) {
  const { name, userId } = input;

  // Generate slug from name
  let slug = slugify(name);

  // Check if slug exists, append number if needed
  let slugExists = await prisma.organization.findUnique({
    where: { slug },
  });

  let counter = 1;
  while (slugExists) {
    slug = `${slugify(name)}-${counter}`;
    slugExists = await prisma.organization.findUnique({
      where: { slug },
    });
    counter++;
  }

  // TEMPORARY WORKAROUND: Create organization and membership separately
  // Database schema is out of sync - nested create fails with foreign key error
  console.log("[createOrganization] Creating organization:", { name, slug, userId });

  // Step 1: Create organization first (without nested membership)
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      plan: "starter",
      settings: {},
    },
  });

  console.log("[createOrganization] Organization created:", organization.id);

  // Step 2: Create membership separately
  try {
    await prisma.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        role: "owner",
      },
    });
    console.log("[createOrganization] Membership created for userId:", userId);
  } catch (membershipError) {
    console.error("[createOrganization] Failed to create membership with Prisma:", membershipError);

    // LAST RESORT: Try raw SQL with different column name patterns
    // The database might use userId/organizationId instead of user_id/organization_id
    try {
      console.log("[createOrganization] Attempting raw SQL fallback...");

      // Try pattern 1: camelCase columns (userId, organizationId)
      await prisma.$executeRaw`
        INSERT INTO memberships (id, "userId", "organizationId", role, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}, ${organization.id}, 'owner', NOW(), NOW())
      `;
      console.log("[createOrganization] Membership created via raw SQL (camelCase)");
    } catch (rawError1) {
      console.error("[createOrganization] Raw SQL fallback 1 failed:", rawError1);

      try {
        // Try pattern 2: snake_case columns (user_id, organization_id)
        await prisma.$executeRaw`
          INSERT INTO memberships (id, user_id, organization_id, role, created_at, updated_at)
          VALUES (gen_random_uuid(), ${userId}, ${organization.id}, 'owner', NOW(), NOW())
        `;
        console.log("[createOrganization] Membership created via raw SQL (snake_case)");
      } catch (rawError2) {
        console.error("[createOrganization] All membership creation attempts failed:", rawError2);
        // Clean up the orphaned organization
        await prisma.organization.delete({ where: { id: organization.id } });
        throw new Error(`Failed to create membership after multiple attempts. Database schema is likely incompatible.`);
      }
    }
  }

  // Step 3: Refetch with memberships
  const orgWithMemberships = await prisma.organization.findUnique({
    where: { id: organization.id },
    include: {
      memberships: true,
    },
  });

  console.log("[createOrganization] Complete! Org with memberships:", {
    id: orgWithMemberships?.id,
    name: orgWithMemberships?.name,
    membershipCount: orgWithMemberships?.memberships.length,
  });

  return orgWithMemberships!;
}

/**
 * Create a brand within an organization.
 */
export async function createBrand(input: CreateBrandInput) {
  const { organizationId, name, website, logo } = input;

  // Generate slug from name
  let slug = slugify(name);

  // Check if slug exists within this org
  let slugExists = await prisma.brand.findUnique({
    where: {
      organizationId_slug: {
        organizationId,
        slug,
      },
    },
  });

  let counter = 1;
  while (slugExists) {
    slug = `${slugify(name)}-${counter}`;
    slugExists = await prisma.brand.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });
    counter++;
  }

  const brand = await prisma.brand.create({
    data: {
      organizationId,
      name,
      slug,
      website: website || null,
      logo: logo || null,
      settings: {},
    },
  });

  return brand;
}

/**
 * Get organization by ID with related data.
 */
export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      brands: true,
      memberships: {
        include: {
          user: true,
        },
      },
      subscriptions: true,
    },
  });
}

/**
 * Get organization by slug.
 */
export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      brands: true,
      memberships: {
        include: {
          user: true,
        },
      },
    },
  });
}

/**
 * Update organization.
 */
export async function updateOrganization(
  id: string,
  data: { name?: string; logo?: string; settings?: Prisma.InputJsonValue }
) {
  return prisma.organization.update({
    where: { id },
    data,
  });
}

/**
 * Check if slug is available.
 */
export async function isSlugAvailable(slug: string) {
  const existing = await prisma.organization.findUnique({
    where: { slug },
  });
  return !existing;
}
