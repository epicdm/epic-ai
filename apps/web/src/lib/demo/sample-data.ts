/**
 * Demo Mode Sample Data Generators
 * Creates realistic sample data for the demo experience
 */

// Sample Voice Agent for demo
export function generateDemoVoiceAgent(brandName: string = "Acme Corp") {
  return {
    id: "demo-agent-001",
    name: "Sarah - Sales Assistant",
    description: "Friendly AI sales representative for inbound inquiries",
    agentType: "INBOUND",
    status: "active",
    isActive: true,
    isDeployed: true,
    systemPrompt: `You are Sarah, a friendly and professional sales assistant for ${brandName}. You help customers learn about our products and services, answer questions, and schedule demos with the sales team.`,
    greetingMessage: `Hi! Thanks for calling ${brandName}. I'm Sarah, your AI assistant. How can I help you today?`,
    voiceId: "sarah",
    model: "gpt-4o-mini",
    temperature: 0.7,
    phoneNumbers: [
      { id: "demo-phone-001", number: "+1 (555) 123-4567", isActive: true }
    ],
    _count: { calls: 47 },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Sample Campaign for demo
export function generateDemoCampaign(brandName: string = "Acme Corp") {
  return {
    id: "demo-campaign-001",
    name: "Q4 Lead Follow-up Campaign",
    description: "Automated follow-up calls to warm leads from website signups",
    status: "active",
    type: "outbound",
    agentId: "demo-agent-001",
    agentName: "Sarah - Sales Assistant",
    totalLeads: 150,
    contacted: 89,
    connected: 42,
    converted: 12,
    pending: 61,
    successRate: 28.6,
    scheduledTime: "09:00",
    scheduledDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Sample Leads for demo
export function generateDemoLeads() {
  const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Drew", "Jamie", "Avery"];
  const lastNames = ["Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Anderson", "Thomas"];
  const companies = ["TechCorp", "Innovate Inc", "Growth Labs", "Spark Digital", "Blue Ocean", "NextGen Systems", "Apex Solutions", "Prime Ventures", "Elevate Co", "Summit Group"];
  const statuses = ["new", "contacted", "qualified", "converted", "not_interested"];

  return Array.from({ length: 25 }, (_, i) => {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysAgo = Math.floor(Math.random() * 30);

    return {
      id: `demo-lead-${String(i + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s/g, "")}.com`,
      phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      company,
      title: ["CEO", "CTO", "VP Marketing", "Director of Sales", "Product Manager"][Math.floor(Math.random() * 5)],
      status,
      source: ["website", "referral", "linkedin", "conference"][Math.floor(Math.random() * 4)],
      score: Math.floor(Math.random() * 100),
      lastContactedAt: status !== "new" ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() : null,
      createdAt: new Date(Date.now() - (daysAgo + 5) * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

// Sample Call Logs for demo
export function generateDemoCallLogs() {
  const outcomes = ["completed", "no_answer", "voicemail", "busy", "callback_requested"];
  const leadNames = ["Alex Johnson", "Jordan Smith", "Taylor Williams", "Morgan Brown", "Casey Davis"];

  return Array.from({ length: 15 }, (_, i) => {
    const hoursAgo = i * 3 + Math.floor(Math.random() * 3);
    const duration = Math.floor(Math.random() * 300) + 30;
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    return {
      id: `demo-call-${String(i + 1).padStart(3, "0")}`,
      leadName: leadNames[i % leadNames.length],
      phoneNumber: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      direction: i % 3 === 0 ? "inbound" : "outbound",
      outcome,
      duration: outcome === "completed" ? duration : outcome === "voicemail" ? 45 : 0,
      summary: outcome === "completed"
        ? "Discussed product features and pricing. Lead showed interest in enterprise plan."
        : outcome === "voicemail"
        ? "Left voicemail with callback information."
        : null,
      sentiment: outcome === "completed" ? (Math.random() > 0.3 ? "positive" : "neutral") : null,
      recordingUrl: outcome === "completed" ? `/demo/recording-${i}.mp3` : null,
      cost: outcome === "completed" ? (duration / 60 * 0.05).toFixed(2) : "0.00",
      startedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000 + duration * 1000).toISOString(),
    };
  });
}

// Sample Content for demo
export function generateDemoContent(brandName: string = "Acme Corp") {
  const platforms = ["twitter", "linkedin", "facebook", "instagram"];
  const topics = [
    { title: "Industry Trends 2024", pillar: "thought-leadership" },
    { title: "Product Launch", pillar: "product-updates" },
    { title: "Customer Success Story", pillar: "case-studies" },
    { title: "Behind the Scenes", pillar: "company-culture" },
    { title: "Tips & Best Practices", pillar: "educational" },
  ];

  return Array.from({ length: 12 }, (_, i) => {
    const topic = topics[i % topics.length];
    const platform = platforms[i % platforms.length];
    const daysAgo = Math.floor(i / 4) * 2;
    const isPublished = daysAgo > 0;

    const contents: Record<string, string> = {
      twitter: `🚀 Excited to share our latest insights on ${topic.title.toLowerCase()}! Here's what we've learned... #${brandName.replace(/\s/g, "")} #Innovation`,
      linkedin: `I'm thrilled to share our team's perspective on ${topic.title}.\n\nOver the past quarter, we've seen significant shifts in how companies approach this challenge. Here are our key takeaways:\n\n1️⃣ Embrace automation\n2️⃣ Focus on customer experience\n3️⃣ Invest in your team\n\nWhat trends are you seeing? Let's discuss in the comments! 👇`,
      facebook: `Big news from the ${brandName} team! 🎉\n\nWe just published our comprehensive guide on ${topic.title}. Check it out and let us know what you think!`,
      instagram: `✨ ${topic.title} ✨\n\nSwipe to learn our top tips for success in 2024!\n\n#business #innovation #growth #ai`,
    };

    return {
      id: `demo-content-${String(i + 1).padStart(3, "0")}`,
      title: topic.title,
      pillar: topic.pillar,
      platform,
      content: contents[platform],
      status: isPublished ? "published" : i === 0 ? "draft" : "scheduled",
      scheduledFor: !isPublished ? new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString() : null,
      publishedAt: isPublished ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() : null,
      metrics: isPublished ? {
        impressions: Math.floor(Math.random() * 5000) + 500,
        likes: Math.floor(Math.random() * 200) + 20,
        comments: Math.floor(Math.random() * 30) + 5,
        shares: Math.floor(Math.random() * 50) + 10,
        clicks: Math.floor(Math.random() * 100) + 15,
        engagementRate: (Math.random() * 5 + 1).toFixed(1),
      } : null,
      createdAt: new Date(Date.now() - (daysAgo + 3) * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

// Sample Analytics/Stats for demo
export function generateDemoStats() {
  return {
    voice: {
      totalCalls: 47,
      totalMinutes: 312,
      successRate: 78,
      activeAgents: 1,
      phoneNumbers: 1,
      totalCost: 15.60,
    },
    content: {
      totalPosts: 12,
      published: 8,
      scheduled: 3,
      drafts: 1,
      totalImpressions: 24580,
      totalEngagement: 1847,
      avgEngagementRate: 3.2,
    },
    campaigns: {
      active: 1,
      completed: 0,
      totalLeads: 150,
      contacted: 89,
      converted: 12,
      conversionRate: 13.5,
    },
    leads: {
      total: 25,
      new: 8,
      contacted: 7,
      qualified: 5,
      converted: 3,
      notInterested: 2,
    },
  };
}

// Full demo data package
export function generateFullDemoData(brandName: string = "Acme Corp") {
  return {
    voiceAgent: generateDemoVoiceAgent(brandName),
    campaign: generateDemoCampaign(brandName),
    leads: generateDemoLeads(),
    callLogs: generateDemoCallLogs(),
    content: generateDemoContent(brandName),
    stats: generateDemoStats(),
    generatedAt: new Date().toISOString(),
  };
}
