/**
 * Flow Engine v1 - Tool Hooks Builder
 *
 * Maps enabled tools to flow node hooks.
 * Determines when and how tools are invoked during conversation.
 *
 * @module engines/flow/tools
 */

import type { AgentType } from "@epic-ai/shared";
import type { ToolHook, FlowNode } from "./flow.types";

// ============================================
// TYPES
// ============================================

export interface BuildToolHooksParams {
  /** Agent template type */
  templateKey: AgentType;
  /** List of enabled tool IDs */
  enabledToolIds: string[];
  /** Available flow nodes for hook binding */
  nodes?: FlowNode[];
}

// ============================================
// MAIN BUILDER
// ============================================

/**
 * Build tool hooks from enabled tools
 *
 * Maps tools to appropriate flow nodes and events.
 * Only creates hooks for tools that make sense in context.
 *
 * @param params Build parameters
 * @returns Array of tool hooks
 */
export function buildToolHooks(params: BuildToolHooksParams): ToolHook[] {
  const { enabledToolIds, nodes } = params;
  const hooks: ToolHook[] = [];
  const nodeIds = new Set(nodes?.map((n) => n.id) || []);

  // ========================================
  // CALENDAR TOOLS
  // ========================================

  // Calendar booking - triggers when entering "book" node
  if (enabledToolIds.includes("calendar.booking")) {
    if (nodeIds.has("book") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_calendar_booking_on_enter",
        tool_id: "calendar.booking",
        when: { node_id: "book", event: "on_enter" },
        input_mapping: {
          preferred_time: "conversation.preferred_time",
          service: "conversation.service",
          name: "conversation.name",
          contact: "conversation.contact_method",
        },
        output_mapping: {
          booking_id: "conversation.booking_id",
          confirmed_time: "conversation.confirmed_time",
        },
        requires_confirmation: false,
      });
    }
  }

  // Calendar availability - check before booking
  if (enabledToolIds.includes("calendar.availability")) {
    if (nodeIds.has("collect") || nodeIds.has("book") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_calendar_availability_on_collect",
        tool_id: "calendar.availability",
        when: { node_id: "collect", event: "on_collect" },
        input_mapping: {
          date: "conversation.preferred_date",
          service: "conversation.service",
        },
        output_mapping: {
          available_slots: "conversation.available_slots",
        },
        requires_confirmation: false,
      });
    }
  }

  // ========================================
  // CRM TOOLS
  // ========================================

  // Lead creation - on handoff or capture completion
  if (enabledToolIds.includes("crm.lead_create")) {
    const targetNode = nodeIds.has("handoff") ? "handoff" : nodeIds.has("capture") ? "capture" : "handoff";
    hooks.push({
      id: "hook_crm_lead_create_on_enter",
      tool_id: "crm.lead_create",
      when: { node_id: targetNode, event: "on_enter" },
      input_mapping: {
        name: "conversation.name",
        email: "conversation.email",
        phone: "conversation.phone",
        contact_method: "conversation.contact_method",
        intent: "conversation.intent",
        notes: "conversation.summary",
        source: "conversation.channel",
      },
      output_mapping: {
        lead_id: "conversation.lead_id",
      },
      requires_confirmation: false,
    });
  }

  // Lead update - on qualification completion
  if (enabledToolIds.includes("crm.lead_update")) {
    if (nodeIds.has("qualify") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_crm_lead_update_on_exit",
        tool_id: "crm.lead_update",
        when: { node_id: "qualify", event: "on_exit" },
        input_mapping: {
          lead_id: "conversation.lead_id",
          budget: "conversation.budget",
          timeline: "conversation.timeline",
          authority: "conversation.authority",
          qualification_score: "conversation.qual_score",
        },
        requires_confirmation: false,
      });
    }
  }

  // Contact lookup - on triage/intake
  if (enabledToolIds.includes("crm.contact_lookup")) {
    const targetNode = nodeIds.has("triage") ? "triage" : nodeIds.has("intake") ? "intake" : "greet";
    hooks.push({
      id: "hook_crm_contact_lookup_on_enter",
      tool_id: "crm.contact_lookup",
      when: { node_id: targetNode, event: "on_enter" },
      input_mapping: {
        email: "conversation.email",
        phone: "conversation.phone",
        name: "conversation.name",
      },
      output_mapping: {
        contact_id: "conversation.contact_id",
        is_existing_customer: "conversation.is_existing",
        previous_interactions: "conversation.history",
      },
      requires_confirmation: false,
    });
  }

  // ========================================
  // SUPPORT TOOLS
  // ========================================

  // Ticket creation - on handoff for support
  if (enabledToolIds.includes("ticket.create")) {
    if (nodeIds.has("handoff") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_ticket_create_on_enter",
        tool_id: "ticket.create",
        when: { node_id: "handoff", event: "on_enter" },
        input_mapping: {
          issue: "conversation.issue",
          issue_type: "conversation.issue_type",
          urgency: "conversation.urgency",
          contact: "conversation.contact_method",
          customer_id: "conversation.contact_id",
          summary: "conversation.summary",
        },
        output_mapping: {
          ticket_id: "conversation.ticket_id",
          ticket_number: "conversation.ticket_number",
        },
        requires_confirmation: false,
      });
    }
  }

  // Ticket update - after troubleshooting
  if (enabledToolIds.includes("ticket.update")) {
    if (nodeIds.has("answer") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_ticket_update_on_exit",
        tool_id: "ticket.update",
        when: { node_id: "answer", event: "on_exit" },
        input_mapping: {
          ticket_id: "conversation.ticket_id",
          status: "conversation.resolution_status",
          notes: "conversation.troubleshooting_notes",
        },
        requires_confirmation: false,
      });
    }
  }

  // Ticket lookup - at triage
  if (enabledToolIds.includes("ticket.lookup")) {
    if (nodeIds.has("triage") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_ticket_lookup_on_enter",
        tool_id: "ticket.lookup",
        when: { node_id: "triage", event: "on_enter" },
        input_mapping: {
          ticket_id: "conversation.ticket_id",
          customer_id: "conversation.contact_id",
          email: "conversation.email",
        },
        output_mapping: {
          existing_tickets: "conversation.open_tickets",
          ticket_history: "conversation.ticket_history",
        },
        requires_confirmation: false,
      });
    }
  }

  // ========================================
  // KNOWLEDGE TOOLS
  // ========================================

  // Knowledge search - on answer node
  if (enabledToolIds.includes("knowledge.search")) {
    if (nodeIds.has("answer") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_knowledge_search_on_enter",
        tool_id: "knowledge.search",
        when: { node_id: "answer", event: "on_enter" },
        input_mapping: {
          query: "conversation.latest_user_message",
          context: "conversation.issue",
        },
        output_mapping: {
          articles: "conversation.kb_articles",
          answer: "conversation.kb_answer",
        },
        requires_confirmation: false,
      });
    }
  }

  // Product lookup - on recommend/discovery nodes
  if (enabledToolIds.includes("knowledge.product_lookup")) {
    const targetNode = nodeIds.has("recommend") ? "recommend" : nodeIds.has("discover") ? "discover" : "answer";
    hooks.push({
      id: "hook_product_lookup_on_enter",
      tool_id: "knowledge.product_lookup",
      when: { node_id: targetNode, event: "on_enter" },
      input_mapping: {
        query: "conversation.product_query",
        category: "conversation.category",
        budget: "conversation.budget",
        requirements: "conversation.requirements",
      },
      output_mapping: {
        products: "conversation.product_results",
        recommendations: "conversation.recommendations",
      },
      requires_confirmation: false,
    });
  }

  // ========================================
  // MESSAGING TOOLS
  // ========================================

  // SMS send - on followup (reminders)
  if (enabledToolIds.includes("sms.send")) {
    if (nodeIds.has("followup") || nodeIds.has("close") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_sms_send_on_confirm",
        tool_id: "sms.send",
        when: { node_id: "followup", event: "on_confirm" },
        input_mapping: {
          phone: "conversation.phone",
          message_type: "reminder",
          appointment_time: "conversation.confirmed_time",
          booking_id: "conversation.booking_id",
        },
        requires_confirmation: true,
      });
    }
  }

  // Email send - on handoff/close (summaries)
  if (enabledToolIds.includes("email.send")) {
    if (nodeIds.has("close") || nodeIds.has("handoff") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_email_send_on_exit",
        tool_id: "email.send",
        when: { node_id: "close", event: "on_enter" },
        input_mapping: {
          email: "conversation.email",
          subject: "conversation.email_subject",
          body: "conversation.summary",
          template: "conversation_summary",
        },
        requires_confirmation: true,
      });
    }
  }

  // ========================================
  // INTEGRATION TOOLS
  // ========================================

  // Human handoff - always available
  if (enabledToolIds.includes("handoff.human")) {
    hooks.push({
      id: "hook_human_handoff_on_enter",
      tool_id: "handoff.human",
      when: { node_id: "handoff", event: "on_enter" },
      input_mapping: {
        reason: "conversation.handoff_reason",
        priority: "conversation.urgency",
        summary: "conversation.summary",
        customer_info: "conversation.customer_context",
      },
      output_mapping: {
        handoff_id: "conversation.handoff_id",
        agent_name: "conversation.assigned_agent",
        queue_position: "conversation.queue_position",
      },
      requires_confirmation: false,
    });
  }

  // Webhook trigger - on handoff
  if (enabledToolIds.includes("webhook.trigger")) {
    if (nodeIds.has("handoff") || nodeIds.size === 0) {
      hooks.push({
        id: "hook_webhook_on_handoff",
        tool_id: "webhook.trigger",
        when: { node_id: "handoff", event: "on_exit" },
        input_mapping: {
          event_type: "conversation.event_type",
          payload: "conversation.webhook_payload",
        },
        requires_confirmation: true,
      });
    }
  }

  return hooks;
}

// ============================================
// HOOK HELPERS
// ============================================

/**
 * Get hooks for a specific node
 */
export function getHooksForNode(hooks: ToolHook[], nodeId: string): ToolHook[] {
  return hooks.filter((h) => h.when.node_id === nodeId);
}

/**
 * Get hooks for a specific event
 */
export function getHooksForEvent(
  hooks: ToolHook[],
  nodeId: string,
  event: ToolHook["when"]["event"]
): ToolHook[] {
  return hooks.filter((h) => h.when.node_id === nodeId && h.when.event === event);
}

/**
 * Check if a tool has hooks defined
 */
export function hasToolHook(hooks: ToolHook[], toolId: string): boolean {
  return hooks.some((h) => h.tool_id === toolId);
}
