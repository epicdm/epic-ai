import { prisma } from "@epic-ai/database";
import { eventBus, Events, EventType } from "../events/event-bus";

interface AutomationContext {
  organizationId: string;
  trigger: string;
  triggerData: Record<string, unknown>;
}

interface Condition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  value: unknown;
}

interface Action {
  type: string;
  config: Record<string, unknown>;
}

/**
 * Check if conditions are met
 */
function evaluateConditions(
  conditions: Condition[] | null,
  data: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = getNestedValue(data, condition.field);

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      case "greater_than":
        return Number(fieldValue) > Number(condition.value);
      case "less_than":
        return Number(fieldValue) < Number(condition.value);
      case "is_empty":
        return !fieldValue || fieldValue === "";
      case "is_not_empty":
        return !!fieldValue && fieldValue !== "";
      default:
        return true;
    }
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Execute a single action
 */
async function executeAction(
  action: Action,
  context: AutomationContext
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    switch (action.type) {
      case "create_lead":
        return await createLeadAction(action.config, context);

      case "update_lead":
        return await updateLeadAction(action.config, context);

      case "update_lead_status":
        return await updateLeadStatusAction(action.config, context);

      case "add_lead_activity":
        return await addLeadActivityAction(action.config, context);

      case "add_lead_tag":
        return await addLeadTagAction(action.config, context);

      case "send_notification":
        return await sendNotificationAction(action.config, context);

      case "webhook":
        return await webhookAction(action.config, context);

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Action implementations
async function createLeadAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const triggerData = context.triggerData as Record<string, string | undefined>;

  const lead = await prisma.lead.create({
    data: {
      firstName:
        (config.firstName as string) || triggerData.firstName || "Unknown",
      lastName: (config.lastName as string) || triggerData.lastName,
      email: (config.email as string) || triggerData.email,
      phone: (config.phone as string) || triggerData.phone,
      company: (config.company as string) || triggerData.company,
      source: (config.source as string) || "OTHER",
      sourceDetails:
        (config.sourceDetails as string) ||
        `Automation triggered by ${context.trigger}`,
      status: (config.status as string) || "NEW",
      organizationId: context.organizationId,
    },
  });

  // Create activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "NOTE",
      title: "Lead created by automation",
      description: `Created from ${context.trigger} trigger`,
    },
  });

  return { success: true, result: { leadId: lead.id } };
}

async function updateLeadAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const triggerData = context.triggerData as Record<string, string | undefined>;
  const leadId = triggerData.leadId || (config.leadId as string);
  if (!leadId) {
    return { success: false, error: "No lead ID provided" };
  }

  const updateData: Record<string, unknown> = {};
  if (config.firstName) updateData.firstName = config.firstName;
  if (config.lastName) updateData.lastName = config.lastName;
  if (config.email) updateData.email = config.email;
  if (config.phone) updateData.phone = config.phone;
  if (config.company) updateData.company = config.company;
  if (config.notes) updateData.notes = config.notes;

  await prisma.lead.update({
    where: { id: leadId },
    data: updateData,
  });

  return { success: true, result: { leadId } };
}

async function updateLeadStatusAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const triggerData = context.triggerData as Record<string, string | undefined>;
  const leadId = triggerData.leadId || (config.leadId as string);
  if (!leadId) {
    return { success: false, error: "No lead ID provided" };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  const newStatus = config.status as string;

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: newStatus },
  });

  // Create activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: "STATUS_CHANGE",
      title: `Status changed to ${newStatus}`,
      description: "Changed by automation",
      metadata: { oldStatus: lead.status, newStatus },
    },
  });

  return { success: true, result: { leadId, newStatus: config.status } };
}

async function addLeadActivityAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const triggerData = context.triggerData as Record<string, string | undefined>;
  const leadId = triggerData.leadId || (config.leadId as string);
  if (!leadId) {
    return { success: false, error: "No lead ID provided" };
  }

  const activity = await prisma.leadActivity.create({
    data: {
      leadId,
      type: (config.activityType as string) || "NOTE",
      title: (config.title as string) || "Automated activity",
      description: config.description as string | undefined,
    },
  });

  return { success: true, result: { activityId: activity.id } };
}

async function addLeadTagAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const triggerData = context.triggerData as Record<string, string | undefined>;
  const leadId = triggerData.leadId || (config.leadId as string);
  if (!leadId) {
    return { success: false, error: "No lead ID provided" };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  const currentTags = lead.tags || [];
  const newTag = config.tag as string;

  if (!currentTags.includes(newTag)) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { tags: [...currentTags, newTag] },
    });
  }

  return { success: true, result: { leadId, tag: newTag } };
}

async function sendNotificationAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  // For now, just log the notification
  // In production, this would send email/SMS/push notification
  console.log("NOTIFICATION:", {
    type: config.notificationType || "email",
    to: config.to,
    subject: config.subject,
    message: config.message,
    context: context.triggerData,
  });

  return { success: true, result: { notificationSent: true } };
}

async function webhookAction(
  config: Record<string, unknown>,
  context: AutomationContext
) {
  const response = await fetch(config.url as string, {
    method: (config.method as string) || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.headers as Record<string, string>),
    },
    body: JSON.stringify({
      trigger: context.trigger,
      data: context.triggerData,
      ...(config.payload as Record<string, unknown>),
    }),
  });

  return {
    success: response.ok,
    result: { status: response.status },
    error: response.ok ? undefined : `Webhook returned ${response.status}`,
  };
}

interface AutomationRecord {
  id: string;
  conditions: unknown;
  actions: unknown;
}

/**
 * Run a single automation
 */
async function runAutomation(
  automation: AutomationRecord,
  context: AutomationContext
): Promise<void> {
  const startTime = Date.now();

  // Create run record
  const run = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      status: "RUNNING",
      triggerData: context.triggerData as object,
    },
  });

  try {
    // Check conditions
    const conditionsMet = evaluateConditions(
      automation.conditions as Condition[] | null,
      context.triggerData
    );

    if (!conditionsMet) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "SKIPPED",
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Execute actions
    const actions = automation.actions as Action[];
    const results: unknown[] = [];

    for (const action of actions) {
      const result = await executeAction(action, context);
      results.push({ action: action.type, ...result });

      if (!result.success) {
        // Stop on first failure
        throw new Error(`Action ${action.type} failed: ${result.error}`);
      }
    }

    // Update run as successful
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        actionsExecuted: results as object[],
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    // Update automation stats
    await prisma.automation.update({
      where: { id: automation.id },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
        lastRunStatus: "SUCCESS",
      },
    });
  } catch (error) {
    // Update run as failed
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    // Update automation stats
    await prisma.automation.update({
      where: { id: automation.id },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
        lastRunStatus: "FAILED",
      },
    });
  }
}

/**
 * Process an event and run matching automations
 */
export async function processEvent(
  eventType: EventType,
  organizationId: string,
  data: Record<string, unknown>
): Promise<void> {
  // Map event types to triggers
  const triggerMap: Record<EventType, string> = {
    [Events.LEAD_CREATED]: "LEAD_CREATED",
    [Events.LEAD_UPDATED]: "LEAD_UPDATED",
    [Events.LEAD_STATUS_CHANGED]: "LEAD_STATUS_CHANGED",
    [Events.LEAD_DELETED]: "LEAD_DELETED",
    [Events.CALL_STARTED]: "CALL_STARTED",
    [Events.CALL_COMPLETED]: "CALL_COMPLETED",
    [Events.CALL_FAILED]: "CALL_FAILED",
    [Events.AGENT_CREATED]: "AGENT_CREATED",
    [Events.AGENT_UPDATED]: "AGENT_UPDATED",
    [Events.SOCIAL_POST_PUBLISHED]: "SOCIAL_POST_PUBLISHED",
    [Events.SOCIAL_ENGAGEMENT]: "SOCIAL_ENGAGEMENT",
  };

  const trigger = triggerMap[eventType];
  if (!trigger) return;

  // Find matching active automations
  const automations = await prisma.automation.findMany({
    where: {
      organizationId,
      trigger,
      isActive: true,
    },
  });

  // Run each automation
  const context: AutomationContext = {
    organizationId,
    trigger,
    triggerData: data,
  };

  for (const automation of automations) {
    // Run async, don't block
    runAutomation(automation, context).catch((err) => {
      console.error(`Error running automation ${automation.id}:`, err);
    });
  }
}

/**
 * Initialize event listeners
 */
export function initializeAutomationListeners() {
  // Subscribe to all relevant events
  Object.values(Events).forEach((eventType) => {
    eventBus.subscribe(eventType, async (data) => {
      if (data.organizationId) {
        await processEvent(
          eventType,
          data.organizationId as string,
          data as Record<string, unknown>
        );
      }
    });
  });

  console.log("Automation listeners initialized");
}
