/**
 * Automation Run API
 *
 * Manually trigger an automation workflow.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { WORKFLOW_TEMPLATES } from "@/lib/services/cross-channel/workflow-templates";
import { createWorkflowExecutor } from "@/lib/services/cross-channel/workflow-executor";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for run context
const RunContextSchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  journeyId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

// POST manually trigger automation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Parse optional context from body
    let body: z.infer<typeof RunContextSchema> = {};
    try {
      const rawBody = await request.json();
      const result = RunContextSchema.safeParse(rawBody);
      if (result.success) {
        body = result.data;
      }
    } catch {
      // No body provided, use empty context
    }

    // Verify automation exists and belongs to org
    const automation = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Check that automation has steps
    const steps = automation.steps as unknown[];
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "Cannot run automation without steps" },
        { status: 400 }
      );
    }

    // Check that entry step exists
    if (!automation.entryStepId) {
      return NextResponse.json(
        { error: "Cannot run automation without entry step" },
        { status: 400 }
      );
    }

    // Build workflow context
    const workflowContext = {
      organizationId: org.id,
      brandId: automation.brandId || undefined,
      leadId: body.leadId,
      customerId: body.customerId,
      journeyId: body.journeyId,
      email: body.email,
      phone: body.phone,
      triggeredBy: "manual",
      triggeredByUserId: userId,
      ...body.context,
    };

    // Create workflow executor and start the workflow
    const executor = createWorkflowExecutor(org.id, automation.brandId || undefined);
    const result = await executor.startWorkflow(id, workflowContext);

    // Fetch the full instance for response details
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: result.instanceId },
      select: {
        id: true,
        automationId: true,
        status: true,
        currentStepId: true,
        startedAt: true,
        context: true,
      },
    });

    // Add template info for response
    const template = WORKFLOW_TEMPLATES[automation.templateId];

    return NextResponse.json(
      {
        success: true,
        instance: instance
          ? {
              id: instance.id,
              automationId: instance.automationId,
              status: instance.status,
              currentStepId: instance.currentStepId,
              startedAt: instance.startedAt,
              context: instance.context,
            }
          : {
              id: result.instanceId,
              status: result.status,
            },
        automation: {
          id: automation.id,
          name: automation.name,
          templateName: template?.name || "Custom",
        },
        message: "Workflow started successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error running automation:", error);
    return NextResponse.json(
      { error: "Failed to run automation" },
      { status: 500 }
    );
  }
}
