/**
 * Automations API
 *
 * Manages cross-channel workflow automations.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma, Prisma } from "@epic-ai/database";
import { WorkflowTrigger, WorkflowCategory } from "@epic-ai/database";
import {
  WORKFLOW_TEMPLATES,
  getWorkflowTemplate,
} from "@/lib/services/cross-channel/workflow-templates";
import { z } from "zod";

// Schema for creating automation from template
const CreateAutomationSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  brandId: z.string().optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  customSteps: z.array(z.unknown()).optional(),
});

// GET all automations
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as WorkflowCategory | null;
    const isActive = searchParams.get("isActive");
    const brandId = searchParams.get("brandId");

    // Build filter
    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (brandId) {
      where.brandId = brandId;
    }

    const automations = await prisma.automation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    // Add template info to each automation
    const automationsWithTemplates = automations.map((automation) => {
      const template = WORKFLOW_TEMPLATES[automation.templateId];
      return {
        ...automation,
        templateName: template?.name || "Custom",
        templateDescription: template?.description,
        channelCount: automation.channels.length,
        instanceCount: automation._count.instances,
        runCount: automation.totalRuns, // Map totalRuns to runCount for frontend
        lastRunAt: null, // TODO: Add last instance completed date
        lastRunStatus: null, // TODO: Add last instance status
      };
    });

    return NextResponse.json(automationsWithTemplates);
  } catch (error) {
    console.error("Error fetching automations:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

// POST create automation from template
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const result = CreateAutomationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.errors },
        { status: 400 }
      );
    }

    const { templateId, name, description, brandId, triggerConfig, customSteps } =
      result.data;

    // Get the template
    const template = getWorkflowTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    // Verify brand exists if provided
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: {
          id: brandId,
          organizationId: org.id,
        },
      });

      if (!brand) {
        return NextResponse.json(
          { error: "Brand not found" },
          { status: 404 }
        );
      }
    }

    // Use custom steps or template steps
    const steps = customSteps || template.steps;

    // Find entry step - use template's entryStepId or derive from first step
    const firstStep = steps[0] as { id?: string } | undefined;
    const entryStepId = template.entryStepId || firstStep?.id || "step-1";

    // Create automation
    const automation = await prisma.automation.create({
      data: {
        organizationId: org.id,
        brandId,
        templateId,
        name: name || template.name,
        description: description || template.description,
        category: template.category as WorkflowCategory,
        trigger: (template.trigger || WorkflowTrigger.MANUAL) as WorkflowTrigger,
        triggerConfig: (triggerConfig || template.triggerConfig || {}) as Prisma.InputJsonValue,
        steps: steps as object,
        entryStepId,
        channels: template.channels,
        requiresBrandBrain: template.requiresBrandBrain ?? true,
        isActive: false, // Start inactive
      },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...automation,
        templateName: template.name,
        templateDescription: template.description,
        channelCount: automation.channels.length,
        instanceCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating automation:", error);
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}
