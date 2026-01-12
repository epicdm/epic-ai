/**
 * Debug script to simulate API responses
 */

import { PrismaClient } from '../dist';

const prisma = new PrismaClient();

async function simulateAPIs() {
  const userId = 'user_36XVMb3CwJy3Il2BxCXJcog7dXB';

  // Get user and org
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { organization: true } } }
  });

  if (!user || user.memberships.length === 0) {
    console.log('No user or no memberships');
    return;
  }

  const org = user.memberships[0].organization;
  console.log('=== User Organization ===');
  console.log('Org ID:', org.id);
  console.log('Org Name:', org.name);

  // Simulate phone numbers API
  const phoneNumbers = await prisma.phoneMapping.findMany({
    where: { organizationId: org.id },
    include: {
      agent: { select: { id: true, name: true } },
      sipConfig: { select: { id: true, name: true, provider: true } },
      _count: { select: { callLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n=== Phone Numbers API Response ===');
  console.log(JSON.stringify({ phoneNumbers, count: phoneNumbers.length }, null, 2));

  // Simulate agents API
  const agents = await prisma.voiceAgent.findMany({
    where: { organizationId: org.id },
    include: {
      phoneMappings: { select: { id: true, phoneNumber: true } },
      _count: { select: { callLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n=== Agents API Response ===');
  console.log(JSON.stringify({ agents, count: agents.length }, null, 2));
}

simulateAPIs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
