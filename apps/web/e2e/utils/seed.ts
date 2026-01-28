/**
 * E2E Test Seed Script
 *
 * Creates deterministic test data for E2E tests.
 * Run before tests to ensure consistent state.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic test IDs for easy reference
export const TEST_IDS = {
  // Users
  TEST_USER_ID: "test_user_e2e_001",
  TEST_USER_EMAIL: "e2e-test@epic.dm",

  // Organizations
  TEST_ORG_ID: "test_org_e2e_001",
  TEST_ORG_SLUG: "e2e-test-org",

  // Brands
  TEST_BRAND_ID: "test_brand_e2e_001",
  TEST_BRAND_SLUG: "e2e-test-brand",

  // Social Accounts
  TEST_FACEBOOK_ACCOUNT_ID: "test_fb_account_001",
  TEST_TWITTER_ACCOUNT_ID: "test_twitter_account_001",
};

export async function seedTestDatabase() {
  console.log("[E2E Seed] Starting database seed...");

  try {
    // Clean up existing test data first
    await cleanupTestData();

    // 1. Create test user
    const user = await prisma.user.upsert({
      where: { id: TEST_IDS.TEST_USER_ID },
      update: {},
      create: {
        id: TEST_IDS.TEST_USER_ID,
        email: TEST_IDS.TEST_USER_EMAIL,
        firstName: "E2E",
        lastName: "Tester",
      },
    });
    console.log("[E2E Seed] Created test user:", user.id);

    // 2. Create test organization
    const org = await prisma.organization.upsert({
      where: { id: TEST_IDS.TEST_ORG_ID },
      update: {},
      create: {
        id: TEST_IDS.TEST_ORG_ID,
        name: "E2E Test Organization",
        slug: TEST_IDS.TEST_ORG_SLUG,
        plan: "growth",
      },
    });
    console.log("[E2E Seed] Created test organization:", org.id);

    // 3. Create membership
    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        role: "owner",
      },
    });
    console.log("[E2E Seed] Created membership");

    // 4. Create test brand
    const brand = await prisma.brand.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: TEST_IDS.TEST_BRAND_SLUG,
        },
      },
      update: {},
      create: {
        id: TEST_IDS.TEST_BRAND_ID,
        organizationId: org.id,
        name: "E2E Test Brand",
        slug: TEST_IDS.TEST_BRAND_SLUG,
        website: "https://e2e-test.epic.dm",
        industry: "Technology",
      },
    });
    console.log("[E2E Seed] Created test brand:", brand.id);

    // 5. Create brand brain
    await prisma.brandBrain.upsert({
      where: { brandId: brand.id },
      update: {},
      create: {
        brandId: brand.id,
        companyName: "E2E Test Company",
        description: "A test company for E2E testing",
        mission: "To test all features thoroughly",
        industry: "Technology",
        voiceTone: "PROFESSIONAL",
        formalityLevel: 3,
        useEmojis: true,
        useHashtags: true,
        setupComplete: true,
        setupStep: 5,
      },
    });
    console.log("[E2E Seed] Created brand brain");

    // 6. Create flywheel progress (in UNDERSTAND phase)
    await prisma.flywheelProgress.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        brandId: brand.id,
        understandPhase: "COMPLETED",
        createPhase: "IN_PROGRESS",
        distributePhase: "NOT_STARTED",
        learnPhase: "NOT_STARTED",
        automatePhase: "NOT_STARTED",
        understandStep: 5,
        createStep: 2,
        overallProgress: 25,
        flywheelActive: false,
      },
    });
    console.log("[E2E Seed] Created flywheel progress");

    // 7. Create test social accounts (mock connected)
    await prisma.socialAccount.upsert({
      where: { id: TEST_IDS.TEST_FACEBOOK_ACCOUNT_ID },
      update: {},
      create: {
        id: TEST_IDS.TEST_FACEBOOK_ACCOUNT_ID,
        brandId: brand.id,
        platform: "FACEBOOK",
        platformId: "fb_123456789",
        username: "e2etestpage",
        displayName: "E2E Test Facebook Page",
        avatar: "https://via.placeholder.com/150",
        profileUrl: "https://facebook.com/e2etestpage",
        accessToken: "mock_encrypted_token_fb",
        tokenExpires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: "CONNECTED",
      },
    });
    console.log("[E2E Seed] Created Facebook account");

    // 8. Create content pillars
    const brain = await prisma.brandBrain.findUnique({ where: { brandId: brand.id } });
    if (brain) {
      await prisma.contentPillar.createMany({
        data: [
          {
            brainId: brain.id,
            name: "Industry Insights",
            description: "Thought leadership content about tech trends",
            color: "#7C3AED",
          },
          {
            brainId: brain.id,
            name: "Product Updates",
            description: "New features and product announcements",
            color: "#10B981",
          },
          {
            brainId: brain.id,
            name: "Behind the Scenes",
            description: "Team and company culture content",
            color: "#F59E0B",
          },
        ],
        skipDuplicates: true,
      });
      console.log("[E2E Seed] Created content pillars");
    }

    console.log("[E2E Seed] Database seed completed successfully!");
    return { user, org, brand };
  } catch (error) {
    console.error("[E2E Seed] Error seeding database:", error);
    throw error;
  }
}

export async function cleanupTestData() {
  console.log("[E2E Seed] Cleaning up test data...");

  try {
    // Delete in reverse order of dependencies
    await prisma.contentPillar.deleteMany({
      where: {
        brain: {
          brand: {
            id: TEST_IDS.TEST_BRAND_ID,
          },
        },
      },
    });

    await prisma.socialAccount.deleteMany({
      where: {
        id: { in: [TEST_IDS.TEST_FACEBOOK_ACCOUNT_ID, TEST_IDS.TEST_TWITTER_ACCOUNT_ID] },
      },
    });

    await prisma.brandBrain.deleteMany({
      where: { brandId: TEST_IDS.TEST_BRAND_ID },
    });

    await prisma.flywheelProgress.deleteMany({
      where: { userId: TEST_IDS.TEST_USER_ID },
    });

    await prisma.brand.deleteMany({
      where: { id: TEST_IDS.TEST_BRAND_ID },
    });

    await prisma.membership.deleteMany({
      where: { userId: TEST_IDS.TEST_USER_ID },
    });

    await prisma.organization.deleteMany({
      where: { id: TEST_IDS.TEST_ORG_ID },
    });

    await prisma.user.deleteMany({
      where: { id: TEST_IDS.TEST_USER_ID },
    });

    console.log("[E2E Seed] Cleanup completed");
  } catch (error) {
    console.error("[E2E Seed] Error during cleanup:", error);
    // Don't throw - cleanup errors shouldn't fail tests
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// Allow running directly with ts-node
if (require.main === module) {
  seedTestDatabase()
    .then(() => disconnectDatabase())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
