/**
 * Script to link an existing Magnus DID to a voice agent
 * Run with: tsx scripts/link-did-to-agent.ts
 */

import { PrismaClient } from '../dist';

const prisma = new PrismaClient();

async function main() {
  // Data from the Magnus provisioning we did earlier
  const MAGNUS_USER_ID = '1237';
  const MAGNUS_SIP_ID = '1279';
  const DID_NUMBER = '+17678183521';

  // Find the first agent to link to (or specify a specific one)
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      name: { contains: 'Magnus' }
    },
    orderBy: { createdAt: 'desc' },
  });

  let targetAgent = agent;

  if (!targetAgent) {
    console.log('No agent with "Magnus" in name found. Looking for any agent...');
    targetAgent = await prisma.voiceAgent.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  if (!targetAgent) {
    console.log('No agent available. Creating one...');
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error('No organization found! Cannot create agent.');
      return;
    }

    targetAgent = await prisma.voiceAgent.create({
      data: {
        name: 'Magnus Test Agent',
        organizationId: org.id,
        systemPrompt: 'You are a helpful voice assistant.',
        isActive: true,
      },
    });
    console.log('Created agent:', targetAgent.id, '-', targetAgent.name);
  }

  console.log('Linking DID to agent:', targetAgent.id, '-', targetAgent.name);
  console.log('Organization:', targetAgent.organizationId);

  // Check if SIPConfig exists
  let sipConfig = await prisma.sIPConfig.findFirst({
    where: { magnusTrunkId: MAGNUS_SIP_ID },
  });

  if (!sipConfig) {
    console.log('\nCreating SIPConfig...');
    sipConfig = await prisma.sIPConfig.create({
      data: {
        name: `${targetAgent.name} SIP`,
        organizationId: targetAgent.organizationId,
        provider: 'magnus',
        sipUrl: `sip:agent_${MAGNUS_SIP_ID}@voice00.epic.dm`,
        sipUsername: `agent_${DID_NUMBER.slice(-4)}`,
        sipPassword: '', // Would need actual password from provisioning
        magnusTrunkId: MAGNUS_SIP_ID,
      },
    });
    console.log('Created SIPConfig:', sipConfig.id);
  } else {
    console.log('\nSIPConfig already exists:', sipConfig.id);
  }

  // Check if PhoneMapping already exists
  const existingMapping = await prisma.phoneMapping.findFirst({
    where: { phoneNumber: DID_NUMBER },
  });

  if (existingMapping) {
    console.log('\nPhoneMapping already exists:', existingMapping.id);
    console.log('  Phone:', existingMapping.phoneNumber);
    console.log('  Agent:', existingMapping.agentId);
    return;
  }

  // Create PhoneMapping
  const phoneMapping = await prisma.phoneMapping.create({
    data: {
      phoneNumber: DID_NUMBER,
      organizationId: targetAgent.organizationId,
      agentId: targetAgent.id,
      sipConfigId: sipConfig.id,
      magnusDidId: MAGNUS_SIP_ID, // Using SIP ID as placeholder - would need actual DID ID
      magnusStatus: 'active',
      isActive: true,
    },
  });

  console.log('\n✅ Successfully linked DID to agent!');
  console.log('  PhoneMapping ID:', phoneMapping.id);
  console.log('  Phone Number:', phoneMapping.phoneNumber);
  console.log('  Agent ID:', phoneMapping.agentId);
  console.log('  Agent Name:', targetAgent.name);

  // Verify the link
  const verifyAgent = await prisma.voiceAgent.findUnique({
    where: { id: targetAgent.id },
    include: { phoneMappings: true },
  });

  console.log('\nVerification - Agent now has', verifyAgent?.phoneMappings.length, 'phone mapping(s)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
