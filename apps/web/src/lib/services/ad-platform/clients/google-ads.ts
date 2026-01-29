/**
 * Google Ads Client
 * Integration with Google Ads API
 *
 * Docs: https://developers.google.com/google-ads/api/docs/start
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
} from '../types';

const API_VERSION = 'v15';
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

// Map our objectives to Google's campaign types
const CAMPAIGN_TYPE_MAP: Record<CampaignObjective, string> = {
  AWARENESS: 'DISPLAY',
  TRAFFIC: 'SEARCH',
  ENGAGEMENT: 'DISPLAY',
  LEADS: 'SEARCH',
  APP_PROMOTION: 'APP',
  SALES: 'SHOPPING',
};

export class GoogleAdsClient implements AdPlatformClient {
  platform = 'GOOGLE' as const;
  private accessToken: string;
  private refreshToken?: string;
  private customerId: string;
  private developerToken: string;

  constructor(
    tokens: AdAccountTokens,
    customerId: string
  ) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.customerId = customerId.replace(/-/g, ''); // Remove dashes
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'login-customer-id': this.customerId,
    };
  }

  async createCampaign(config: AdCampaignConfig): Promise<CampaignResult> {
    try {
      // Create budget
      const budgetResponse = await fetch(
        `${BASE_URL}/customers/${this.customerId}/campaignBudgets:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                create: {
                  name: `Budget - ${config.name}`,
                  amountMicros: config.budget.amount * 10000, // Convert cents to micros
                  deliveryMethod: 'STANDARD',
                  ...(config.budget.type === 'lifetime' && {
                    totalAmountMicros: config.budget.amount * 10000,
                  }),
                },
              },
            ],
          }),
        }
      );

      if (!budgetResponse.ok) {
        const error = await budgetResponse.json();
        return {
          success: false,
          platform: 'GOOGLE',
          error: error.error?.message || 'Failed to create budget',
        };
      }

      const budgetResult = await budgetResponse.json();
      const budgetResourceName = budgetResult.results[0].resourceName;

      // Create campaign
      const campaignResponse = await fetch(
        `${BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                create: {
                  name: config.name,
                  advertisingChannelType: CAMPAIGN_TYPE_MAP[config.objective],
                  status: 'PAUSED',
                  campaignBudget: budgetResourceName,
                  biddingStrategyType: 'MAXIMIZE_CLICKS',
                  startDate: config.schedule?.startDate
                    ? this.formatDate(config.schedule.startDate)
                    : undefined,
                  endDate: config.schedule?.endDate
                    ? this.formatDate(config.schedule.endDate)
                    : undefined,
                  networkSettings: {
                    targetGoogleSearch: true,
                    targetSearchNetwork: true,
                    targetContentNetwork: config.objective === 'AWARENESS',
                  },
                },
              },
            ],
          }),
        }
      );

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json();
        return {
          success: false,
          platform: 'GOOGLE',
          error: error.error?.message || 'Failed to create campaign',
        };
      }

      const campaignResult = await campaignResponse.json();
      const campaignResourceName = campaignResult.results[0].resourceName;
      const campaignId = campaignResourceName.split('/').pop();

      // Create ad group
      const adGroupResponse = await fetch(
        `${BASE_URL}/customers/${this.customerId}/adGroups:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                create: {
                  name: `${config.name} - Ad Group`,
                  campaign: campaignResourceName,
                  type: 'SEARCH_STANDARD',
                  status: 'ENABLED',
                  cpcBidMicros: 1000000, // $1 default bid
                },
              },
            ],
          }),
        }
      );

      if (!adGroupResponse.ok) {
        const error = await adGroupResponse.json();
        return {
          success: false,
          platform: 'GOOGLE',
          campaignId,
          error: error.error?.message || 'Failed to create ad group',
        };
      }

      const adGroupResult = await adGroupResponse.json();
      const adGroupId = adGroupResult.results[0].resourceName.split('/').pop();

      // Add keywords if provided
      if (config.targeting.keywords?.length) {
        await this.addKeywords(
          adGroupResult.results[0].resourceName,
          config.targeting.keywords
        );
      }

      return {
        success: true,
        platform: 'GOOGLE',
        campaignId,
        adSetId: adGroupId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'GOOGLE',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createAd(
    campaignId: string,
    creative: AdCreativeConfig
  ): Promise<CampaignResult> {
    try {
      // Get ad group for this campaign
      const query = `
        SELECT ad_group.resource_name, ad_group.id
        FROM ad_group
        WHERE campaign.id = ${campaignId}
        LIMIT 1
      `;

      const searchResponse = await fetch(
        `${BASE_URL}/customers/${this.customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ query }),
        }
      );

      if (!searchResponse.ok) {
        return {
          success: false,
          platform: 'GOOGLE',
          campaignId,
          error: 'Failed to find ad group',
        };
      }

      const searchResult = await searchResponse.json();
      const adGroupResourceName = searchResult.results?.[0]?.adGroup?.resourceName;

      if (!adGroupResourceName) {
        return {
          success: false,
          platform: 'GOOGLE',
          campaignId,
          error: 'No ad group found for campaign',
        };
      }

      // Create responsive search ad
      const adResponse = await fetch(
        `${BASE_URL}/customers/${this.customerId}/adGroupAds:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                create: {
                  adGroup: adGroupResourceName,
                  status: 'PAUSED',
                  ad: {
                    responsiveSearchAd: {
                      headlines: [
                        { text: creative.headline || creative.primaryText.slice(0, 30) },
                        { text: creative.description?.slice(0, 30) || 'Learn More' },
                        { text: 'Get Started Today' },
                      ],
                      descriptions: [
                        { text: creative.primaryText.slice(0, 90) },
                        { text: creative.description?.slice(0, 90) || creative.primaryText.slice(0, 90) },
                      ],
                      path1: creative.displayUrl?.split('/')[0]?.slice(0, 15),
                      path2: creative.displayUrl?.split('/')[1]?.slice(0, 15),
                    },
                    finalUrls: [creative.linkUrl],
                  },
                },
              },
            ],
          }),
        }
      );

      if (!adResponse.ok) {
        const error = await adResponse.json();
        return {
          success: false,
          platform: 'GOOGLE',
          campaignId,
          adSetId: adGroupResourceName.split('/').pop(),
          error: error.error?.message || 'Failed to create ad',
        };
      }

      const adResult = await adResponse.json();
      const adId = adResult.results[0].resourceName.split('/').pop();

      return {
        success: true,
        platform: 'GOOGLE',
        campaignId,
        adSetId: adGroupResourceName.split('/').pop(),
        adId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'GOOGLE',
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                update: {
                  resourceName: `customers/${this.customerId}/campaigns/${campaignId}`,
                  status: 'PAUSED',
                },
                updateMask: 'status',
              },
            ],
          }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async resumeCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                update: {
                  resourceName: `customers/${this.customerId}/campaigns/${campaignId}`,
                  status: 'ENABLED',
                },
                updateMask: 'status',
              },
            ],
          }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            operations: [
              {
                remove: `customers/${this.customerId}/campaigns/${campaignId}`,
              },
            ],
          }),
        }
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
    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${this.formatDate(startDate)}' AND '${this.formatDate(endDate)}'
    `;

    const response = await fetch(
      `${BASE_URL}/customers/${this.customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query }),
      }
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
    const metrics = data.results?.[0]?.metrics || {};

    return {
      impressions: parseInt(metrics.impressions || '0'),
      clicks: parseInt(metrics.clicks || '0'),
      ctr: parseFloat(metrics.ctr || '0'),
      spend: Math.round(parseInt(metrics.costMicros || '0') / 10000), // Convert micros to cents
      cpc: Math.round(parseInt(metrics.averageCpc || '0') / 10000),
      cpm: Math.round(parseInt(metrics.averageCpm || '0') / 10000),
      conversions: parseInt(metrics.conversions || '0'),
      costPerConversion: metrics.costPerConversion
        ? Math.round(parseFloat(metrics.costPerConversion) * 100)
        : undefined,
    };
  }

  async getAccountInfo(): Promise<AdAccountInfo> {
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
      WHERE customer.id = ${this.customerId}
    `;

    const response = await fetch(
      `${BASE_URL}/customers/${this.customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch account info');
    }

    const data = await response.json();
    const customer = data.results?.[0]?.customer || {};

    return {
      platformAccountId: this.customerId,
      accountName: customer.descriptiveName || this.customerId,
      currency: customer.currencyCode,
      timezone: customer.timeZone,
      status: customer.status === 'ENABLED' ? 'CONNECTED' : 'DISCONNECTED',
    };
  }

  async refreshTokenIfNeeded(): Promise<AdAccountTokens | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.accessToken = data.access_token;

      return {
        accessToken: data.access_token,
        refreshToken: this.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch {
      return null;
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private async addKeywords(
    adGroupResourceName: string,
    keywords: string[]
  ): Promise<void> {
    const operations = keywords.map((keyword) => ({
      create: {
        adGroup: adGroupResourceName,
        keywordMatchType: 'BROAD',
        keywordText: keyword,
      },
    }));

    await fetch(
      `${BASE_URL}/customers/${this.customerId}/adGroupCriteria:mutate`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ operations }),
      }
    );
  }

  /**
   * Get accessible customer accounts
   */
  static async getAccessibleCustomers(
    accessToken: string,
    developerToken: string
  ): Promise<string[]> {
    const response = await fetch(
      `${BASE_URL}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch accessible customers');
    }

    const data = await response.json();
    return (data.resourceNames || []).map((name: string) =>
      name.replace('customers/', '')
    );
  }
}
