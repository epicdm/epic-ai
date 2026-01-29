/**
 * Content Scheduler - Manages content calendar and scheduling
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, ContentStatus, ApprovalStatus, ApprovalMode } from '@prisma/client';
import { ContentGenerator } from './generator';
import type { GeneratedContent, ContentCalendarSlot } from './types';

export class ContentScheduler {
  private brandId: string;
  private generator: ContentGenerator;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.generator = new ContentGenerator(brandId);
  }

  /**
   * Generate and schedule content for the week
   */
  async generateWeeklyContent(): Promise<string[]> {
    // Get autopilot config
    const config = await prisma.autopilotConfig.findUnique({
      where: { brandId: this.brandId },
    });

    if (!config || !config.enabled) {
      throw new Error('Autopilot not enabled for this brand');
    }

    // Calculate slots for the week
    const slots = this.calculateWeeklySlots(config);

    // Generate content for each slot
    const contentIds: string[] = [];

    for (const slot of slots) {
      try {
        const generated = await this.generator.generate({
          brandId: this.brandId,
          contentType: 'POST',
          targetPlatforms: [slot.platform],
          category: slot.category,
          includeImage: config.generateImages,
        });

        // Generate image if enabled
        let imageUrl: string | undefined;
        if (config.generateImages) {
          const imagePrompt = await this.generator.generateImagePrompt(
            generated.content,
            config.imageStyle
          );
          imageUrl = await this.generator.generateImage(imagePrompt);
        }

        // Save to database
        const contentItem = await this.saveContentItem(
          generated,
          slot,
          config.approvalMode,
          imageUrl
        );

        contentIds.push(contentItem.id);
      } catch (error) {
        console.error(`Failed to generate content for slot:`, slot, error);
      }
    }

    return contentIds;
  }

  /**
   * Get pending content for approval
   */
  async getPendingApproval(limit: number = 20): Promise<unknown[]> {
    return prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        approvalStatus: 'PENDING',
        status: { in: ['DRAFT', 'PENDING'] },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });
  }

  /**
   * Approve content
   */
  async approveContent(contentId: string, userId: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        status: 'SCHEDULED',
      },
    });
  }

  /**
   * Reject content
   */
  async rejectContent(contentId: string, reason?: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason,
        status: 'ARCHIVED',
      },
    });
  }

  /**
   * Get content due for publishing
   */
  async getContentDueForPublishing(): Promise<unknown[]> {
    const now = new Date();

    return prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: 'SCHEDULED',
        approvalStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
        scheduledFor: { lte: now },
      },
      include: {
        brand: {
          include: {
            socialAccounts: {
              where: { status: 'CONNECTED' },
            },
          },
        },
      },
    });
  }

  /**
   * Reschedule content to a new time
   */
  async rescheduleContent(contentId: string, newDate: Date): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        scheduledFor: newDate,
        status: 'SCHEDULED',
      },
    });
  }

  /**
   * Get upcoming scheduled content
   */
  async getUpcomingContent(days: number = 7): Promise<unknown[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: { in: ['SCHEDULED', 'PENDING', 'APPROVED'] },
        scheduledFor: {
          gte: now,
          lte: future,
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /**
   * Get content calendar for a date range
   */
  async getCalendar(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; items: unknown[] }>> {
    const content = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Group by date
    const calendar = new Map<string, unknown[]>();

    for (const item of content) {
      if (item.scheduledFor) {
        const dateKey = item.scheduledFor.toISOString().split('T')[0];
        if (!calendar.has(dateKey)) {
          calendar.set(dateKey, []);
        }
        calendar.get(dateKey)!.push(item);
      }
    }

    return Array.from(calendar.entries()).map(([date, items]) => ({
      date: new Date(date),
      items,
    }));
  }

  // Private methods

  private calculateWeeklySlots(config: {
    postsPerWeek: number;
    postingDays: number[];
    postingTimesUtc: string[];
    enabledPlatforms: SocialPlatform[];
    contentMix: unknown;
  }): ContentCalendarSlot[] {
    const slots: ContentCalendarSlot[] = [];
    const now = new Date();
    const contentMix = config.contentMix as Record<string, number>;

    // Calculate posts per day
    const postsPerDay = Math.ceil(config.postsPerWeek / config.postingDays.length);

    // Get categories based on content mix
    const categories = this.getWeightedCategories(contentMix, config.postsPerWeek);

    let categoryIndex = 0;

    // For each posting day this week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();

      if (!config.postingDays.includes(dayOfWeek)) continue;

      // For each posting time
      for (let i = 0; i < Math.min(postsPerDay, config.postingTimesUtc.length); i++) {
        const time = config.postingTimesUtc[i];
        const platform = config.enabledPlatforms[i % config.enabledPlatforms.length];
        const category = categories[categoryIndex % categories.length];

        const [hours, minutes] = time.split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setUTCHours(hours, minutes, 0, 0);

        // Only schedule future slots
        if (slotDate > now) {
          slots.push({
            date: slotDate,
            time,
            platform,
            category,
          });
          categoryIndex++;
        }
      }
    }

    return slots.slice(0, config.postsPerWeek);
  }

  private getWeightedCategories(mix: Record<string, number>, count: number): string[] {
    const categories: string[] = [];
    const total = Object.values(mix).reduce((sum, val) => sum + val, 0);

    for (const [category, weight] of Object.entries(mix)) {
      const categoryCount = Math.round((weight / total) * count);
      for (let i = 0; i < categoryCount; i++) {
        categories.push(category);
      }
    }

    // Shuffle for variety
    return categories.sort(() => Math.random() - 0.5);
  }

  private async saveContentItem(
    generated: GeneratedContent,
    slot: ContentCalendarSlot,
    approvalMode: ApprovalMode,
    imageUrl?: string
  ): Promise<{ id: string }> {
    const status: ContentStatus =
      approvalMode === 'AUTO_POST' ? 'SCHEDULED' : approvalMode === 'AUTO_QUEUE' ? 'PENDING' : 'DRAFT';

    const approvalStatus: ApprovalStatus =
      approvalMode === 'AUTO_POST' ? 'AUTO_APPROVED' : 'PENDING';

    return prisma.contentItem.create({
      data: {
        brandId: this.brandId,
        content: generated.content,
        mediaUrls: imageUrl ? [imageUrl] : [],
        mediaType: imageUrl ? 'image' : null,
        variations: generated.variations as object,
        contentType: generated.contentType,
        category: generated.category,
        status,
        approvalStatus,
        scheduledFor: slot.date,
        targetPlatforms: [slot.platform],
        generatedFrom: {
          type: 'autopilot',
          category: slot.category,
          timestamp: new Date().toISOString(),
        },
        aiModel: 'gpt-4o',
      },
      select: { id: true },
    });
  }
}
