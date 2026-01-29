/**
 * Automation Templates API
 *
 * Returns available workflow templates for creating automations.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import {
  WORKFLOW_TEMPLATES,
  getTemplatesByCategory,
  getTemplatesByChannels,
} from "@/lib/services/cross-channel/workflow-templates";
import { WorkflowCategory, ChannelType } from "@epic-ai/database";

// GET available templates
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as WorkflowCategory | null;
    const channels = searchParams.get("channels"); // Comma-separated list

    let templates = Object.values(WORKFLOW_TEMPLATES);

    // Filter by category if provided
    if (category) {
      templates = getTemplatesByCategory(category);
    }

    // Filter by channels if provided
    if (channels) {
      const channelList = channels.split(",") as ChannelType[];
      templates = getTemplatesByChannels(channelList);
    }

    // Transform templates for API response
    const response = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      channels: template.channels,
      trigger: template.trigger,
      stepsCount: template.steps.length,
      requiresBrandBrain: template.requiresBrandBrain ?? true,
    }));

    return NextResponse.json({
      templates: response,
      total: response.length,
      categories: Object.values(WorkflowCategory),
      availableChannels: Object.values(ChannelType),
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
