// Plan Limits
export const PLAN_LIMITS = {
  starter: {
    socialAccounts: 5,
    voiceMinutes: 250,
    brands: 1,
    users: 1,
    aiImages: 0,
    price: 79,
  },
  growth: {
    socialAccounts: 15,
    voiceMinutes: 1000,
    brands: 3,
    users: 3,
    aiImages: 50,
    price: 199,
  },
  pro: {
    socialAccounts: 30,
    voiceMinutes: 3000,
    brands: 10,
    users: 10,
    aiImages: 200,
    price: 399,
  },
  agency: {
    socialAccounts: 100,
    voiceMinutes: 10000,
    brands: 999,
    users: 999,
    aiImages: 500,
    price: 799,
  },
  enterprise: {
    socialAccounts: 999999,
    voiceMinutes: 999999,
    brands: 999999,
    users: 999999,
    aiImages: 999999,
    price: 0,
  },
} as const;

// Social Platform Display Names
export const SOCIAL_PLATFORMS = {
  twitter: { name: "X (Twitter)", icon: "twitter" },
  instagram: { name: "Instagram", icon: "instagram" },
  linkedin: { name: "LinkedIn", icon: "linkedin" },
  facebook: { name: "Facebook", icon: "facebook" },
  tiktok: { name: "TikTok", icon: "tiktok" },
  youtube: { name: "YouTube", icon: "youtube" },
  threads: { name: "Threads", icon: "threads" },
  bluesky: { name: "Bluesky", icon: "bluesky" },
  reddit: { name: "Reddit", icon: "reddit" },
  discord: { name: "Discord", icon: "discord" },
  pinterest: { name: "Pinterest", icon: "pinterest" },
  mastodon: { name: "Mastodon", icon: "mastodon" },
} as const;

// Voice Options
export const VOICE_OPTIONS = {
  openai: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
  elevenlabs: ["rachel", "drew", "clyde", "paul", "domi", "bella"],
} as const;
