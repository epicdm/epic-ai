
import { PrismaClient } from '@prisma/client';
import { BrandBrainService } from '../src/lib/services/brand-brain/service';
import { ContentGenerator } from '../src/lib/services/content-factory/generator';
import { Logger } from '../src/lib/logger';
import { generateId } from '../src/lib/utils';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function smokeTest() {
  Logger.info('🔥 Starting Smoke Test: Brand Brain & Content Factory');

  // 1. Setup Test Organization & Brand
  const testId = generateId();
  const orgSlug = `smoke-test-org-${testId}`;
  const brandSlug = `smoke-test-brand-${testId}`;

  Logger.info(`Creating test organization (${orgSlug}) and brand (${brandSlug})...`);

  const org = await prisma.organization.create({
    data: {
      name: 'Smoke Test Org',
      slug: orgSlug,
      plan: 'starter',
    },
  });

  const brand = await prisma.brand.create({
    data: {
      name: 'Smoke Test Brand',
      slug: brandSlug,
      organizationId: org.id,
      industry: 'Technology',
    },
  });

  try {
    // 2. Initialize Brand Brain
    Logger.info('🧠 Initializing Brand Brain...');
    const brandBrainService = new BrandBrainService(brand.id);
    
    // We mock the website scrape by not providing a URL, falling back to basic init
    const profile = await brandBrainService.initialize();
    
    Logger.info('Brand Brain Profile created:', { 
        voice: profile.voiceTone, 
        pillars: profile.contentPillars 
    });

    if (!profile.voiceTone) throw new Error('Brand Brain failed to set default voice tone');

    // Update Profile to ensure writes work
    await brandBrainService.updateProfile({
        voiceTone: 'WITTY',
        values: ['Innovation', 'Speed'],
        description: 'A cutting-edge AI startup focused on speed.'
    });

    const updatedProfile = await brandBrainService.getProfile();
    if (updatedProfile?.voiceTone !== 'WITTY') throw new Error('Brand Brain update failed');
    Logger.info('Brand Brain update verified.');

    // 3. Test Content Factory (Mocking OpenAI)
    Logger.info('🏭 Testing Content Factory (Mock Mode)...');
    
    // We need to mock OpenAI for a smoke test to avoid burning credits or requiring API keys in CI
    // Ideally we'd use dependency injection, but for this smoke test we'll rely on the class structure.
    // If OPENAI_API_KEY is missing, this will fail. 
    // We will wrap this in a try/catch specific to the API call.

    if (!process.env.OPENAI_API_KEY) {
        Logger.warn('⚠️ Skipping Content Factory generation test: OPENAI_API_KEY not found.');
    } else {
        const generator = new ContentGenerator(brand.id);
        const result = await generator.generate({
            brandId: brand.id,
            topic: 'The future of AI',
            contentType: 'POST',
            targetPlatforms: ['TWITTER', 'LINKEDIN'],
            includeImage: false
        });

        Logger.info('Content Generated:', { 
            contentSample: result.content.substring(0, 50) + '...',
            variations: result.variations.length 
        });

        if (result.variations.length !== 2) throw new Error('Failed to generate variations for both platforms');
    }

    Logger.info('✅ Smoke Test PASSED');

  } catch (error) {
    Logger.error('❌ Smoke Test FAILED', error);
    throw error;
  } finally {
    // Cleanup
    Logger.info('🧹 Cleaning up test data...');
    await prisma.brand.delete({ where: { id: brand.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.$disconnect();
  }
}

smokeTest().catch((e) => {
    console.error(e);
    process.exit(1);
});
