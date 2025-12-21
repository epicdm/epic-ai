/**
 * Content Queue Manager
 *
 * Manages:
 * - Creating content items with variations
 * - Approval workflow
 * - Scheduling
 * - Publishing coordination
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, ContentType, ContentStatus, ApprovalStatus } from '@prisma/client';
import type { GeneratedContent, QueuedContent, SavedVariation } from './types';

export class ContentQueueManager {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Queue generated content with variations
   */
  async queueContent(
    generated: GeneratedContent,
    options: {
      scheduledFor?: Date;
      autoApprove?: boolean;
      targetAccountIds?: Record<string, string>;
    } = {}
  ): Promise<QueuedContent> {
    const approvalStatus = options.autoApprove ? 'AUTO_APPROVED' : 'PENDING';
    const status = options.scheduledFor && options.autoApprove ? 'SCHEDULED' : 'DRAFT';

    // Extract target platforms from variations
    const targetPlatforms = generated.variations?.map(v => v.platform) || [];

    // Create content item with variations
    const contentItem = await prisma.contentItem.create({
      data: {
        brandId: this.brandId,
        content: generated.content,
        contentType: generated.contentType,
        category: generated.category,
        status,
        approvalStatus,
        targetPlatforms,
        scheduledFor: options.scheduledFor || null,
        contentVariations: generated.variations && generated.variations.length > 0 ? {
          create: generated.variations.map(v => ({
            platform: v.platform,
            text: v.content,
            hashtags: v.hashtags || [],
            characterCount: v.characterCount || v.content.length,
            isOptimal: v.isWithinLimit ?? true,
            status: 'PENDING',
            accountId: options.targetAccountIds?.[v.platform] || null,
          })),
        } : undefined,
      },
      include: {
        contentVariations: {
          include: {
            account: true,
          },
        },
      },
    });

    return {
      id: contentItem.id,
      content: contentItem.content,
      contentType: contentItem.contentType as ContentType,
      category: contentItem.category || 'general',
      status: contentItem.status as ContentStatus,
      approvalStatus: contentItem.approvalStatus as ApprovalStatus,
      scheduledFor: contentItem.scheduledFor || undefined,
      variations: contentItem.contentVariations.map(v => ({
        id: v.id,
        platform: v.platform as SocialPlatform,
        text: v.text,
        hashtags: v.hashtags,
        characterCount: v.characterCount,
        isOptimal: v.isOptimal,
        status: v.status,
        accountId: v.accountId || undefined,
      })),
      createdAt: contentItem.createdAt,
    };
  }

  /**
   * Get queue items with filtering
   */
  async getQueue(options: {
    status?: ContentStatus[];
    approvalStatus?: ApprovalStatus[];
    platforms?: SocialPlatform[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: QueuedContent[]; total: number }> {
    const { status, approvalStatus, platforms, limit = 50, offset = 0 } = options;

    // Build where clause
    const where: {
      brandId: string;
      status?: { in: ContentStatus[] };
      approvalStatus?: { in: ApprovalStatus[] };
      targetPlatforms?: { hasSome: SocialPlatform[] };
    } = { brandId: this.brandId };

    if (status && status.length > 0) {
      where.status = { in: status };
    }
    if (approvalStatus && approvalStatus.length > 0) {
      where.approvalStatus = { in: approvalStatus };
    }
    if (platforms && platforms.length > 0) {
      where.targetPlatforms = { hasSome: platforms };
    }

    // Get total count and items in parallel
    const [total, items] = await Promise.all([
      prisma.contentItem.count({ where }),
      prisma.contentItem.findMany({
        where,
        include: {
          contentVariations: {
            include: { account: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        content: item.content,
        contentType: item.contentType as ContentType,
        category: item.category || 'general',
        status: item.status as ContentStatus,
        approvalStatus: item.approvalStatus as ApprovalStatus,
        scheduledFor: item.scheduledFor || undefined,
        variations: item.contentVariations.map(v => ({
          id: v.id,
          platform: v.platform as SocialPlatform,
          text: v.text,
          hashtags: v.hashtags,
          characterCount: v.characterCount,
          isOptimal: v.isOptimal,
          status: v.status as import('@prisma/client').VariationStatus,
          accountId: v.accountId || undefined,
          postId: v.postId || undefined,
          postUrl: v.postUrl || undefined,
          publishedAt: v.publishedAt || undefined,
          error: v.error || undefined,
        })),
        createdAt: item.createdAt,
      })),
      total,
    };
  }

  /**
   * Get pending approval items
   */
  async getPendingApproval(limit: number = 20): Promise<QueuedContent[]> {
    const items = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        approvalStatus: 'PENDING',
      },
      include: {
        contentVariations: {
          include: { account: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map(item => ({
      id: item.id,
      content: item.content,
      contentType: item.contentType as ContentType,
      category: item.category || 'general',
      status: item.status as ContentStatus,
      approvalStatus: item.approvalStatus as ApprovalStatus,
      scheduledFor: item.scheduledFor || undefined,
      variations: item.contentVariations.map(v => ({
        id: v.id,
        platform: v.platform as SocialPlatform,
        text: v.text,
        hashtags: v.hashtags,
        characterCount: v.characterCount,
        isOptimal: v.isOptimal,
        status: v.status as import('@prisma/client').VariationStatus,
        accountId: v.accountId || undefined,
        postId: v.postId || undefined,
        postUrl: v.postUrl || undefined,
        publishedAt: v.publishedAt || undefined,
        error: v.error || undefined,
      })),
      createdAt: item.createdAt,
    }));
  }

  /**
   * Approve content item
   */
  async approve(contentId: string, userId: string): Promise<QueuedContent> {
    const item = await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        contentVariations: { include: { account: true } },
      },
    });

    return {
      id: item.id,
      content: item.content,
      contentType: item.contentType as ContentType,
      category: item.category || 'general',
      status: item.status as ContentStatus,
      approvalStatus: item.approvalStatus as ApprovalStatus,
      scheduledFor: item.scheduledFor || undefined,
      variations: item.contentVariations.map(v => ({
        id: v.id,
        platform: v.platform as SocialPlatform,
        text: v.text,
        hashtags: v.hashtags,
        characterCount: v.characterCount,
        isOptimal: v.isOptimal,
        status: v.status,
        accountId: v.accountId || undefined,
      })),
      createdAt: item.createdAt,
    };
  }

  /**
   * Reject content item
   */
  async reject(contentId: string, reason?: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        approvalStatus: 'REJECTED',
        status: 'FAILED',
        rejectionReason: reason,
      },
    });
  }

  /**
   * Approve a specific variation
   */
  async approveVariation(variationId: string): Promise<SavedVariation> {
    const variation = await prisma.contentVariation.update({
      where: { id: variationId },
      data: { status: 'APPROVED' },
    });

    return {
      id: variation.id,
      platform: variation.platform as SocialPlatform,
      text: variation.text,
      hashtags: variation.hashtags,
      characterCount: variation.characterCount,
      isOptimal: variation.isOptimal,
      status: variation.status as import('@prisma/client').VariationStatus,
      accountId: variation.accountId || undefined,
      postId: variation.postId || undefined,
      postUrl: variation.postUrl || undefined,
      publishedAt: variation.publishedAt || undefined,
      error: variation.error || undefined,
    };
  }

  /**
   * Skip a specific variation
   */
  async skipVariation(variationId: string): Promise<void> {
    await prisma.contentVariation.update({
      where: { id: variationId },
      data: { status: 'SKIPPED' },
    });
  }

  /**
   * Update variation content
   */
  async updateVariation(variationId: string, text: string): Promise<SavedVariation> {
    const variation = await prisma.contentVariation.update({
      where: { id: variationId },
      data: {
        text,
        characterCount: text.length,
      },
    });

    return {
      id: variation.id,
      platform: variation.platform as SocialPlatform,
      text: variation.text,
      hashtags: variation.hashtags,
      characterCount: variation.characterCount,
      isOptimal: variation.isOptimal,
      status: variation.status as import('@prisma/client').VariationStatus,
      accountId: variation.accountId || undefined,
      postId: variation.postId || undefined,
      postUrl: variation.postUrl || undefined,
      publishedAt: variation.publishedAt || undefined,
      error: variation.error || undefined,
    };
  }

  /**
   * Assign account to variation
   */
  async assignAccount(variationId: string, accountId: string): Promise<SavedVariation> {
    const variation = await prisma.contentVariation.update({
      where: { id: variationId },
      data: { accountId },
    });

    return {
      id: variation.id,
      platform: variation.platform as SocialPlatform,
      text: variation.text,
      hashtags: variation.hashtags,
      characterCount: variation.characterCount,
      isOptimal: variation.isOptimal,
      status: variation.status as import('@prisma/client').VariationStatus,
      accountId: variation.accountId || undefined,
      postId: variation.postId || undefined,
      postUrl: variation.postUrl || undefined,
      publishedAt: variation.publishedAt || undefined,
      error: variation.error || undefined,
    };
  }

  /**
   * Schedule content for a specific time
   */
  async schedule(contentId: string, scheduledFor: Date): Promise<QueuedContent> {
    const item = await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: 'SCHEDULED',
        scheduledFor,
      },
      include: {
        contentVariations: { include: { account: true } },
      },
    });

    return {
      id: item.id,
      content: item.content,
      contentType: item.contentType as ContentType,
      category: item.category || 'general',
      status: item.status as ContentStatus,
      approvalStatus: item.approvalStatus as ApprovalStatus,
      scheduledFor: item.scheduledFor || undefined,
      variations: item.contentVariations.map(v => ({
        id: v.id,
        platform: v.platform as SocialPlatform,
        text: v.text,
        hashtags: v.hashtags,
        characterCount: v.characterCount,
        isOptimal: v.isOptimal,
        status: v.status,
        accountId: v.accountId || undefined,
      })),
      createdAt: item.createdAt,
    };
  }

  /**
   * Publish content immediately
   */
  async publishNow(contentId: string): Promise<{ variationId: string; success: boolean; error?: string }[]> {
    const item = await prisma.contentItem.findUnique({
      where: { id: contentId },
      include: { contentVariations: true },
    });

    if (!item) {
      return [{ variationId: '', success: false, error: 'Content not found' }];
    }

    // Import SocialPublisher dynamically to avoid circular deps
    const { SocialPublisher } = await import('../social-publishing');
    const publisher = new SocialPublisher(item.brandId);

    const platforms = item.targetPlatforms as SocialPlatform[];
    const results = await publisher.publish(contentId, platforms);

    // Update variation statuses based on results
    for (const result of results) {
      const variation = item.contentVariations.find(v => v.platform === result.platform);
      if (variation) {
        await prisma.contentVariation.update({
          where: { id: variation.id },
          data: {
            status: result.result.success ? 'PUBLISHED' : 'FAILED',
            postId: result.result.postId || null,
            postUrl: result.result.postUrl || null,
            publishedAt: result.result.success ? new Date() : null,
            error: result.result.error || null,
          },
        });
      }
    }

    return results.map(r => ({
      variationId: item.contentVariations.find(v => v.platform === r.platform)?.id || '',
      success: r.result.success,
      error: r.result.error,
    }));
  }

  /**
   * Process scheduled content for publishing
   */
  async processScheduledContent(): Promise<number> {
    const now = new Date();

    // Find scheduled content items that are due
    const dueItems = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: 'SCHEDULED',
        approvalStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
        scheduledFor: { lte: now },
      },
      include: {
        contentVariations: true,
      },
    });

    if (dueItems.length === 0) {
      return 0;
    }

    let publishedCount = 0;

    // Process each due item
    for (const item of dueItems) {
      try {
        // Mark as publishing
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: 'PUBLISHING' },
        });

        // Publish each variation
        const results = await this.publishNow(item.id);

        // Check if any succeeded
        const anySuccess = results.some(r => r.success);

        // Update content item status
        await prisma.contentItem.update({
          where: { id: item.id },
          data: {
            status: anySuccess ? 'PUBLISHED' : 'FAILED',
            publishedAt: anySuccess ? new Date() : undefined,
          },
        });

        if (anySuccess) {
          publishedCount++;
        }
      } catch (error) {
        console.error(`Failed to process scheduled content ${item.id}:`, error);
        // Mark as failed
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return publishedCount;
  }

  /**
   * Delete content item
   */
  async delete(contentId: string): Promise<void> {
    // Delete variations first (cascade), then delete the content item
    await prisma.contentVariation.deleteMany({
      where: { contentId },
    });

    await prisma.contentItem.delete({
      where: { id: contentId },
    });
  }
}
