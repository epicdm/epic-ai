/**
 * Meta Ads Client
 * Integration with Meta Marketing API for Facebook/Instagram ads
 *
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

import type {
  AdAccountTokens,
  AdAccountInfo,
  AdCampaignConfig,
  AdCreativeConfig,
  CampaignResult,
  AdMetrics,
  AdPlatformClient,
  CampaignObjective,
  CallToAction,
} from '../types';

const API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Map our objectives to Meta's
const OBJECTIVE_MAP: Record<CampaignObjective, string> = {
  AWARENESS: 'OUTCOME_AWARENESS',
  TRAFFIC: 'OUTCOME_TRAFFIC',
  ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  LEADS: 'OUTCOME_LEADS',
  APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
  SALES: 'OUTCOME_SALES',
};

// Map our CTAs to Meta's
const CTA_MAP: Record<CallToAction, string> = {
  LEARN_MORE: 'LEARN_MORE',
  SHOP_NOW: 'SHOP_NOW',
  SIGN_UP: 'SIGN_UP',
  BOOK_NOW: 'BOOK_TRAVEL',
  CONTACT_US: 'CONTACT_US',
  GET_QUOTE: 'GET_QUOTE',
  DOWNLOAD: 'DOWNLOAD',
  APPLY_NOW: 'APPLY_NOW',
  SUBSCRIBE: 'SUBSCRIBE',
};

export class MetaAdsClient implements AdPlatformClient {
  platform = 'META' as const;
  private accessToken: string;
  private adAccountId: string;
  private pageId?: string;

  constructor(
    tokens: AdAccountTokens,
    adAccountId: string,
    pageId?: string
  ) {
    this.accessToken = tokens.accessToken;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
  }

  async createCampaign(config: AdCampaignConfig): Promise<CampaignResult> {
    try {
      // Create campaign
      const campaignResponse = await fetch(
        `${BASE_URL}/act_${this.adAccountId}/campaigns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: config.name,
            objective: OBJECTIVE_MAP[config.objective],
            status: 'PAUSED', // Start paused for review
            special_ad_categories: [],
            access_token: this.accessToken,
          }),
        }
      );

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json();
        return {
          success: false,
          platform: 'META',
          error: error.error?.message || 'Failed to create campaign',
        };
      }

      const campaign = await campaignResponse.json();

      // Create ad set
      const adSetResponse = await fetch(
        `${BASE_URL}/act_${this.adAccountId}/adsets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${config.name} - Ad Set`,
            campaign_id: campaign.id,
            billing_event: 'IMPRESSIONS',
            optimization_goal: this.getOptimizationGoal(config.objective),
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            daily_budget: config.budget.type === 'daily' ? config.budget.amount : undefined,
            lifetime_budget: config.budget.type === 'lifetime' ? config.budget.amount : undefined,
            start_time: config.schedule?.startDate?.toISOString(),
            end_time: config.schedule?.endDate?.toISOString(),
            targeting: this.buildTargeting(config.targeting),
            status: 'PAUSED',
            access_token: this.accessToken,
          }),
        }
      );

      if (!adSetResponse.ok) {
        const error = await adSetResponse.json();
        return {
          success: false,
          platform: 'META',
          campaignId: campaign.id,
          error: error.error?.message || 'Failed to create ad set',
        };
      }

      const adSet = await adSetResponse.json();

      return {
        success: true,
        platform: 'META',
        campaignId: campaign.id,
        adSetId: adSet.id,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'META',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createAd(
    campaignId: string,
    creative: AdCreativeConfig
  ): Promise<CampaignResult> {
    try {
      // Get ad set for this campaign
      const adSetsResponse = await fetch(
        `${BASE_URL}/${campaignId}/adsets?access_token=${this.accessToken}`
      );
      const adSets = await adSetsResponse.json();

      if (!adSets.data?.length) {
        return {
          success: false,
          platform: 'META',
          campaignId,
          error: 'No ad set found for campaign',
        };
      }

      const adSetId = adSets.data[0].id;

      // Upload images if needed
      let imageHash: string | undefined;
      if (creative.mediaUrls?.length && creative.format !== 'SINGLE_VIDEO') {
        imageHash = await this.uploadImage(creative.mediaUrls[0]);
      }

      // Create ad creative
      const creativeResponse = await fetch(
        `${BASE_URL}/act_${this.adAccountId}/adcreatives`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Creative for ${campaignId}`,
            object_story_spec: {
              page_id: this.pageId,
              link_data: {
                link: creative.linkUrl,
                message: creative.primaryText,
                name: creative.headline,
                description: creative.description,
                call_to_action: {
                  type: CTA_MAP[creative.callToAction],
                  value: { link: creative.linkUrl },
                },
                image_hash: imageHash,
              },
            },
            access_token: this.accessToken,
          }),
        }
      );

      if (!creativeResponse.ok) {
        const error = await creativeResponse.json();
        return {
          success: false,
          platform: 'META',
          campaignId,
          adSetId,
          error: error.error?.message || 'Failed to create creative',
        };
      }

      const adCreative = await creativeResponse.json();

      // Create ad
      const adResponse = await fetch(
        `${BASE_URL}/act_${this.adAccountId}/ads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Ad for ${campaignId}`,
            adset_id: adSetId,
            creative: { creative_id: adCreative.id },
            status: 'PAUSED',
            access_token: this.accessToken,
          }),
        }
      );

      if (!adResponse.ok) {
        const error = await adResponse.json();
        return {
          success: false,
          platform: 'META',
          campaignId,
          adSetId,
          error: error.error?.message || 'Failed to create ad',
        };
      }

      const ad = await adResponse.json();

      return {
        success: true,
        platform: 'META',
        campaignId,
        adSetId,
        adId: ad.id,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'META',
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAUSED',
          access_token: this.accessToken,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async resumeCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ACTIVE',
          access_token: this.accessToken,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${BASE_URL}/${campaignId}?access_token=${this.accessToken}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AdMetrics> {
    const response = await fetch(
      `${BASE_URL}/${campaignId}/insights?` +
        new URLSearchParams({
          fields: 'impressions,reach,clicks,ctr,spend,cpc,cpm,conversions,cost_per_conversion',
          time_range: JSON.stringify({
            since: startDate.toISOString().split('T')[0],
            until: endDate.toISOString().split('T')[0],
          }),
          access_token: this.accessToken,
        })
    );

    if (!response.ok) {
      return {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spend: 0,
        cpc: 0,
        cpm: 0,
      };
    }

    const data = await response.json();
    const insights = data.data?.[0] || {};

    return {
      impressions: parseInt(insights.impressions || '0'),
      reach: parseInt(insights.reach || '0'),
      clicks: parseInt(insights.clicks || '0'),
      ctr: parseFloat(insights.ctr || '0'),
      spend: Math.round(parseFloat(insights.spend || '0') * 100), // Convert to cents
      cpc: Math.round(parseFloat(insights.cpc || '0') * 100),
      cpm: Math.round(parseFloat(insights.cpm || '0') * 100),
      conversions: parseInt(insights.conversions || '0'),
      costPerConversion: insights.cost_per_conversion
        ? Math.round(parseFloat(insights.cost_per_conversion) * 100)
        : undefined,
    };
  }

  async getAccountInfo(): Promise<AdAccountInfo> {
    const response = await fetch(
      `${BASE_URL}/act_${this.adAccountId}?` +
        new URLSearchParams({
          fields: 'name,currency,timezone_name,account_status',
          access_token: this.accessToken,
        })
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ad account info');
    }

    const data = await response.json();

    return {
      platformAccountId: this.adAccountId,
      accountName: data.name,
      currency: data.currency,
      timezone: data.timezone_name,
      status: this.mapAccountStatus(data.account_status),
    };
  }

  async refreshTokenIfNeeded(): Promise<AdAccountTokens | null> {
    // Meta tokens are long-lived (60 days), refresh through the same flow
    try {
      const response = await fetch(
        `${BASE_URL}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: process.env.META_APP_ID || '',
            client_secret: process.env.META_APP_SECRET || '',
            fb_exchange_token: this.accessToken,
          })
      );

      if (!response.ok) return null;

      const data = await response.json();
      this.accessToken = data.access_token;

      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
      };
    } catch {
      return null;
    }
  }

  private getOptimizationGoal(objective: CampaignObjective): string {
    const goalMap: Record<CampaignObjective, string> = {
      AWARENESS: 'REACH',
      TRAFFIC: 'LINK_CLICKS',
      ENGAGEMENT: 'POST_ENGAGEMENT',
      LEADS: 'LEAD_GENERATION',
      APP_PROMOTION: 'APP_INSTALLS',
      SALES: 'OFFSITE_CONVERSIONS',
    };
    return goalMap[objective];
  }

  private buildTargeting(targeting: AdCampaignConfig['targeting']): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (targeting.locations?.length) {
      result.geo_locations = {
        countries: targeting.locations
          .filter((l) => l.type === 'country')
          .map((l) => l.value),
        regions: targeting.locations
          .filter((l) => l.type === 'region')
          .map((l) => ({ key: l.value })),
        cities: targeting.locations
          .filter((l) => l.type === 'city')
          .map((l) => ({ key: l.value })),
      };
    }

    if (targeting.ageRange) {
      result.age_min = targeting.ageRange.min;
      result.age_max = targeting.ageRange.max;
    }

    if (targeting.genders?.length && !targeting.genders.includes('all')) {
      result.genders = targeting.genders.map((g) => (g === 'male' ? 1 : 2));
    }

    if (targeting.interests?.length) {
      result.interests = targeting.interests.map((id) => ({ id }));
    }

    if (targeting.customAudiences?.length) {
      result.custom_audiences = targeting.customAudiences.map((id) => ({ id }));
    }

    if (targeting.devices?.length) {
      result.device_platforms = targeting.devices;
    }

    return result;
  }

  private async uploadImage(url: string): Promise<string> {
    // Download image
    const imageResponse = await fetch(url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');

    // Upload to Meta
    const uploadResponse = await fetch(
      `${BASE_URL}/act_${this.adAccountId}/adimages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bytes: base64,
          access_token: this.accessToken,
        }),
      }
    );

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await uploadResponse.json();
    const images = data.images || {};
    const firstImage = Object.values(images)[0] as { hash: string } | undefined;
    return firstImage?.hash || '';
  }

  private mapAccountStatus(status: number): AdAccountInfo['status'] {
    // Map Meta status codes to our AccountStatus enum
    // 1 = Active, others are various disabled/pending states
    if (status === 1) {
      return 'CONNECTED';
    }
    return 'DISCONNECTED';
  }

  /**
   * Get available ad accounts for a user
   */
  static async getAdAccounts(
    userAccessToken: string
  ): Promise<{ id: string; name: string; currency: string }[]> {
    const response = await fetch(
      `${BASE_URL}/me/adaccounts?` +
        new URLSearchParams({
          fields: 'id,name,currency',
          access_token: userAccessToken,
        })
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ad accounts');
    }

    const data = await response.json();
    return (data.data || []).map(
      (account: { id: string; name: string; currency: string }) => ({
        id: account.id.replace('act_', ''),
        name: account.name,
        currency: account.currency,
      })
    );
  }
}
