/**
 * Type-safe endpoint path builders for all API domains.
 */

export const endpoints = {
  // Dashboard
  dashboard: () => "/api/dashboard" as const,

  // Agents (Agent OS)
  agents: {
    list: () => "/api/agent-os/agents" as const,
    get: (id: string) => `/api/agent-os/agents/${id}` as const,
    create: () => "/api/agent-os/agents" as const,
    assemble: () => "/api/agent-os/agents/assemble" as const,
    update: (id: string) => `/api/agent-os/agents/${id}` as const,
    delete: (id: string) => `/api/agent-os/agents/${id}` as const,
    deploy: (id: string) => `/api/agent-os/agents/${id}/deploy` as const,
    roleCard: (id: string) => `/api/agent-os/agents/${id}/role-card` as const,
    brain: (id: string) => `/api/agent-os/agents/${id}/brain` as const,
    personality: (id: string) => `/api/agent-os/agents/${id}/personality` as const,
    tools: (id: string) => `/api/agent-os/agents/${id}/tools` as const,
    knowledge: (id: string) => `/api/agent-os/agents/${id}/knowledge` as const,
    governance: (id: string) => `/api/agent-os/agents/${id}/governance` as const,
    economics: (id: string) => `/api/agent-os/agents/${id}/economics` as const,
    flow: (id: string) => `/api/agent-os/agents/${id}/flow` as const,
    simulate: (id: string) => `/api/agent-os/agents/${id}/simulate` as const,
    nextStep: (id: string) => `/api/agent-os/agents/${id}/next-step` as const,
    autoFillLoop: (id: string) => `/api/agent-os/agents/${id}/auto-fill-loop` as const,
    autoFillNextStep: (id: string) => `/api/agent-os/agents/${id}/auto-fill-next-step` as const,
    answerToPatch: (id: string) => `/api/agent-os/agents/${id}/answer-to-patch` as const,
    cloneDraft: (id: string) => `/api/agent-os/agents/${id}/clone-draft` as const,
    launch: (id: string) => `/api/agent-os/agents/${id}/launch` as const,
    wizardSnapshot: (id: string) => `/api/agent-os/agents/${id}/wizard-snapshot` as const,
    learning: (id: string) => `/api/agent-os/agents/${id}/learning` as const,
    memory: (id: string) => `/api/agent-os/agents/${id}/memory` as const,
  },

  // Agent OS templates
  templates: {
    list: () => "/api/agent-os/templates" as const,
    get: (idOrSlug: string) => `/api/agent-os/templates/${idOrSlug}` as const,
    recommend: () => "/api/agent-os/templates/recommend" as const,
  },

  // Agent OS companies
  companies: {
    list: () => "/api/agent-os/companies" as const,
    enrich: () => "/api/agent-os/companies/enrich" as const,
  },

  // Agent OS jobs
  jobs: {
    list: () => "/api/agent-os/jobs" as const,
    get: (id: string) => `/api/agent-os/jobs/${id}` as const,
  },

  // Voice / Phone
  voice: {
    agents: {
      list: () => "/api/voice/agents" as const,
      get: (id: string) => `/api/voice/agents/${id}` as const,
      create: () => "/api/voice/agents" as const,
      update: (id: string) => `/api/voice/agents/${id}` as const,
      delete: (id: string) => `/api/voice/agents/${id}` as const,
      sync: (id: string) => `/api/voice/agents/${id}/sync` as const,
      autoConfig: () => "/api/voice/agents/auto-config" as const,
      provisionPhone: (id: string) => `/api/voice/agents/${id}/provision-phone` as const,
      knowledgeBases: (id: string) => `/api/voice/agents/${id}/knowledge-bases` as const,
      rag: (id: string) => `/api/voice/agents/${id}/rag` as const,
      tools: (id: string) => `/api/voice/agents/${id}/tools` as const,
      tool: (id: string, toolId: string) => `/api/voice/agents/${id}/tools/${toolId}` as const,
    },
    calls: {
      list: () => "/api/voice/calls" as const,
      get: (id: string) => `/api/voice/calls/${id}` as const,
      outbound: () => "/api/voice/calls/outbound" as const,
    },
    flows: {
      list: () => "/api/voice/flows" as const,
      get: (id: string) => `/api/voice/flows/${id}` as const,
      create: () => "/api/voice/flows" as const,
      update: (id: string) => `/api/voice/flows/${id}` as const,
      publish: (id: string) => `/api/voice/flows/${id}/publish` as const,
    },
    groups: {
      list: () => "/api/voice/groups" as const,
      get: (id: string) => `/api/voice/groups/${id}` as const,
    },
    routing: {
      list: () => "/api/voice/routing" as const,
      get: (id: string) => `/api/voice/routing/${id}` as const,
    },
    numbers: () => "/api/voice/numbers" as const,
    phoneNumbers: {
      list: () => "/api/voice/phone-numbers" as const,
      get: (id: string) => `/api/voice/phone-numbers/${id}` as const,
      available: () => "/api/voice/phone-numbers/available" as const,
    },
    knowledgeBases: {
      list: () => "/api/voice/knowledge-bases" as const,
      get: (id: string) => `/api/voice/knowledge-bases/${id}` as const,
      documents: (id: string) => `/api/voice/knowledge-bases/${id}/documents` as const,
      search: (id: string) => `/api/voice/knowledge-bases/${id}/search` as const,
    },
    stats: () => "/api/voice/stats" as const,
    templates: () => "/api/voice/templates" as const,
    token: () => "/api/voice/token" as const,
    health: () => "/api/voice/health" as const,
    chat: () => "/api/voice/chat" as const,
    speak: () => "/api/voice/speak" as const,
    transcribe: () => "/api/voice/transcribe" as const,
  },

  // Brand Brain
  brand: {
    current: () => "/api/brand-brain/current" as const,
    update: () => "/api/brand-brain" as const,
    analyze: () => "/api/brand-brain/analyze" as const,
    generateSummary: () => "/api/brand-brain/generate-summary" as const,
    applyTemplate: () => "/api/brand-brain/apply-template" as const,
    audiences: {
      list: () => "/api/brand-brain/audience" as const,
      get: (id: string) => `/api/brand-brain/audience/${id}` as const,
    },
    pillars: {
      list: () => "/api/brand-brain/pillars" as const,
      get: (id: string) => `/api/brand-brain/pillars/${id}` as const,
    },
    competitors: () => "/api/brand-brain/competitors" as const,
    analyzeWebsite: () => "/api/brand/analyze-website" as const,
    socialProfiles: () => "/api/brand/social-profiles" as const,
  },

  // Content
  content: {
    queue: {
      list: () => "/api/content/queue" as const,
      item: (id: string) => `/api/content/queue/${id}` as const,
      variations: (id: string) => `/api/content/queue/${id}/variations` as const,
    },
    generate: () => "/api/content/generate" as const,
    generateBatch: () => "/api/content/generate/batch" as const,
    approval: () => "/api/content/approval" as const,
    published: () => "/api/content/published" as const,
    calendar: () => "/api/content/calendar" as const,
    schedule: () => "/api/content/schedule" as const,
  },

  // Social
  social: {
    status: () => "/api/social/status" as const,
    integrations: () => "/api/social/integrations" as const,
    accounts: (id: string) => `/api/social/accounts/${id}` as const,
    connect: (platform: string) => `/api/social/connect/${platform}` as const,
    generate: () => "/api/social/generate" as const,
    publish: () => "/api/social/publish" as const,
    posts: () => "/api/social/posts" as const,
    settings: () => "/api/social/settings" as const,
    suggestions: {
      list: () => "/api/social/suggestions" as const,
      get: (id: string) => `/api/social/suggestions/${id}` as const,
      post: (id: string) => `/api/social/suggestions/${id}/post` as const,
    },
  },

  // Analytics
  analytics: {
    overview: () => "/api/analytics" as const,
    learnings: () => "/api/analytics/learnings" as const,
    post: (id: string) => `/api/analytics/posts/${id}` as const,
    crossChannel: () => "/api/insights/cross-channel" as const,
  },

  // Leads
  leads: {
    list: () => "/api/leads" as const,
    get: (id: string) => `/api/leads/${id}` as const,
    create: () => "/api/leads" as const,
    update: (id: string) => `/api/leads/${id}` as const,
    delete: (id: string) => `/api/leads/${id}` as const,
    stats: () => "/api/leads/stats" as const,
    activities: (id: string) => `/api/leads/${id}/activities` as const,
  },

  // Automations
  automations: {
    list: () => "/api/automations" as const,
    get: (id: string) => `/api/automations/${id}` as const,
    create: () => "/api/automations" as const,
    update: (id: string) => `/api/automations/${id}` as const,
    toggle: (id: string) => `/api/automations/${id}/toggle` as const,
    run: (id: string) => `/api/automations/${id}/run` as const,
    instances: (id: string) => `/api/automations/${id}/instances` as const,
    templates: () => "/api/automations/templates" as const,
  },

  // Ads
  ads: {
    campaigns: {
      list: () => "/api/ads/campaigns" as const,
      get: (id: string) => `/api/ads/campaigns/${id}` as const,
      metrics: (id: string) => `/api/ads/campaigns/${id}/metrics` as const,
    },
    accounts: {
      list: () => "/api/ads/accounts" as const,
      get: (id: string) => `/api/ads/accounts/${id}` as const,
    },
    generate: () => "/api/ads/generate" as const,
    recommendations: {
      list: () => "/api/ads/recommendations" as const,
      get: (id: string) => `/api/ads/recommendations/${id}` as const,
    },
  },

  // Settings
  settings: {
    webhooks: {
      config: () => "/api/webhooks/config" as const,
      configPlatform: (platform: string) => `/api/webhooks/config/${platform}` as const,
      logs: () => "/api/webhooks/logs" as const,
      test: () => "/api/webhooks/test" as const,
    },
    publishing: {
      schedule: () => "/api/publishing/schedule" as const,
      autoSchedule: () => "/api/publishing/auto-schedule" as const,
      logs: () => "/api/publishing/logs" as const,
    },
    organization: (id: string) => `/api/organizations/${id}` as const,
  },

  // User
  user: {
    features: () => "/api/user/features" as const,
    checkAutoUnlock: () => "/api/user/features/check-auto-unlock" as const,
    unlocks: () => "/api/user/unlocks" as const,
  },

  // Flywheel
  flywheel: {
    status: () => "/api/flywheel/status" as const,
    activate: () => "/api/flywheel/activate" as const,
    phases: () => "/api/flywheel/phases" as const,
    phase: (phase: string) => `/api/flywheel/phases/${phase}` as const,
  },

  // Journeys
  journeys: {
    list: () => "/api/journeys" as const,
    get: (id: string) => `/api/journeys/${id}` as const,
  },

  // Context Engine
  context: {
    sources: {
      list: () => "/api/context/sources" as const,
      get: (id: string) => `/api/context/sources/${id}` as const,
    },
    items: () => "/api/context/items" as const,
    documents: () => "/api/context/documents" as const,
    summary: () => "/api/context/summary" as const,
  },

  // Cost
  cost: () => "/api/cost" as const,
} as const;
