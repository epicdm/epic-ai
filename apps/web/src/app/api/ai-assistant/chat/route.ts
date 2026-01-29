/**
 * AI Assistant Chat API
 * Powered by GPT-4o for contextual help throughout the application
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    currentPage: z.string().optional(),
    brandId: z.string().optional(),
    agentId: z.string().optional(),
    campaignId: z.string().optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional(),
});

// Page-specific context and capabilities
const pageContexts: Record<string, string> = {
  "/dashboard": `The user is on the main dashboard. You can help with:
- Understanding their metrics and analytics
- Getting started with the platform
- Navigating to different features
- Explaining the flywheel concept`,

  "/dashboard/brand": `The user is in Brand Brain settings. You can help with:
- Creating or editing their brand voice
- Setting up target audiences
- Defining content pillars
- Configuring brand guidelines`,

  "/dashboard/content": `The user is in the Content Factory. You can help with:
- Generating new content ideas
- Creating platform-specific variations
- Scheduling posts
- Understanding content performance`,

  "/dashboard/voice": `The user is in Voice AI section. You can help with:
- Creating voice agents
- Setting up phone campaigns
- Understanding call analytics
- Configuring agent behaviors`,

  "/dashboard/analytics": `The user is viewing analytics. You can help with:
- Interpreting metrics
- Understanding trends
- Identifying areas for improvement
- Setting up goals`,

  "/dashboard/social": `The user is managing social connections. You can help with:
- Connecting social accounts
- Understanding platform requirements
- Troubleshooting connection issues`,
};

// Suggested actions based on context
function getSuggestions(page: string, hasData: boolean): string[] {
  const baseSuggestions = {
    "/dashboard": hasData
      ? ["What are my top performing posts?", "How can I improve engagement?", "Show me voice campaign results"]
      : ["How do I get started?", "What features does Epic AI have?", "Help me create my first content"],
    "/dashboard/brand": ["Help me define my brand voice", "What are content pillars?", "How do I add a target audience?"],
    "/dashboard/content": ["Generate content ideas for me", "What's the best time to post?", "Help me write a LinkedIn post"],
    "/dashboard/voice": ["How do I create a voice agent?", "What are outbound campaigns?", "Show me available templates"],
    "/dashboard/analytics": ["Explain my engagement rate", "What metrics should I focus on?", "How do I improve?"],
  };

  const key = Object.keys(baseSuggestions).find(k => page.startsWith(k)) || "/dashboard";
  return baseSuggestions[key as keyof typeof baseSuggestions] || baseSuggestions["/dashboard"];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = chatSchema.parse(body);

    const org = await getCurrentOrganization();

    // Gather context about the user's data
    let userContext = "";
    if (org) {
      const [brands, agents, campaigns, contentCount] = await Promise.all([
        prisma.brand.findMany({
          where: { organizationId: org.id },
          select: { id: true, name: true },
          take: 5,
        }),
        prisma.voiceAgent.findMany({
          where: { organizationId: org.id },
          select: { id: true, name: true, agentType: true, status: true },
          take: 5,
        }),
        prisma.voiceCampaign.findMany({
          where: { organizationId: org.id },
          select: { id: true, name: true, status: true },
          take: 5,
        }),
        prisma.contentItem.count({
          where: { brand: { organizationId: org.id } },
        }),
      ]);

      userContext = `
User's organization: ${org.name}
Brands: ${brands.length > 0 ? brands.map(b => b.name).join(", ") : "None created yet"}
Voice Agents: ${agents.length > 0 ? agents.map(a => `${a.name} (${a.agentType})`).join(", ") : "None created yet"}
Campaigns: ${campaigns.length > 0 ? campaigns.map(c => `${c.name} (${c.status})`).join(", ") : "None created yet"}
Total content items: ${contentCount}
`;
    }

    // Get page-specific context
    const currentPage = validated.context?.currentPage || "/dashboard";
    const pageContext = Object.entries(pageContexts).find(([key]) =>
      currentPage.startsWith(key)
    )?.[1] || pageContexts["/dashboard"];

    // Build system prompt
    const systemPrompt = `You are an AI assistant for Epic AI, a self-improving AI marketing platform. You help users navigate and use the platform effectively.

Platform Overview:
Epic AI has 7 core modules that work together in a flywheel:
1. Brand Brain - Central intelligence for brand voice and settings
2. Context Engine - External data sources to keep content relevant
3. Social Connectors - Native OAuth connections to platforms (Twitter, LinkedIn, Meta)
4. Content Factory - AI-powered content generation
5. Publishing Engine - Schedule and automate content
6. Analytics - Collect metrics and generate insights
7. Unified Dashboard - Command center for everything

Current Context:
${pageContext}

${userContext}

Guidelines:
- Be concise and helpful
- Provide actionable guidance
- Reference specific features when relevant
- If unsure, suggest where to find more help
- Use a friendly, professional tone
- If the user asks about something outside the platform, politely redirect to platform features`;

    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages)
    if (validated.history) {
      for (const msg of validated.history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: "user", content: validated.message });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseContent = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Detect if the response suggests an action
    const actionPatterns = {
      create_brand: /create.*brand|set up.*brand|new brand/i,
      create_agent: /create.*agent|set up.*agent|new agent/i,
      create_content: /create.*content|generate.*content|write.*post/i,
      view_analytics: /view.*analytics|check.*metrics|see.*performance/i,
    };

    let metadata: Record<string, unknown> = {};
    for (const [action, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(validated.message) || pattern.test(responseContent)) {
        metadata.action = action;
        break;
      }
    }

    // Get contextual suggestions
    const hasData = org ? true : false;
    const suggestions = getSuggestions(currentPage, hasData);

    return NextResponse.json({
      message: responseContent,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      suggestions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("AI Assistant error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
