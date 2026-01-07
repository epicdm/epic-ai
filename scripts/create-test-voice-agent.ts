/**
 * Script to create a test voice agent for UAT testing
 * Run with: npx tsx scripts/create-test-voice-agent.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const UAT_ORG_ID = 'uat_test_org_001';

  // First ensure the UAT org exists
  const org = await prisma.organization.upsert({
    where: { id: UAT_ORG_ID },
    update: {},
    create: {
      id: UAT_ORG_ID,
      name: 'UAT Test Organization',
      slug: 'uat-test-org',
    },
  });
  console.log('Organization:', org.id);

  // Create test voice agent
  const agent = await prisma.voiceAgent.upsert({
    where: { id: 'test-agent-001' },
    update: {
      isActive: true,
    },
    create: {
      id: 'test-agent-001',
      organizationId: UAT_ORG_ID,
      name: 'Test Voice Agent',
      description: 'A test voice agent for UAT testing',
      agentType: 'OUTBOUND',
      systemPrompt: 'You are a helpful test agent.',
      isActive: true,
    },
  });
  console.log('Voice Agent created:', agent.id, agent.name);

  // Also create a test phone mapping (optional, for outbound caller ID)
  const phoneMapping = await prisma.phoneNumberMapping.upsert({
    where: { id: 'test-phone-001' },
    update: {},
    create: {
      id: 'test-phone-001',
      organizationId: UAT_ORG_ID,
      phoneNumber: '+15551234567',
      sipTrunkId: 'test-sip-trunk',
      isActive: true,
    },
  });
  console.log('Phone Mapping:', phoneMapping.phoneNumber);

  console.log('\n✅ Test data created successfully!');
  console.log('\nTest with:');
  console.log(`curl -X POST http://localhost:3001/api/voice/calls/outbound \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+15559876543", "agentId": "test-agent-001"}'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
