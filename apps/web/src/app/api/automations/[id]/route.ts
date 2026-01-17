/**
 * Automation Detail API
 *
 * GET, PUT, DELETE operations for individual automations.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { WorkflowTrigger, WorkflowCategory } from "@epic-ai/database";
import {
  WORKFLOW_TEMPLATES,
  getWorkflowTemplate,
} from "@/lib/services/cross-channel/workflow-templates";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for updating automation
const UpdateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.nativeEnum(WorkflowTrigger).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
  entryStepId: z.string().optional(),
});

// GET automation by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const automation = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
        instances: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            currentStepId: true,
            touchpointsCreated: true,
            channelsUsed: true,
          },
        },
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Add template info
    const template = WORKFLOW_TEMPLATES[automation.templateId];

    // Parse steps from JSON
    const steps = (automation.steps as Array<{
      id: string;
      name: string;
      action: string;
      config?: Record<string, unknown>;
      conditions?: Array<{ field: string; operator: string; value: unknown }>;
    }>) || [];

    // Map steps to actions format for frontend compatibility
    const actions = steps.map((step) => ({
      type: step.action,
      config: step.config || {},
    }));

    // Extract conditions from first step (typically where trigger conditions are)
    const conditions = steps[0]?.conditions || null;

    // Map instances to runs format for frontend compatibility
    const runs = automation.instances.map((instance) => {
      const startTime = new Date(instance.startedAt).getTime();
      const endTime = instance.completedAt
        ? new Date(instance.completedAt).getTime()
        : null;

      return {
        id: instance.id,
        status: instance.status,
        triggerData: {},
        actionsExecuted: instance.touchpointsCreated > 0
          ? Array(instance.touchpointsCreated).fill({ type: "touchpoint" })
          : [],
        error: instance.status === "FAILED" ? "Workflow execution failed" : null,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        durationMs: endTime ? endTime - startTime : null,
      };
    });

    // Calculate last run info
    const lastRun = runs.length > 0 ? runs[0] : null;

    return NextResponse.json({
      ...automation,
      templateName: template?.name || "Custom",
      templateDescription: template?.description,
      channelCount: automation.channels.length,
      instanceCount: automation._count.instances,
      recentInstances: automation.instances,
      // Frontend compatibility fields
      actions,
      conditions,
      runs,
      runCount: automation.totalRuns,
      lastRunAt: lastRun?.startedAt || null,
      lastRunStatus: lastRun?.status || null,
    });
  } catch (error) {
    console.error("Error fetching automation:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation" },
      { status: 500 }
    );
  }
}

// PUT update automation
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();

    // Validate input
    const result = UpdateAutomationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.errors },
        { status: 400 }
      );
    }

    // Verify automation exists and belongs to org
    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (result.data.name !== undefined) {
      updateData.name = result.data.name;
    }
    if (result.data.description !== undefined) {
      updateData.description = result.data.description;
    }
    if (result.data.trigger !== undefined) {
      updateData.trigger = result.data.trigger;
    }
    if (result.data.triggerConfig !== undefined) {
      updateData.triggerConfig = result.data.triggerConfig;
    }
    if (result.data.steps !== undefined) {
      updateData.steps = result.data.steps;
    }
    if (result.data.entryStepId !== undefined) {
      updateData.entryStepId = result.data.entryStepId;
    }

    // Update automation
    const automation = await prisma.automation.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    // Add template info
    const template = WORKFLOW_TEMPLATES[automation.templateId];

    return NextResponse.json({
      ...automation,
      templateName: template?.name || "Custom",
      templateDescription: template?.description,
      channelCount: automation.channels.length,
      instanceCount: automation._count.instances,
    });
  } catch (error) {
    console.error("Error updating automation:", error);
    return NextResponse.json(
      { error: "Failed to update automation" },
      { status: 500 }
    );
  }
}

// DELETE automation
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // Verify automation exists and belongs to org
    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Check for running instances
    const runningInstances = await prisma.workflowInstance.count({
      where: {
        automationId: id,
        status: { in: ["RUNNING", "PENDING"] },
      },
    });

    if (runningInstances > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete automation with running instances",
          runningInstances,
        },
        { status: 409 }
      );
    }

    // Delete automation (cascade will delete instances)
    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        id,
        name: existing.name,
        instancesDeleted: existing._count.instances,
      },
    });
  } catch (error) {
    console.error("Error deleting automation:", error);
    return NextResponse.json(
      { error: "Failed to delete automation" },
      { status: 500 }
    );
  }
}
