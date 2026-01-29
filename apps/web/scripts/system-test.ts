import { PrismaClient } from '@prisma/client';
import { ContentScheduler } from '../src/lib/services/content-factory/scheduler';
import { SocialPublisher } from '../src/lib/services/social-publishing/publisher';
import { BrandBrainService } from '../src/lib/services/brand-brain/service';
import { Logger } from '../src/lib/logger';
import { generateId } from '../src/lib/utils';
import { safeEncryptToken } from '../src/lib/encryption';

// Environment Setup for Mocking
// Note: We set these early, but modules might cache values or we might need to set them via CLI for robustness.
if (!process.env.MOCK_SOCIAL_API) process.env.MOCK_SOCIAL_API = 'true';
if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = 'dummy-key';
if (!process.env.TOKEN_ENCRYPTION_KEY) {
    process.env.TOKEN_ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
}

const prisma = new PrismaClient();

async function runSystemTest() {
    Logger.info('🚀 Starting A-Z System Test Simulation');

    const testId = generateId();
    const orgSlug = `sys-test-org-${testId}`;
    const brandSlug = `sys-test-brand-${testId}`;

    Logger.info('📝 Phase 1: User Onboarding (Setup)');
    
    // Create Org
    const org = await prisma.organization.create({
        data: { name: 'System Test Org', slug: orgSlug, plan: 'pro' }
    });
    
    // Create Brand
    const brand = await prisma.brand.create({
        data: { 
            name: 'Epic System Test', 
            slug: brandSlug, 
            organizationId: org.id, 
            industry: 'SaaS' 
        }
    });
    Logger.info(`   ✅ Created Brand: ${brand.name} (${brand.id})`);

    try {
        // 2. Setup Social Account (Mock)
        Logger.info('🔗 Phase 2: Connecting Social Accounts');
        const encryptedToken = safeEncryptToken('mock-access-token');
        await prisma.socialAccount.create({
            data: {
                brandId: brand.id,
                platform: 'TWITTER',
                platformId: `twitter-${testId}`,
                username: 'EpicTestBot',
                displayName: 'Epic Test Bot',
                accessToken: encryptedToken,
                status: 'CONNECTED'
            }
        });
        Logger.info('   ✅ Connected Mock Twitter Account');

        // 3. Initialize Brain
        Logger.info('🧠 Phase 3: Brand Brain Initialization');
        const brainService = new BrandBrainService(brand.id);
        await brainService.initialize(); 
        Logger.info('   ✅ Brain Initialized');

        // 4. Configure Autopilot
        Logger.info('⚙️ Phase 4: Autopilot Configuration');
        await prisma.autopilotConfig.create({
            data: {
                brandId: brand.id,
                enabled: true,
                postsPerWeek: 3,
                postingDays: [1, 3, 5], // Mon, Wed, Fri
                postingTimesUtc: ['10:00', '14:00'],
                enabledPlatforms: ['TWITTER'],
                contentMix: { 'Industry News': 0.5, 'Tips': 0.5 },
                approvalMode: 'AUTO_QUEUE', // Require approval
                generateImages: false
            }
        });
        Logger.info('   ✅ Autopilot Configured (AUTO_QUEUE)');

        // 5. Generate Content (Scheduler)
        Logger.info('🏭 Phase 5: Content Generation (Scheduler)');
        const scheduler = new ContentScheduler(brand.id);
        
        const generatedIds = await scheduler.generateWeeklyContent();
        Logger.info(`   ✅ Generated ${generatedIds.length} draft posts`);
        
        if (generatedIds.length === 0) throw new Error('No content generated. Check Scheduler logic.');

        // 6. Approval Workflow
        Logger.info('👍 Phase 6: Approval Workflow');
        const pendingItems = await scheduler.getPendingApproval();
        Logger.info(`   Found ${pendingItems.length} pending items`);
        
        const itemToApprove = pendingItems[0] as any;
        if (!itemToApprove) throw new Error('No pending items found');

        await scheduler.approveContent(itemToApprove.id, 'system-test-user');
        Logger.info(`   ✅ Approved item ${itemToApprove.id}`);

        // Verify status change
        const approvedItem = await prisma.contentItem.findUnique({ where: { id: itemToApprove.id } });
        if (approvedItem?.status !== 'SCHEDULED') throw new Error('Item status not updated to SCHEDULED');

        // Force schedule time to NOW for publishing test
        await prisma.contentItem.update({
            where: { id: approvedItem.id },
            data: { scheduledFor: new Date() } // Due now
        });
        Logger.info('   ⏰ Fast-forwarded schedule time to NOW');

        // 7. Publishing (Worker)
        Logger.info('🚀 Phase 7: Publishing (Worker Simulation)');
        const publisher = new SocialPublisher(brand.id);
        const publishedCount = await publisher.publishScheduled();
        
        Logger.info(`   ✅ Publisher processed ${publishedCount} items`);
        if (publishedCount !== 1) throw new Error(`Expected 1 published item, got ${publishedCount}`);

        // Verify Result
        const finalItem = await prisma.contentItem.findUnique({ 
            where: { id: approvedItem.id },
            include: { publishResults: true }
        });
        
        if (finalItem?.status !== 'PUBLISHED') throw new Error(`Final status mismatch: ${finalItem?.status}`);
        const result = finalItem.publishResults[0];
        if (!result || result.status !== 'SUCCESS') throw new Error('PublishResult missing or failed');
        
        Logger.info(`   ✅ Verified DB State: Status=PUBLISHED, PostID=${result.platformPostId}, URL=${result.postUrl}`);

        Logger.info('✨ A-Z System Test COMPLETED SUCCESSFULLY');

    } catch (error) {
        Logger.error('❌ System Test FAILED', error);
        throw error;
    } finally {
        Logger.info('🧹 Cleanup...');
        // Delete items first due to foreign keys
        await prisma.contentItem.deleteMany({ where: { brandId: brand.id } });
        await prisma.brandBrain.deleteMany({ where: { brandId: brand.id } });
        await prisma.socialAccount.deleteMany({ where: { brandId: brand.id } });
        await prisma.autopilotConfig.deleteMany({ where: { brandId: brand.id } });
        
        await prisma.brand.delete({ where: { id: brand.id } });
        await prisma.organization.delete({ where: { id: org.id } });
        await prisma.$disconnect();
    }
}

runSystemTest().catch((e) => {
    console.error(e);
    process.exit(1);
});
