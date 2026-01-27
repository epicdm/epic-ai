/**
 * Flow Engine v1 - Gap Detection
 *
 * Detects missing or incomplete flow configuration.
 * Identifies tool/flow mismatches and suggests improvements.
 *
 * @module engines/flow/gaps
 */

import type { AgentType } from "@epic-ai/shared";
import type { FlowConfig, FlowGap } from "./flow.types";

// ============================================
// MAIN GAP DETECTOR
// ============================================

/**
 * Detect gaps in flow configuration
 *
 * Checks for:
 * - Missing tools for flow capabilities
 * - Flow features without tool support
 * - Template-specific missing features
 *
 * @param flow Flow configuration
 * @param enabledToolIds Enabled tool IDs
 * @returns Array of detected gaps
 */
export function detectFlowGaps(
  flow: FlowConfig,
  enabledToolIds: string[]
): FlowGap[] {
  const gaps: FlowGap[] = [];
  const toolSet = new Set(enabledToolIds);

  // Check booking capability
  gaps.push(...checkBookingGaps(flow, toolSet));

  // Check support capability
  gaps.push(...checkSupportGaps(flow, toolSet));

  // Check CRM capability
  gaps.push(...checkCRMGaps(flow, toolSet));

  // Check knowledge capability
  gaps.push(...checkKnowledgeGaps(flow, toolSet));

  // Check messaging capability
  gaps.push(...checkMessagingGaps(flow, toolSet));

  // Check handoff capability
  gaps.push(...checkHandoffGaps(flow, toolSet));

  // Template-specific gaps
  gaps.push(...checkTemplateSpecificGaps(flow, toolSet));

  return gaps;
}

// ============================================
// BOOKING GAPS
// ============================================

function checkBookingGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasBookNode = flow.nodes.some((n) => n.type === "book");

  if (hasBookNode && !toolSet.has("calendar.booking")) {
    gaps.push({
      gap_type: "missing_tool_for_flow",
      field_path: "tool_config.enabled_tools.calendar.booking",
      severity: "medium",
      impact: "Booking flow exists but calendar tool is not enabled. Agent can only capture preferred times without actual booking.",
      recommended_fix: "Enable the calendar.booking tool to allow automated appointment scheduling.",
      question_to_user: "Do you want to enable automated calendar booking?",
    });
  }

  if (hasBookNode && !toolSet.has("calendar.availability")) {
    gaps.push({
      gap_type: "missing_recommended",
      field_path: "tool_config.enabled_tools.calendar.availability",
      severity: "low",
      impact: "Booking flow would benefit from availability checking before attempting to book.",
      recommended_fix: "Enable calendar.availability to show available slots before booking.",
    });
  }

  return gaps;
}

// ============================================
// SUPPORT GAPS
// ============================================

function checkSupportGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasTriageNode = flow.nodes.some((n) => n.type === "triage");
  const hasHandoffNode = flow.nodes.some((n) => n.type === "handoff");
  const isSupport = flow.templateKey === "customer_support";

  if (isSupport && hasHandoffNode && !toolSet.has("ticket.create")) {
    gaps.push({
      gap_type: "missing_tool_for_template",
      field_path: "tool_config.enabled_tools.ticket.create",
      severity: "medium",
      impact: "Support flow has escalation but ticket tool is not enabled. Issues may not be tracked.",
      recommended_fix: "Enable ticket.create to automatically log support cases on escalation.",
      question_to_user: "Do you want to automatically create support tickets on escalation?",
    });
  }

  if (hasTriageNode && !toolSet.has("ticket.lookup")) {
    gaps.push({
      gap_type: "missing_recommended",
      field_path: "tool_config.enabled_tools.ticket.lookup",
      severity: "low",
      impact: "Triage would benefit from checking existing tickets to avoid duplicates.",
      recommended_fix: "Enable ticket.lookup to check for related open issues.",
    });
  }

  return gaps;
}

// ============================================
// CRM GAPS
// ============================================

function checkCRMGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasCaptureNode = flow.nodes.some((n) => n.type === "capture");
  const hasQualifyNode = flow.nodes.some((n) => n.type === "qualify");
  const hasHandoffNode = flow.nodes.some((n) => n.type === "handoff");
  const isSalesOrLead = ["sales_qualifier", "lead_capture"].includes(flow.templateKey);

  if (isSalesOrLead && (hasCaptureNode || hasHandoffNode) && !toolSet.has("crm.lead_create")) {
    gaps.push({
      gap_type: "missing_tool_for_template",
      field_path: "tool_config.enabled_tools.crm.lead_create",
      severity: "high",
      impact: "Sales/lead flow captures contacts but CRM integration is missing. Leads may be lost.",
      recommended_fix: "Enable crm.lead_create to automatically save captured leads.",
      question_to_user: "Do you want to automatically save leads to your CRM?",
    });
  }

  if (hasQualifyNode && !toolSet.has("crm.lead_update")) {
    gaps.push({
      gap_type: "missing_recommended",
      field_path: "tool_config.enabled_tools.crm.lead_update",
      severity: "low",
      impact: "Qualification data won't be saved to CRM without lead update tool.",
      recommended_fix: "Enable crm.lead_update to save qualification results.",
    });
  }

  if (hasHandoffNode && !toolSet.has("crm.contact_lookup")) {
    gaps.push({
      gap_type: "enhancement_opportunity",
      field_path: "tool_config.enabled_tools.crm.contact_lookup",
      severity: "low",
      impact: "Agent could provide personalized experience by recognizing returning contacts.",
      recommended_fix: "Enable crm.contact_lookup for returning customer recognition.",
    });
  }

  return gaps;
}

// ============================================
// KNOWLEDGE GAPS
// ============================================

function checkKnowledgeGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasAnswerNode = flow.nodes.some((n) => n.type === "answer");
  const isFAQ = flow.templateKey === "faq_bot";
  const isSupport = flow.templateKey === "customer_support";

  if ((isFAQ || isSupport) && hasAnswerNode && !toolSet.has("knowledge.search")) {
    gaps.push({
      gap_type: "missing_tool_for_template",
      field_path: "tool_config.enabled_tools.knowledge.search",
      severity: "high",
      impact: "FAQ/Support flow needs knowledge base access to provide accurate answers.",
      recommended_fix: "Enable knowledge.search to query your knowledge base.",
      question_to_user: "Do you have a knowledge base you want the agent to search?",
    });
  }

  const hasRecommendNode = flow.nodes.some((n) => n.type === "recommend");
  const isRecommender = flow.templateKey === "product_recommender";

  if (isRecommender && hasRecommendNode && !toolSet.has("knowledge.product_lookup")) {
    gaps.push({
      gap_type: "missing_tool_for_template",
      field_path: "tool_config.enabled_tools.knowledge.product_lookup",
      severity: "high",
      impact: "Product recommender needs product catalog access to make recommendations.",
      recommended_fix: "Enable knowledge.product_lookup to query product information.",
      question_to_user: "Do you have a product catalog the agent should reference?",
    });
  }

  return gaps;
}

// ============================================
// MESSAGING GAPS
// ============================================

function checkMessagingGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasFollowupNode = flow.nodes.some((n) => n.type === "followup");
  const hasBookNode = flow.nodes.some((n) => n.type === "book");

  if (hasFollowupNode && hasBookNode && !toolSet.has("sms.send") && !toolSet.has("email.send")) {
    gaps.push({
      gap_type: "enhancement_opportunity",
      field_path: "tool_config.enabled_tools.messaging",
      severity: "low",
      impact: "Follow-up node exists but no messaging tools enabled. Appointment reminders won't be sent.",
      recommended_fix: "Enable sms.send or email.send for appointment confirmations and reminders.",
      question_to_user: "Would you like to send appointment reminders via SMS or email?",
    });
  }

  return gaps;
}

// ============================================
// HANDOFF GAPS
// ============================================

function checkHandoffGaps(flow: FlowConfig, toolSet: Set<string>): FlowGap[] {
  const gaps: FlowGap[] = [];
  const hasHandoffNode = flow.nodes.some((n) => n.type === "handoff");

  if (hasHandoffNode && !toolSet.has("handoff.human")) {
    gaps.push({
      gap_type: "missing_critical",
      field_path: "tool_config.enabled_tools.handoff.human",
      severity: "high",
      impact: "Handoff node exists but human handoff tool is not enabled. Escalations will fail.",
      recommended_fix: "Enable handoff.human to allow transfer to human agents.",
    });
  }

  // Check for escalation intent but no handoff
  const hasEscalationIntent = flow.intents.some(
    (i) => i.id.includes("human") || i.id.includes("escalate")
  );
  const hasEscalationEdge = flow.edges.some(
    (e) => e.when.intent?.includes("human") || e.when.intent?.includes("escalate")
  );

  if ((hasEscalationIntent || hasEscalationEdge) && !hasHandoffNode) {
    gaps.push({
      gap_type: "flow_incomplete",
      field_path: "flows.nodes.handoff",
      severity: "medium",
      impact: "Flow has escalation triggers but no handoff node to handle them.",
      recommended_fix: "Add a handoff node to handle escalation requests.",
    });
  }

  return gaps;
}

// ============================================
// TEMPLATE-SPECIFIC GAPS
// ============================================

function checkTemplateSpecificGaps(
  flow: FlowConfig,
  toolSet: Set<string>
): FlowGap[] {
  const gaps: FlowGap[] = [];

  switch (flow.templateKey) {
    case "appointment_setter":
    case "booking_assistant":
      if (!toolSet.has("calendar.booking")) {
        gaps.push({
          gap_type: "template_requirement",
          field_path: "tool_config.enabled_tools.calendar.booking",
          severity: "high",
          impact: `${flow.templateKey} template is designed for booking but calendar tool is missing.`,
          recommended_fix: "Enable calendar.booking for this template to function properly.",
          question_to_user: "This template requires calendar integration. Enable now?",
        });
      }
      break;

    case "sales_qualifier":
      if (!toolSet.has("crm.lead_create") && !toolSet.has("calendar.booking")) {
        gaps.push({
          gap_type: "template_requirement",
          field_path: "tool_config.enabled_tools",
          severity: "medium",
          impact: "Sales qualifier should either capture leads or book meetings (or both).",
          recommended_fix: "Enable crm.lead_create and/or calendar.booking.",
          question_to_user: "How should qualified leads be handled - CRM capture, meeting booking, or both?",
        });
      }
      break;

    case "customer_support":
      if (!toolSet.has("knowledge.search") && !toolSet.has("ticket.create")) {
        gaps.push({
          gap_type: "template_requirement",
          field_path: "tool_config.enabled_tools",
          severity: "high",
          impact: "Support agent needs either knowledge base access or ticketing capability.",
          recommended_fix: "Enable knowledge.search and/or ticket.create.",
          question_to_user: "How should the support agent help users - KB answers, ticket creation, or both?",
        });
      }
      break;
  }

  return gaps;
}

// ============================================
// GAP HELPERS
// ============================================

/**
 * Get gaps by severity
 */
export function getGapsBySeverity(
  gaps: FlowGap[],
  severity: FlowGap["severity"]
): FlowGap[] {
  return gaps.filter((g) => g.severity === severity);
}

/**
 * Check if there are blocking (high severity) gaps
 */
export function hasBlockingGaps(gaps: FlowGap[]): boolean {
  return gaps.some((g) => g.severity === "high");
}

/**
 * Get all gap questions for user
 */
export function getGapQuestions(gaps: FlowGap[]): string[] {
  return gaps
    .filter((g) => g.question_to_user)
    .map((g) => g.question_to_user!);
}
