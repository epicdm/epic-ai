/**
 * Debug script to check voice agents in database
 * Run with: pnpm tsx apps/web/scripts/debug-agents.ts
 */

import { prisma } from "@epic-ai/database";

async function main() {
  console.log("=== Voice Agents Debug ===\n");

  // Check all users
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  console.log(`Found ${users.length} users:`);
  users.forEach((user) => {
    console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`    ID: ${user.id}`);
    console.log(`    Memberships: ${user.memberships.length}`);
    user.memberships.forEach((m) => {
      console.log(`      - Org: ${m.organization.name} (${m.organization.id})`);
    });
  });

  console.log("\n");

  // Check all organizations
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          voiceAgents: true,
          brands: true,
        },
      },
    },
  });

  console.log(`Found ${orgs.length} organizations:`);
  orgs.forEach((org) => {
    console.log(`  - ${org.name} (${org.id})`);
    console.log(`    Slug: ${org.slug}`);
    console.log(`    Voice Agents: ${org._count.voiceAgents}`);
    console.log(`    Brands: ${org._count.brands}`);
  });

  console.log("\n");

  // Check all voice agents
  const agents = await prisma.voiceAgent.findMany({
    include: {
      organization: {
        select: { id: true, name: true },
      },
      phoneMappings: {
        select: { id: true, phoneNumber: true },
      },
    },
  });

  console.log(`Found ${agents.length} voice agents:`);
  agents.forEach((agent) => {
    console.log(`  - ${agent.name} (${agent.id})`);
    console.log(`    Organization: ${agent.organization.name} (${agent.organizationId})`);
    console.log(`    Brand ID: ${agent.brandId || "No brand"}`);
    console.log(`    Phone numbers: ${agent.phoneMappings.length}`);
    agent.phoneMappings.forEach((pm: { id: string; phoneNumber: string }) => {
      console.log(`      - ${pm.phoneNumber}`);
    });
  });

  console.log("\n=== End Debug ===");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
