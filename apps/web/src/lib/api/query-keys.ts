/**
 * React Query key factory.
 *
 * Provides structured, type-safe query keys for all API domains.
 * Pattern: [domain, ...scope] for easy invalidation at any level.
 */

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    overview: () => [...queryKeys.dashboard.all, "overview"] as const,
  },

  // Agents (Agent OS)
  agents: {
    all: ["agents"] as const,
    lists: () => [...queryKeys.agents.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.agents.lists(), filters] as const,
    details: () => [...queryKeys.agents.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.agents.details(), id] as const,
    module: (id: string, module: string) =>
      [...queryKeys.agents.detail(id), module] as const,
    nextStep: (id: string) =>
      [...queryKeys.agents.detail(id), "next-step"] as const,
    wizardSnapshot: (id: string) =>
      [...queryKeys.agents.detail(id), "wizard-snapshot"] as const,
  },

  // Templates
  templates: {
    all: ["templates"] as const,
    lists: () => [...queryKeys.templates.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.templates.lists(), filters] as const,
    detail: (idOrSlug: string) =>
      [...queryKeys.templates.all, "detail", idOrSlug] as const,
    recommendations: (params?: Record<string, unknown>) =>
      [...queryKeys.templates.all, "recommend", params] as const,
  },

  // Companies
  companies: {
    all: ["companies"] as const,
    lists: () => [...queryKeys.companies.all, "list"] as const,
  },

  // Jobs
  jobs: {
    all: ["jobs"] as const,
    lists: () => [...queryKeys.jobs.all, "list"] as const,
    detail: (id: string) => [...queryKeys.jobs.all, "detail", id] as const,
  },

  // Voice / Phone
  voice: {
    all: ["voice"] as const,
    agents: {
      all: () => [...queryKeys.voice.all, "agents"] as const,
      list: () => [...queryKeys.voice.agents.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.voice.agents.all(), "detail", id] as const,
    },
    calls: {
      all: () => [...queryKeys.voice.all, "calls"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.voice.calls.all(), "list", filters] as const,
      detail: (id: string) =>
        [...queryKeys.voice.calls.all(), "detail", id] as const,
    },
    flows: {
      all: () => [...queryKeys.voice.all, "flows"] as const,
      list: () => [...queryKeys.voice.flows.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.voice.flows.all(), "detail", id] as const,
    },
    groups: {
      all: () => [...queryKeys.voice.all, "groups"] as const,
      list: () => [...queryKeys.voice.groups.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.voice.groups.all(), "detail", id] as const,
    },
    routing: {
      all: () => [...queryKeys.voice.all, "routing"] as const,
      list: () => [...queryKeys.voice.routing.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.voice.routing.all(), "detail", id] as const,
    },
    numbers: () => [...queryKeys.voice.all, "numbers"] as const,
    phoneNumbers: {
      all: () => [...queryKeys.voice.all, "phone-numbers"] as const,
      list: () => [...queryKeys.voice.phoneNumbers.all(), "list"] as const,
      available: () =>
        [...queryKeys.voice.phoneNumbers.all(), "available"] as const,
    },
    knowledgeBases: {
      all: () => [...queryKeys.voice.all, "knowledge-bases"] as const,
      list: () => [...queryKeys.voice.knowledgeBases.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.voice.knowledgeBases.all(), "detail", id] as const,
    },
    stats: () => [...queryKeys.voice.all, "stats"] as const,
    templates: () => [...queryKeys.voice.all, "templates"] as const,
  },

  // Brand
  brand: {
    all: ["brand"] as const,
    current: () => [...queryKeys.brand.all, "current"] as const,
    audiences: () => [...queryKeys.brand.all, "audiences"] as const,
    pillars: () => [...queryKeys.brand.all, "pillars"] as const,
    competitors: () => [...queryKeys.brand.all, "competitors"] as const,
  },

  // Content
  content: {
    all: ["content"] as const,
    queue: {
      all: () => [...queryKeys.content.all, "queue"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.content.queue.all(), "list", filters] as const,
      detail: (id: string) =>
        [...queryKeys.content.queue.all(), "detail", id] as const,
    },
    approval: () => [...queryKeys.content.all, "approval"] as const,
    published: (filters?: Record<string, unknown>) =>
      [...queryKeys.content.all, "published", filters] as const,
    calendar: (filters?: Record<string, unknown>) =>
      [...queryKeys.content.all, "calendar", filters] as const,
  },

  // Social
  social: {
    all: ["social"] as const,
    status: () => [...queryKeys.social.all, "status"] as const,
    integrations: () => [...queryKeys.social.all, "integrations"] as const,
    posts: (filters?: Record<string, unknown>) =>
      [...queryKeys.social.all, "posts", filters] as const,
    settings: () => [...queryKeys.social.all, "settings"] as const,
    suggestions: {
      all: () => [...queryKeys.social.all, "suggestions"] as const,
      list: () => [...queryKeys.social.suggestions.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.social.suggestions.all(), "detail", id] as const,
    },
  },

  // Analytics
  analytics: {
    all: ["analytics"] as const,
    overview: (filters?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, "overview", filters] as const,
    learnings: () => [...queryKeys.analytics.all, "learnings"] as const,
    post: (id: string) => [...queryKeys.analytics.all, "post", id] as const,
    crossChannel: () =>
      [...queryKeys.analytics.all, "cross-channel"] as const,
  },

  // Leads
  leads: {
    all: ["leads"] as const,
    lists: () => [...queryKeys.leads.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.leads.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.leads.all, "detail", id] as const,
    stats: () => [...queryKeys.leads.all, "stats"] as const,
    activities: (id: string) =>
      [...queryKeys.leads.all, "activities", id] as const,
  },

  // Automations
  automations: {
    all: ["automations"] as const,
    lists: () => [...queryKeys.automations.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.automations.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.automations.all, "detail", id] as const,
    instances: (id: string) =>
      [...queryKeys.automations.all, "instances", id] as const,
    templates: () => [...queryKeys.automations.all, "templates"] as const,
  },

  // Ads
  ads: {
    all: ["ads"] as const,
    campaigns: {
      all: () => [...queryKeys.ads.all, "campaigns"] as const,
      list: () => [...queryKeys.ads.campaigns.all(), "list"] as const,
      detail: (id: string) =>
        [...queryKeys.ads.campaigns.all(), "detail", id] as const,
      metrics: (id: string) =>
        [...queryKeys.ads.campaigns.all(), "metrics", id] as const,
    },
    accounts: {
      all: () => [...queryKeys.ads.all, "accounts"] as const,
      list: () => [...queryKeys.ads.accounts.all(), "list"] as const,
    },
    recommendations: {
      all: () => [...queryKeys.ads.all, "recommendations"] as const,
      list: () => [...queryKeys.ads.recommendations.all(), "list"] as const,
    },
  },

  // Settings
  settings: {
    all: ["settings"] as const,
    webhooks: () => [...queryKeys.settings.all, "webhooks"] as const,
    publishing: () => [...queryKeys.settings.all, "publishing"] as const,
    organization: (id: string) =>
      [...queryKeys.settings.all, "organization", id] as const,
  },

  // User
  user: {
    all: ["user"] as const,
    features: () => [...queryKeys.user.all, "features"] as const,
    unlocks: () => [...queryKeys.user.all, "unlocks"] as const,
  },

  // Flywheel
  flywheel: {
    all: ["flywheel"] as const,
    status: () => [...queryKeys.flywheel.all, "status"] as const,
    phases: () => [...queryKeys.flywheel.all, "phases"] as const,
  },

  // Journeys
  journeys: {
    all: ["journeys"] as const,
    lists: () => [...queryKeys.journeys.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.journeys.all, "detail", id] as const,
  },

  // Context Engine
  context: {
    all: ["context"] as const,
    sources: () => [...queryKeys.context.all, "sources"] as const,
    items: () => [...queryKeys.context.all, "items"] as const,
    documents: () => [...queryKeys.context.all, "documents"] as const,
    summary: () => [...queryKeys.context.all, "summary"] as const,
  },

  // Cost
  cost: {
    all: ["cost"] as const,
    estimate: () => [...queryKeys.cost.all, "estimate"] as const,
  },
} as const;
