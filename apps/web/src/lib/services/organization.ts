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

  // Create organization with user as owner
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      plan: "starter",
      settings: {},
      memberships: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
    include: {
      memberships: true,
    },
  });

  return organization;
}

/**
 * Create a brand within an organization.
 */
export async function createBrand(input: CreateBrandInput) {
  const { organizationId, name, website } = input;

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
