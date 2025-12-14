
import { PrismaClient, SocialPlatform } from '@prisma/client';
import { SocialPublisher } from '../src/lib/services/social-publishing/publisher';
import { Logger } from '../src/lib/logger';

// Initialize Prisma
const prisma = new PrismaClient();

async function main() {
  Logger.info('Starting verification of SocialPublisher...');

  // 1. Setup Test Data
  const testOrgSlug = 'smoke-test-org-' + Date.now();
  const testBrandSlug = 'smoke-test-brand-' + Date.now();
  
  Logger.info('Creating test organization and brand...');
  
  const org = await prisma.organization.create({
    data: {
      name: 'Smoke Test Org',
      slug: testOrgSlug,
      plan: 'starter'
    }
  });

  const brand = await prisma.brand.create({
    data: {
      name: 'Smoke Test Brand',
      slug: testBrandSlug,
      organizationId: org.id
    }
  });

  // 2. Create a Mock Social Account (Twitter)
  // We use a fake token. The publisher should fail gracefully (invalid token) or we mock the client.
  // Since we are verifying the *flow*, getting a "Failed" result due to invalid token is actually a SUCCESS for the flow verification
  // because it means the publisher tried, caught the error, and updated the DB.
  
  Logger.info('Creating mock social account...');
  const account = await prisma.socialAccount.create({
    data: {
      brandId: brand.id,
      platform: 'TWITTER',
      accessToken: 'mock-encrypted-token', // logic will try to decrypt this
      username: 'smoketest_user',
      status: 'CONNECTED',
      platformId: '123456789'
    }
  });

  // 3. Create Content Item
  Logger.info('Creating content item...');
  const content = await prisma.contentItem.create({
    data: {
      brandId: brand.id,
      content: 'This is a smoke test post from the verification script.',
      status: 'APPROVED',
      targetPlatforms: ['TWITTER']
    }
  });

  // 4. Run Publisher
  Logger.info('Executing publish...');
  const publisher = new SocialPublisher(brand.id);
  const results = await publisher.publish(content.id, ['TWITTER']);

  // 5. Verify Results
  Logger.info('Verifying results...', { results });

  const result = results[0];
  if (result.platform !== 'TWITTER') throw new Error('Platform mismatch');
  
  // We expect failure because the token is fake, but we expect the SYSTEM to handle it correctly.
  // It should NOT throw. It should return success=false.
  
  if (result.result.success === true) {
     Logger.warn('Unexpected success with fake token?');
  } else {
     Logger.info('Expected failure occurred (invalid token). Flow verified.');
  }

  // Check DB
  const dbResult = await prisma.publishResult.findFirst({
    where: { contentId: content.id, platform: 'TWITTER' }
  });

  if (!dbResult) throw new Error('PublishResult record was not created in DB');
  Logger.info('DB Record found:', dbResult);

  if (dbResult.status === 'FAILED' || dbResult.status === 'RATE_LIMITED') {
      Logger.info('SUCCESS: Publisher handled the request and recorded the outcome.');
  } else {
      throw new Error(`Unexpected DB status: ${dbResult.status}`);
  }

  // Cleanup
  Logger.info('Cleaning up test data...');
  await prisma.contentItem.delete({ where: { id: content.id } });
  await prisma.socialAccount.delete({ where: { id: account.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  await prisma.organization.delete({ where: { id: org.id } });

  Logger.info('Verification COMPLETE. System is ready for real credentials.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
