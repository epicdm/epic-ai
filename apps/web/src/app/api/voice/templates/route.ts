/**
 * Voice Agent Templates API
 * Provides pre-configured agent templates for quick deployment
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import {
  voiceAgentTemplates,
  getTemplateById,
  getBeginnerTemplates,
  applyTemplateVariables,
} from "@/lib/voice/templates";
import { z } from "zod";

// GET - List all templates or filter by category/difficulty
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const onboardingOnly = searchParams.get("onboarding") === "true";

    let templates = [...voiceAgentTemplates];

    // Filter by category
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    // Filter by difficulty
    if (difficulty) {
      templates = templates.filter((t) => t.difficulty === difficulty);
    }

    // For onboarding, only show beginner templates
    if (onboardingOnly) {
      templates = getBeginnerTemplates();
    }

    return NextResponse.json({
      templates,
      categories: ["sales", "support", "booking", "survey", "general"],
      difficulties: ["beginner", "intermediate", "advanced"],
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create an agent from a template
const createFromTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1),
  brandId: z.string(),
  variables: z.record(z.string()).optional(),
  customizations: z
    .object({
      systemPrompt: z.string().optional(),
      greetingMessage: z.string().optional(),
      voiceId: z.string().optional(),
      temperature: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createFromTemplateSchema.parse(body);

    // Get the template
    const template = getTemplateById(validated.templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Validate brand belongs to org
    const brand = await prisma.brand.findFirst({
      where: {
        id: validated.brandId,
        organizationId: org.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
    }

    // Apply default variables
    const defaultVariables = {
      company_name: brand.name || org.name,
      agent_name: validated.name,
      ...validated.variables,
    };

    const { systemPrompt, greetingMessage } = applyTemplateVariables(
      template,
      defaultVariables
    );

    // Create the agent from template
    const agent = await prisma.voiceAgent.create({
      data: {
        name: validated.name,
        description: template.description,
        organizationId: org.id,
        brandId: validated.brandId,
        agentType: template.agentType,
        systemPrompt:
          validated.customizations?.systemPrompt || systemPrompt,
        greetingMessage:
          validated.customizations?.greetingMessage || greetingMessage,
        greetingEnabled: true,
        customInstructions: template.customInstructions,
        realtimeVoice:
          validated.customizations?.voiceId || template.suggestedVoice,
        llmModel: template.suggestedModel,
        temperature:
          validated.customizations?.temperature ?? template.temperature,
        isActive: true,
        status: "created",
        settings: {
          createdFromTemplate: template.id,
          templateCategory: template.category,
        },
      },
    });

    // Update onboarding progress if applicable
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasCreatedVoiceAgent: true,
        lastActiveAt: new Date(),
      },
      update: {
        hasCreatedVoiceAgent: true,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          ...agent,
          brand: { id: brand.id, name: brand.name },
          template: {
            id: template.id,
            name: template.name,
            category: template.category,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating agent from template:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
