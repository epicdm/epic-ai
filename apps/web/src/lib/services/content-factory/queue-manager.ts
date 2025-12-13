/**
 * Content Queue Manager - Handles content queuing and variation management
 *
 * Manages:
 * - Creating content items with variations
 * - Approval workflow
 * - Scheduling
 * - Publishing coordination
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, ContentType, ContentStatus, ApprovalStatus, VariationStatus } from '@prisma/client';
import { SocialPublisher } from '../social-publishing';
import type { GeneratedContent, PlatformVariation, QueuedContent, SavedVariation } from './types';
import { PLATFORM_BEST_PRACTICES } from './types';

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
      targetAccountIds?: Record<SocialPlatform, string>;
    } = {}
  ): Promise<QueuedContent> {
    const { scheduledFor, autoApprove = false, targetAccountIds = {} } = options;

    // Determine status based on options
    const status: ContentStatus = scheduledFor ? 'SCHEDULED' : 'PENDING';
    const approvalStatus: ApprovalStatus = autoApprove ? 'AUTO_APPROVED' : 'PENDING';

    // Create content item with variations
    const contentItem = await prisma.contentItem.create({
      data: {
        brandId: this.brandId,
        content: generated.content,
        contentType: generated.contentType,
        category: generated.category,
        status,
        approvalStatus,
        scheduledFor,
        targetPlatforms: generated.variations.map((v) => v.platform),
        hashtags: generated.suggestedHashtags,
        variations: generated.variations as object, // Legacy JSON field
        generatedFrom: {
          type: 'content_factory',
          timestamp: new Date().toISOString(),
        },
        aiModel: 'gpt-4o',
        contentVariations: {
          create: generated.variations.map((variation) => ({
            platform: variation.platform,
            text: variation.content,
            hashtags: variation.hashtags,
            characterCount: variation.characterCount,
            isOptimal: this.isOptimalForPlatform(variation),
            status: autoApprove ? 'APPROVED' : 'PENDING',
            accountId: targetAccountIds[variation.platform] || null,
            mediaPrompt: variation.mediaPrompt || null,
          })),
        },
      },
      include: {
        contentVariations: true,
      },
    });

    return this.toQueuedContent(contentItem);
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
    const { status, approvalStatus, platforms, limit = 20, offset = 0 } = options;

    const where = {
      brandId: this.brandId,
      ...(status && { status: { in: status } }),
      ...(approvalStatus && { approvalStatus: { in: approvalStatus } }),
      ...(platforms && {
        contentVariations: {
          some: { platform: { in: platforms } },
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.contentItem.findMany({
        where,
        include: {
          contentVariations: true,
        },
        orderBy: [
          { scheduledFor: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.contentItem.count({ where }),
    ]);

    return {
      items: items.map(this.toQueuedContent),
      total,
    };
  }

  /**
   * Get pending approval items
   */
  async getPendingApproval(limit: number = 20): Promise<QueuedContent[]> {
    const result = await this.getQueue({
      approvalStatus: ['PENDING'],
      status: ['DRAFT', 'PENDING'],
      limit,
    });
    return result.items;
  }

  /**
   * Approve content item
   */
  async approve(contentId: string, userId: string): Promise<QueuedContent> {
    const item = await prisma.contentItem.update({
      where: { id: contentId, brandId: this.brandId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        status: 'SCHEDULED',
        contentVariations: {
          updateMany: {
            where: { status: 'PENDING' },
            data: { status: 'APPROVED' },
          },
        },
      },
      include: {
        contentVariations: true,
      },
    });

    return this.toQueuedContent(item);
  }

  /**
   * Reject content item
   */
  async reject(contentId: string, reason?: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId, brandId: this.brandId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason,
        status: 'ARCHIVED',
        contentVariations: {
          updateMany: {
            where: {},
            data: { status: 'SKIPPED' },
          },
        },
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

    return this.toSavedVariation(variation);
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
    const hashtags = text.match(/#\w+/g) || [];

    const variation = await prisma.contentVariation.update({
      where: { id: variationId },
      data: {
        text,
        hashtags,
        characterCount: text.length,
      },
    });

    return this.toSavedVariation(variation);
  }

  /**
   * Assign account to variation
   */
  async assignAccount(variationId: string, accountId: string): Promise<SavedVariation> {
    const variation = await prisma.contentVariation.update({
      where: { id: variationId },
      data: { accountId },
    });

    return this.toSavedVariation(variation);
  }

  /**
   * Schedule content for a specific time
   */
  async schedule(contentId: string, scheduledFor: Date): Promise<QueuedContent> {
    const item = await prisma.contentItem.update({
      where: { id: contentId, brandId: this.brandId },
      data: {
        scheduledFor,
        status: 'SCHEDULED',
      },
      include: {
        contentVariations: true,
      },
    });

    return this.toQueuedContent(item);
  }

  /**
   * Publish content immediately
   */
  async publishNow(contentId: string): Promise<{ variationId: string; success: boolean; error?: string }[]> {
    const content = await prisma.contentItem.findUnique({
      where: { id: contentId, brandId: this.brandId },
      include: {
        contentVariations: {
          where: {
            status: { in: ['APPROVED', 'SCHEDULED'] },
            accountId: { not: null },
          },
          include: { account: true },
        },
      },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    const results: { variationId: string; success: boolean; error?: string }[] = [];

    for (const variation of content.contentVariations) {
      if (!variation.account) continue;

      try {
        await this.publishVariation(variation);
        results.push({ variationId: variation.id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ variationId: variation.id, success: false, error: errorMessage });
      }
    }

    // Update content status
    const allSucceeded = results.every((r) => r.success);
    const someSucceeded = results.some((r) => r.success);

    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: allSucceeded ? 'PUBLISHED' : someSucceeded ? 'PARTIALLY_PUBLISHED' : 'FAILED',
        publishedAt: someSucceeded ? new Date() : undefined,
      },
    });

    return results;
  }

  /**
   * Publish a specific variation
   */
  private async publishVariation(variation: {
    id: string;
    platform: SocialPlatform;
    text: string;
    hashtags: string[];
    mediaUrl: string | null;
    account: { id: string; platform: SocialPlatform; accessToken: string; refreshToken: string | null; tokenExpires: Date | null } | null;
  }): Promise<void> {
    if (!variation.account) {
      throw new Error('No account assigned to variation');
    }

    await prisma.contentVariation.update({
      where: { id: variation.id },
      data: { status: 'PUBLISHING' },
    });

    try {
      const publisher = new SocialPublisher(this.brandId);

      // The publisher needs the content item, so we'll use the variation data directly
      // For now, we update the variation with post details after publishing

      // This is a simplified implementation - full implementation would use the platform clients directly
      const result = await this.publishToPlatform(variation);

      await prisma.contentVariation.update({
        where: { id: variation.id },
        data: {
          status: 'PUBLISHED',
          postId: result.postId,
          postUrl: result.postUrl,
          publishedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.contentVariation.update({
        where: { id: variation.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Direct platform publishing for a variation
   */
  private async publishToPlatform(variation: {
    platform: SocialPlatform;
    text: string;
    hashtags: string[];
    mediaUrl: string | null;
    account: { id: string; accessToken: string; refreshToken: string | null; tokenExpires: Date | null };
  }): Promise<{ postId?: string; postUrl?: string }> {
    // Import platform clients
    const { TwitterClient } = await import('../social-publishing/clients/twitter');
    const { LinkedInClient } = await import('../social-publishing/clients/linkedin');
    const { MetaClient } = await import('../social-publishing/clients/meta');

    const tokens = {
      accessToken: variation.account.accessToken,
      refreshToken: variation.account.refreshToken || undefined,
      expiresAt: variation.account.tokenExpires || undefined,
    };

    const content = variation.text;
    const mediaUrls = variation.mediaUrl ? [variation.mediaUrl] : undefined;

    switch (variation.platform) {
      case 'TWITTER': {
        const client = new TwitterClient(tokens);
        const result = await client.publish({ content, mediaUrls });
        return { postId: result.postId, postUrl: result.postUrl };
      }

      case 'LINKEDIN': {
        const client = new LinkedInClient(tokens);
        const result = await client.publish({ content, mediaUrls });
        return { postId: result.postId, postUrl: result.postUrl };
      }

      case 'FACEBOOK': {
        const client = new MetaClient(tokens, 'FACEBOOK');
        const result = await client.publish({ content, mediaUrls });
        return { postId: result.postId, postUrl: result.postUrl };
      }

      case 'INSTAGRAM': {
        const client = new MetaClient(tokens, 'INSTAGRAM');
        const result = await client.publish({ content, mediaUrls, mediaType: 'image' });
        return { postId: result.postId, postUrl: result.postUrl };
      }

      default:
        throw new Error(`Unsupported platform: ${variation.platform}`);
    }
  }

  /**
   * Process scheduled content for publishing
   */
  async processScheduledContent(): Promise<number> {
    const now = new Date();

    // Find content ready to publish
    const scheduledItems = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: 'SCHEDULED',
        approvalStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
        scheduledFor: { lte: now },
      },
      include: {
        contentVariations: {
          where: {
            status: { in: ['APPROVED', 'SCHEDULED'] },
            accountId: { not: null },
          },
          include: { account: true },
        },
      },
    });

    let publishedCount = 0;

    for (const item of scheduledItems) {
      try {
        const results = await this.publishNow(item.id);
        if (results.some((r) => r.success)) {
          publishedCount++;
        }
      } catch (error) {
        console.error(`Failed to publish content ${item.id}:`, error);
      }
    }

    return publishedCount;
  }

  /**
   * Delete content item
   */
  async delete(contentId: string): Promise<void> {
    await prisma.contentItem.delete({
      where: { id: contentId, brandId: this.brandId },
    });
  }

  // Helper methods

  private isOptimalForPlatform(variation: PlatformVariation): boolean {
    const practices = PLATFORM_BEST_PRACTICES[variation.platform];
    if (!practices) return true;

    return (
      variation.characterCount <= practices.optimalLength &&
      variation.hashtags.length <= practices.hashtagLimit
    );
  }

  private toQueuedContent(item: {
    id: string;
    content: string;
    contentType: ContentType;
    category: string | null;
    status: ContentStatus;
    approvalStatus: ApprovalStatus;
    scheduledFor: Date | null;
    createdAt: Date;
    contentVariations: Array<{
      id: string;
      platform: SocialPlatform;
      text: string;
      hashtags: string[];
      characterCount: number;
      isOptimal: boolean;
      status: VariationStatus;
      accountId: string | null;
      postId: string | null;
      postUrl: string | null;
      publishedAt: Date | null;
      error: string | null;
    }>;
  }): QueuedContent {
    return {
      id: item.id,
      content: item.content,
      contentType: item.contentType,
      category: item.category || 'general',
      status: item.status,
      approvalStatus: item.approvalStatus,
      scheduledFor: item.scheduledFor || undefined,
      variations: item.contentVariations.map(this.toSavedVariation),
      createdAt: item.createdAt,
    };
  }

  private toSavedVariation(v: {
    id: string;
    platform: SocialPlatform;
    text: string;
    hashtags: string[];
    characterCount: number;
    isOptimal: boolean;
    status: VariationStatus;
    accountId: string | null;
    postId: string | null;
    postUrl: string | null;
    publishedAt: Date | null;
    error: string | null;
  }): SavedVariation {
    return {
      id: v.id,
      platform: v.platform,
      text: v.text,
      hashtags: v.hashtags,
      characterCount: v.characterCount,
      isOptimal: v.isOptimal,
      status: v.status,
      accountId: v.accountId || undefined,
      postId: v.postId || undefined,
      postUrl: v.postUrl || undefined,
      publishedAt: v.publishedAt || undefined,
      error: v.error || undefined,
    };
  }
}
