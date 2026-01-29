/**
 * Industry-Specific Channel Recommendations
 *
 * Maps each of the 10 brand templates to recommended channels with priority levels.
 * Used by the ChannelSelector component to provide intelligent defaults.
 */

export type ChannelId = "social" | "voice" | "email" | "chat";

export type ChannelPriority = "high" | "medium" | "low";

export interface ChannelRecommendation {
  channelId: ChannelId;
  priority: ChannelPriority;
  reason: string;
}

export interface IndustryChannelConfig {
  industryId: string;
  name: string;
  recommendations: ChannelRecommendation[];
}

/**
 * Industry-specific channel recommendations based on best practices
 * and typical customer engagement patterns per industry.
 */
export const INDUSTRY_CHANNEL_CONFIGS: IndustryChannelConfig[] = [
  {
    industryId: "tech-startup",
    name: "Tech Startup",
    recommendations: [
      {
        channelId: "social",
        priority: "high",
        reason: "Tech audiences are highly active on social platforms like Twitter and LinkedIn for updates and thought leadership",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is essential for product updates, onboarding sequences, and nurturing leads through the sales funnel",
      },
      {
        channelId: "voice",
        priority: "medium",
        reason: "Voice AI is useful for demos and support, but tech audiences often prefer self-service",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Live chat supports quick technical questions and helps with conversion",
      },
    ],
  },
  {
    industryId: "ecommerce",
    name: "E-commerce / Retail",
    recommendations: [
      {
        channelId: "social",
        priority: "high",
        reason: "Visual platforms drive product discovery and social proof through reviews and user-generated content",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is critical for abandoned cart recovery, promotions, and order updates",
      },
      {
        channelId: "chat",
        priority: "high",
        reason: "Real-time chat helps answer product questions and reduces cart abandonment",
      },
      {
        channelId: "voice",
        priority: "low",
        reason: "Voice is less common in e-commerce but useful for high-value customer support",
      },
    ],
  },
  {
    industryId: "professional-services",
    name: "Professional Services",
    recommendations: [
      {
        channelId: "voice",
        priority: "high",
        reason: "Professional services thrive on personal relationships - voice calls build trust and enable detailed consultations",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is essential for proposals, follow-ups, and maintaining professional client communications",
      },
      {
        channelId: "social",
        priority: "medium",
        reason: "LinkedIn presence builds credibility and attracts B2B clients through thought leadership",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat can qualify leads and answer initial questions before booking consultations",
      },
    ],
  },
  {
    industryId: "healthcare",
    name: "Healthcare / Medical",
    recommendations: [
      {
        channelId: "voice",
        priority: "high",
        reason: "Phone calls are preferred for appointment scheduling, follow-ups, and sensitive health discussions",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is crucial for appointment reminders, health updates, and patient communication",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat can handle non-urgent queries and triage patient needs",
      },
      {
        channelId: "social",
        priority: "low",
        reason: "Social media is useful for health education but less for direct patient engagement due to privacy",
      },
    ],
  },
  {
    industryId: "real-estate",
    name: "Real Estate",
    recommendations: [
      {
        channelId: "voice",
        priority: "high",
        reason: "Real estate is relationship-driven - phone calls are essential for viewings, negotiations, and closing deals",
      },
      {
        channelId: "social",
        priority: "high",
        reason: "Visual platforms showcase properties and build agent brand recognition",
      },
      {
        channelId: "email",
        priority: "medium",
        reason: "Email nurtures leads with new listings and market updates",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat captures inquiries from property listings and website visitors",
      },
    ],
  },
  {
    industryId: "restaurant",
    name: "Restaurant / Hospitality",
    recommendations: [
      {
        channelId: "social",
        priority: "high",
        reason: "Instagram and Facebook drive reservations through food photography and event promotion",
      },
      {
        channelId: "voice",
        priority: "high",
        reason: "Phone reservations and order handling are core to restaurant operations",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat can handle menu questions, hours, and simple reservation requests",
      },
      {
        channelId: "email",
        priority: "low",
        reason: "Email is useful for loyalty programs and special events but less for daily operations",
      },
    ],
  },
  {
    industryId: "creative-agency",
    name: "Creative / Marketing Agency",
    recommendations: [
      {
        channelId: "social",
        priority: "high",
        reason: "Agencies must showcase creative work on social platforms to attract clients",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is essential for client communications, proposals, and project updates",
      },
      {
        channelId: "voice",
        priority: "medium",
        reason: "Voice calls are important for client relationship building and project discussions",
      },
      {
        channelId: "chat",
        priority: "low",
        reason: "Chat can capture initial inquiries but agencies typically prefer scheduled calls",
      },
    ],
  },
  {
    industryId: "fitness",
    name: "Fitness / Wellness",
    recommendations: [
      {
        channelId: "social",
        priority: "high",
        reason: "Visual content of workouts, transformations, and community builds engagement and attracts members",
      },
      {
        channelId: "voice",
        priority: "medium",
        reason: "Phone calls help with membership sales and personal training consultations",
      },
      {
        channelId: "email",
        priority: "medium",
        reason: "Email supports class schedules, workout tips, and membership retention",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat can answer membership questions and schedule trials",
      },
    ],
  },
  {
    industryId: "education",
    name: "Education / Training",
    recommendations: [
      {
        channelId: "email",
        priority: "high",
        reason: "Email is essential for course updates, enrollment communications, and educational content delivery",
      },
      {
        channelId: "social",
        priority: "high",
        reason: "Social platforms help with brand awareness, community building, and sharing educational content",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat supports prospective students with enrollment questions and course information",
      },
      {
        channelId: "voice",
        priority: "low",
        reason: "Voice is useful for admissions calls but less common for ongoing student engagement",
      },
    ],
  },
  {
    industryId: "financial-services",
    name: "Financial Services",
    recommendations: [
      {
        channelId: "voice",
        priority: "high",
        reason: "Financial discussions require personal touch and trust - voice calls are essential for consultations",
      },
      {
        channelId: "email",
        priority: "high",
        reason: "Email is critical for statements, updates, and secure client communications",
      },
      {
        channelId: "chat",
        priority: "medium",
        reason: "Chat can handle account questions and route complex inquiries to advisors",
      },
      {
        channelId: "social",
        priority: "medium",
        reason: "Social media builds brand trust through financial education content",
      },
    ],
  },
];

/**
 * Get channel recommendations for a specific industry
 */
export function getIndustryRecommendations(
  industryId: string
): ChannelRecommendation[] | null {
  const config = INDUSTRY_CHANNEL_CONFIGS.find(
    (c) => c.industryId === industryId
  );
  return config?.recommendations || null;
}

/**
 * Get high-priority channels for an industry (auto-select these)
 */
export function getHighPriorityChannels(industryId: string): ChannelId[] {
  const recommendations = getIndustryRecommendations(industryId);
  if (!recommendations) return [];

  return recommendations
    .filter((r) => r.priority === "high")
    .map((r) => r.channelId);
}

/**
 * Get the recommendation for a specific channel in an industry
 */
export function getChannelRecommendation(
  industryId: string,
  channelId: ChannelId
): ChannelRecommendation | null {
  const recommendations = getIndustryRecommendations(industryId);
  if (!recommendations) return null;

  return recommendations.find((r) => r.channelId === channelId) || null;
}

/**
 * Check if a channel is recommended (high or medium priority) for an industry
 */
export function isChannelRecommended(
  industryId: string,
  channelId: ChannelId
): boolean {
  const recommendation = getChannelRecommendation(industryId, channelId);
  return recommendation?.priority === "high" || recommendation?.priority === "medium";
}

/**
 * Get all available industry IDs
 */
export function getAvailableIndustryIds(): string[] {
  return INDUSTRY_CHANNEL_CONFIGS.map((c) => c.industryId);
}

/**
 * Get industry display name from ID
 */
export function getIndustryName(industryId: string): string | null {
  const config = INDUSTRY_CHANNEL_CONFIGS.find(
    (c) => c.industryId === industryId
  );
  return config?.name || null;
}
