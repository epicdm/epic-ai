/**
 * Ad Platform Manager
 * TODO: Implement when AdAccount and AdCampaign models are complete
 */

import { prisma } from '@epic-ai/database';
import type { AdPlatform, AccountStatus } from '@prisma/client';
import { AdGenerator } from './ad-generator';
import type {
  AdAccountTokens,
  AdCampaignConfig,
  AdCreativeConfig,
  CampaignResult,
  AdMetrics,
} from './types';

export class AdPlatformManager {
  private brandId: string;
  private generator: AdGenerator;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.generator = new AdGenerator();
  }

  /**
   * Create a campaign on specified platforms
   */
  async createCampaign(
    config: AdCampaignConfig,
    _creative: AdCreativeConfig,
    platforms: AdPlatform[]
  ): Promise<{ platform: AdPlatform; result: CampaignResult }[]> {
    const results: { platform: AdPlatform; result: CampaignResult }[] = [];

    for (const platform of platforms) {
      try {
        // Get the connected ad account for this platform
        const adAccount = await prisma.adAccount.findFirst({
          where: {
            brandId: this.brandId,
            platform,
            status: 'CONNECTED',
          },
        });

        if (!adAccount) {
          results.push({
            platform,
            result: {
              success: false,
              platform,
              error: `No connected ${platform} ad account`,
            },
          });
          continue;
        }

        // Create campaign in database
        const campaign = await prisma.adCampaign.create({
          data: {
            brandId: this.brandId,
            adAccountId: adAccount.id,
            name: config.name,
            platform,
            objective: config.objective as import('@prisma/client').CampaignObjective,
            status: 'DRAFT',
            dailyBudget: config.budget.type === 'daily' ? config.budget.amount : null,
            totalBudget: config.budget.type === 'lifetime' ? config.budget.amount : null,
            currency: config.budget.currency,
            targeting: (config.targeting || {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
            startDate: config.schedule?.startDate,
            endDate: config.schedule?.endDate,
          },
        });

        results.push({
          platform,
          result: {
            success: true,
            platform,
            campaignId: campaign.id,
          },
        });
      } catch (error) {
        results.push({
          platform,
          result: {
            success: false,
            platform,
            error: error instanceof Error ? error.message : 'Failed to create campaign',
          },
        });
      }
    }

    return results;
  }

  /**
   * Create ads from content automatically
   */
  async createAdsFromContent(
    contentId: string,
    platforms: AdPlatform[],
    targetUrl: string,
    budget?: { type: 'daily' | 'lifetime'; amount: number; currency: string }
  ): Promise<{ platform: AdPlatform; result: CampaignResult }[]> {
    // Get content item
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        brand: {
          include: { brandBrain: true },
        },
      },
    });

    if (!contentItem) {
      return platforms.map(platform => ({
        platform,
        result: {
          success: false,
          platform,
          error: 'Content not found',
        },
      }));
    }

    // Generate ad from content using AI
    const { campaign, creative } = await this.generator.generateAd({
      content: {
        id: contentItem.id,
        content: contentItem.content,
        mediaUrls: contentItem.mediaUrls || undefined,
        mediaType: contentItem.mediaType || undefined,
      },
      brandBrain: {
        id: contentItem.brand.brandBrain?.id || '',
        voiceTone: contentItem.brand.brandBrain?.voiceTone || undefined,
        keyMessages: contentItem.brand.brandBrain?.keyMessages || undefined,
      },
      objective: 'LEADS',
      targetUrl,
      budget,
    });

    // Create campaign on all platforms
    return this.createCampaign(campaign, creative, platforms);
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      });
      return true;
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      return false;
    }
  }

  /**
   * Resume a campaign
   */
  async resumeCampaign(campaignId: string): Promise<boolean> {
    try {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
      return true;
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      return false;
    }
  }

  /**
   * Sync metrics for all active campaigns
   */
  async syncMetrics(): Promise<void> {
    try {
      const campaigns = await prisma.adCampaign.findMany({
        where: {
          brandId: this.brandId,
          status: 'ACTIVE',
        },
        include: {
          adAccount: true,
        },
      });

      console.log(`Syncing metrics for ${campaigns.length} campaigns for brand ${this.brandId}`);

      // In a real implementation, you would call the platform APIs here
      // For now, we just update the lastSync timestamp on the ad accounts
      const accountIds = [...new Set(campaigns.map(c => c.adAccountId).filter(Boolean))];

      for (const accountId of accountIds) {
        if (accountId) {
          await prisma.adAccount.update({
            where: { id: accountId },
            data: { lastSync: new Date() },
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync metrics:', error);
    }
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(
    campaignId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<AdMetrics | null> {
    try {
      const campaign = await prisma.adCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) return null;

      // Return metrics from the campaign record
      const spend = Number(campaign.spend);
      return {
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        spend,
        ctr: campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0,
        cpc: campaign.clicks > 0 ? spend / campaign.clicks : 0,
        cpm: campaign.impressions > 0 ? (spend / campaign.impressions) * 1000 : 0,
        conversions: campaign.leads,
        costPerConversion: campaign.leads > 0 ? spend / campaign.leads : undefined,
      };
    } catch (error) {
      console.error('Failed to get campaign metrics:', error);
      return null;
    }
  }

  /**
   * Connect a new ad account
   */
  static async connectAccount(
    brandId: string,
    platform: AdPlatform,
    tokens: AdAccountTokens,
    accountInfo: {
      platformAccountId: string;
      accountName: string;
      currency?: string;
      pageId?: string;
    }
  ): Promise<{ id: string; brandId: string; platform: AdPlatform; accountName: string }> {
    // Check if account already exists
    const existing = await prisma.adAccount.findFirst({
      where: {
        brandId,
        platform,
        accountId: accountInfo.platformAccountId,
      },
    });

    if (existing) {
      // Update existing account
      const updated = await prisma.adAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiresAt,
          accountName: accountInfo.accountName,
          status: 'CONNECTED' as AccountStatus,
        },
      });
      return { id: updated.id, brandId: updated.brandId, platform: updated.platform, accountName: updated.accountName };
    }

    // Create new account
    const created = await prisma.adAccount.create({
      data: {
        brandId,
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.expiresAt,
        accountId: accountInfo.platformAccountId,
        accountName: accountInfo.accountName,
      },
    });

    return { id: created.id, brandId: created.brandId, platform: created.platform, accountName: created.accountName };
  }

  /**
   * Disconnect an ad account
   */
  static async disconnectAccount(accountId: string): Promise<void> {
    await prisma.adAccount.update({
      where: { id: accountId },
      data: { status: 'DISCONNECTED' as AccountStatus },
    });
  }

  /**
   * Get all connected ad accounts for a brand
   */
  static async getAccounts(brandId: string) {
    return prisma.adAccount.findMany({
      where: {
        brandId,
        status: 'CONNECTED' as AccountStatus,
      },
    });
  }
}
