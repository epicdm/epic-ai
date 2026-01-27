/**
 * Flow Engine v1 - Flow Catalog
 *
 * Deterministic "recipes" per template key.
 * Each template has a predefined conversation flow structure.
 *
 * @module engines/flow/catalog
 */

import type { AgentType } from "@epic-ai/shared";
import type { FlowSkeleton, FlowNode, FlowEdge, FlowIntent } from "./flow.types";

// ============================================
// MAIN CATALOG FUNCTION
// ============================================

/**
 * Get base flow skeleton for a template
 *
 * Returns the predefined conversation structure including
 * nodes, edges, intents, and entry/exit points.
 *
 * @param templateKey Agent template type
 * @returns Flow skeleton
 */
export function getBaseFlowSkeleton(templateKey: AgentType): FlowSkeleton {
  switch (templateKey) {
    case "sales_qualifier":
      return salesQualifierFlow();
    case "appointment_setter":
      return appointmentSetterFlow();
    case "customer_support":
      return supportFlow();
    case "lead_capture":
      return leadCaptureFlow();
    case "faq_bot":
      return faqFlow();
    case "onboarding_guide":
      return onboardingFlow();
    case "booking_assistant":
      return bookingFlow();
    case "product_recommender":
      return recommenderFlow();
    default:
      return leadCaptureFlow();
  }
}

// ============================================
// SALES QUALIFIER FLOW
// ============================================

function salesQualifierFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet warmly and ask what they're trying to achieve or what brought them here today.",
      max_turns: 2,
    },
    {
      id: "intake",
      type: "intake",
      title: "Intake",
      instructions: "Collect their main problem/need, timeline expectations, and preferred contact method (minimal friction).",
      required_fields: ["intent", "timeline", "contact_method"],
      max_turns: 4,
    },
    {
      id: "qualify",
      type: "qualify",
      title: "Qualification",
      instructions: "Ask 2-4 qualifying questions: scope of project, budget range if comfortable sharing, and decision-making authority.",
      required_fields: ["scope", "budget", "authority"],
      max_turns: 5,
    },
    {
      id: "book",
      type: "book",
      title: "Book Next Step",
      instructions: "Offer to schedule a demo or consultation. If calendar unavailable, capture their preferred times for follow-up.",
      required_fields: ["preferred_time"],
      max_turns: 4,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Handoff",
      instructions: "Confirm next steps clearly and route to sales team or human agent. Summarize what was discussed.",
      max_turns: 2,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback",
      instructions: "If intent is unclear, ask a clarifying question then route back to the appropriate stage.",
      max_turns: 3,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Thank them for their time and wrap up the conversation politely.",
      max_turns: 1,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "user_wants_pricing",
      description: "User asks about pricing or cost",
      examples: ["how much is it", "what's the pricing", "cost", "price"],
    },
    {
      id: "user_ready_to_book",
      description: "User wants to schedule a meeting",
      examples: ["book a call", "schedule", "set up a demo", "let's talk"],
    },
    {
      id: "user_requests_human",
      description: "User requests to speak with a human",
      examples: ["talk to a person", "human please", "real person", "agent"],
    },
    {
      id: "unclear_intent",
      description: "User intent is unclear",
      examples: ["not sure", "just browsing", "looking around", "maybe"],
    },
    {
      id: "user_not_qualified",
      description: "User doesn't meet qualification criteria",
      examples: ["no budget", "just researching", "not the decision maker"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "intake", when: { condition: "after greeting" }, priority: 10 },
    { id: "e2", from: "intake", to: "qualify", when: { condition: "intent captured" }, priority: 10 },
    { id: "e3", from: "qualify", to: "book", when: { condition: "qualified enough" }, priority: 10 },
    { id: "e4", from: "book", to: "handoff", when: { intent: "user_ready_to_book" }, priority: 10 },
    { id: "e5", from: "handoff", to: "close", when: { condition: "handoff confirmed" }, priority: 10 },
    { id: "e6", from: "intake", to: "fallback", when: { intent: "unclear_intent" }, priority: 50 },
    { id: "e7", from: "qualify", to: "fallback", when: { intent: "unclear_intent" }, priority: 50 },
    { id: "e8", from: "fallback", to: "intake", when: { condition: "clarified" }, priority: 10 },
    { id: "e9", from: "*", to: "handoff", when: { intent: "user_requests_human" }, priority: 100 },
    { id: "e10", from: "qualify", to: "close", when: { intent: "user_not_qualified" }, priority: 30 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// APPOINTMENT SETTER FLOW
// ============================================

function appointmentSetterFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet warmly and ask what service or appointment they'd like to schedule.",
      max_turns: 2,
    },
    {
      id: "collect",
      type: "intake",
      title: "Collect Details",
      instructions: "Collect service type, preferred day/time, and contact information for confirmation.",
      required_fields: ["service", "preferred_time", "contact_method", "name"],
      max_turns: 4,
    },
    {
      id: "book",
      type: "book",
      title: "Book Appointment",
      instructions: "Check availability and attempt to book via calendar. Confirm booking details with user.",
      required_fields: ["confirmed_time"],
      max_turns: 4,
    },
    {
      id: "followup",
      type: "followup",
      title: "Follow-Up Setup",
      instructions: "If SMS/Email enabled, confirm reminder preferences. Set up appointment confirmation.",
      max_turns: 2,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Confirm all details and close the conversation with appointment summary.",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback",
      instructions: "Clarify missing booking details or ask about alternative times if preferred slot unavailable.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "user_ready_to_book",
      description: "User is ready to confirm booking",
      examples: ["yes book it", "schedule it", "that time works", "confirmed"],
    },
    {
      id: "missing_details",
      description: "Missing required booking details",
      examples: ["not sure what time", "anytime", "what's available"],
    },
    {
      id: "reschedule",
      description: "User wants to change appointment",
      examples: ["different time", "reschedule", "change appointment"],
    },
    {
      id: "cancel",
      description: "User wants to cancel",
      examples: ["cancel", "never mind", "forget it"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "collect", when: { condition: "after greeting" }, priority: 10 },
    { id: "e2", from: "collect", to: "book", when: { condition: "details collected" }, priority: 10 },
    { id: "e3", from: "collect", to: "fallback", when: { intent: "missing_details" }, priority: 50 },
    { id: "e4", from: "fallback", to: "collect", when: { condition: "clarified" }, priority: 10 },
    { id: "e5", from: "book", to: "followup", when: { condition: "booking successful" }, priority: 10 },
    { id: "e6", from: "book", to: "fallback", when: { condition: "slot unavailable" }, priority: 40 },
    { id: "e7", from: "followup", to: "close", when: { condition: "followup set" }, priority: 10 },
    { id: "e8", from: "*", to: "close", when: { intent: "cancel" }, priority: 90 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// CUSTOMER SUPPORT FLOW
// ============================================

function supportFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet empathetically and ask what issue they're experiencing today.",
      max_turns: 2,
    },
    {
      id: "triage",
      type: "triage",
      title: "Triage",
      instructions: "Collect issue type, any relevant account/order information, and urgency level.",
      required_fields: ["issue", "urgency", "account_info"],
      max_turns: 4,
    },
    {
      id: "answer",
      type: "answer",
      title: "Troubleshoot/Answer",
      instructions: "Provide troubleshooting steps or answer using knowledge base. If issue persists after 2-3 attempts, prepare for escalation.",
      max_turns: 6,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Ticket/Handoff",
      instructions: "Create support ticket with all collected info. Confirm ticket number and next steps with user.",
      max_turns: 3,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Thank them and confirm resolution or ticket status. Ask if there's anything else.",
      max_turns: 2,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback",
      instructions: "Ask clarifying questions about the issue. Be patient and empathetic.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "resolved",
      description: "Issue has been resolved",
      examples: ["that worked", "fixed", "problem solved", "thanks that helped"],
    },
    {
      id: "needs_ticket",
      description: "Issue needs escalation/ticket",
      examples: ["still broken", "doesn't work", "need more help", "escalate"],
    },
    {
      id: "user_frustrated",
      description: "User is frustrated",
      examples: ["this is ridiculous", "I've been waiting", "terrible service"],
    },
    {
      id: "user_requests_human",
      description: "User wants human support",
      examples: ["talk to someone", "real person", "supervisor", "manager"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "triage", when: { condition: "after greeting" }, priority: 10 },
    { id: "e2", from: "triage", to: "answer", when: { condition: "issue captured" }, priority: 10 },
    { id: "e3", from: "answer", to: "close", when: { intent: "resolved" }, priority: 20 },
    { id: "e4", from: "answer", to: "handoff", when: { intent: "needs_ticket" }, priority: 20 },
    { id: "e5", from: "answer", to: "fallback", when: { condition: "needs clarification" }, priority: 30 },
    { id: "e6", from: "fallback", to: "answer", when: { condition: "clarified" }, priority: 10 },
    { id: "e7", from: "handoff", to: "close", when: { condition: "ticket created" }, priority: 10 },
    { id: "e8", from: "*", to: "handoff", when: { intent: "user_requests_human" }, priority: 100 },
    { id: "e9", from: "*", to: "handoff", when: { intent: "user_frustrated" }, priority: 80 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// LEAD CAPTURE FLOW
// ============================================

function leadCaptureFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet warmly and ask how you can help or what brought them here.",
      max_turns: 2,
    },
    {
      id: "capture",
      type: "capture",
      title: "Capture Lead",
      instructions: "Collect name, contact method (email or phone), and a brief description of their interest/needs.",
      required_fields: ["name", "contact_method", "message"],
      max_turns: 4,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Route",
      instructions: "Confirm receipt of their information and let them know the team will follow up soon.",
      max_turns: 2,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Thank them and close politely with expected follow-up timeframe.",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback",
      instructions: "Gently ask for missing information needed to help route their inquiry.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "ready_to_share",
      description: "User ready to share contact info",
      examples: ["here's my email", "you can reach me at", "my number is"],
    },
    {
      id: "hesitant",
      description: "User hesitant to share info",
      examples: ["why do you need that", "is this secure", "I'd rather not"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "capture", when: { condition: "after greeting" }, priority: 10 },
    { id: "e2", from: "capture", to: "handoff", when: { condition: "info captured" }, priority: 10 },
    { id: "e3", from: "capture", to: "fallback", when: { intent: "hesitant" }, priority: 50 },
    { id: "e4", from: "fallback", to: "capture", when: { condition: "clarified" }, priority: 10 },
    { id: "e5", from: "handoff", to: "close", when: { condition: "confirmed" }, priority: 10 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// FAQ BOT FLOW
// ============================================

function faqFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet and ask what questions they have or what they'd like to learn about.",
      max_turns: 2,
    },
    {
      id: "answer",
      type: "answer",
      title: "Answer Question",
      instructions: "Search knowledge base and provide clear, helpful answers. Offer to clarify or provide more detail.",
      max_turns: 8,
    },
    {
      id: "followup",
      type: "followup",
      title: "Follow-Up",
      instructions: "Ask if they have any other questions or need clarification on the answer provided.",
      max_turns: 2,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Escalate",
      instructions: "If question is outside knowledge base, offer to connect with human support or capture contact for follow-up.",
      max_turns: 3,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Thank them for their questions and invite them to return anytime.",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback",
      instructions: "Ask for clarification on the question or suggest related topics.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "new_question",
      description: "User has another question",
      examples: ["another question", "what about", "can you also tell me"],
    },
    {
      id: "satisfied",
      description: "User is satisfied with answer",
      examples: ["thanks", "that helps", "got it", "perfect"],
    },
    {
      id: "needs_human",
      description: "Question beyond FAQ scope",
      examples: ["that doesn't answer", "I need specific help", "talk to someone"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "answer", when: { condition: "question asked" }, priority: 10 },
    { id: "e2", from: "answer", to: "followup", when: { condition: "answer provided" }, priority: 10 },
    { id: "e3", from: "followup", to: "answer", when: { intent: "new_question" }, priority: 20 },
    { id: "e4", from: "followup", to: "close", when: { intent: "satisfied" }, priority: 20 },
    { id: "e5", from: "answer", to: "fallback", when: { condition: "unclear question" }, priority: 40 },
    { id: "e6", from: "fallback", to: "answer", when: { condition: "clarified" }, priority: 10 },
    { id: "e7", from: "*", to: "handoff", when: { intent: "needs_human" }, priority: 80 },
    { id: "e8", from: "handoff", to: "close", when: { condition: "escalation handled" }, priority: 10 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// ONBOARDING GUIDE FLOW
// ============================================

function onboardingFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Welcome",
      instructions: "Welcome the new user warmly and introduce yourself as their onboarding guide.",
      max_turns: 2,
    },
    {
      id: "assess",
      type: "intake",
      title: "Assess Needs",
      instructions: "Ask about their goals, experience level, and what they hope to accomplish.",
      required_fields: ["goals", "experience_level"],
      max_turns: 4,
    },
    {
      id: "guide",
      type: "answer",
      title: "Guide Through Steps",
      instructions: "Walk them through relevant onboarding steps based on their goals. Provide clear instructions.",
      max_turns: 10,
    },
    {
      id: "check",
      type: "followup",
      title: "Check Progress",
      instructions: "Verify they completed each step successfully and offer help if stuck.",
      max_turns: 4,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Connect Resources",
      instructions: "Connect them with additional resources, support, or next steps for their journey.",
      max_turns: 3,
    },
    {
      id: "close",
      type: "close",
      title: "Complete Onboarding",
      instructions: "Congratulate them on completing onboarding and wish them success.",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Help Stuck User",
      instructions: "Identify where they're stuck and provide additional guidance or alternatives.",
      max_turns: 4,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "step_complete",
      description: "User completed a step",
      examples: ["done", "finished that", "what's next"],
    },
    {
      id: "stuck",
      description: "User is stuck or confused",
      examples: ["I don't understand", "where is that", "can't find it", "stuck"],
    },
    {
      id: "skip",
      description: "User wants to skip a step",
      examples: ["skip this", "already did that", "I know this"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "assess", when: { condition: "after welcome" }, priority: 10 },
    { id: "e2", from: "assess", to: "guide", when: { condition: "needs assessed" }, priority: 10 },
    { id: "e3", from: "guide", to: "check", when: { condition: "step explained" }, priority: 10 },
    { id: "e4", from: "check", to: "guide", when: { intent: "step_complete" }, priority: 20 },
    { id: "e5", from: "check", to: "fallback", when: { intent: "stuck" }, priority: 50 },
    { id: "e6", from: "fallback", to: "guide", when: { condition: "unstuck" }, priority: 10 },
    { id: "e7", from: "guide", to: "handoff", when: { condition: "onboarding complete" }, priority: 30 },
    { id: "e8", from: "handoff", to: "close", when: { condition: "resources shared" }, priority: 10 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// BOOKING ASSISTANT (alias for appointment setter)
// ============================================

function bookingFlow(): FlowSkeleton {
  return appointmentSetterFlow();
}

// ============================================
// PRODUCT RECOMMENDER FLOW
// ============================================

function recommenderFlow(): FlowSkeleton {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting",
      instructions: "Greet and ask what type of product or solution they're looking for.",
      max_turns: 2,
    },
    {
      id: "discover",
      type: "intake",
      title: "Discovery",
      instructions: "Ask about their needs, preferences, budget range, and any specific requirements.",
      required_fields: ["needs", "preferences", "budget"],
      max_turns: 5,
    },
    {
      id: "recommend",
      type: "recommend",
      title: "Recommendations",
      instructions: "Present 2-3 tailored product recommendations with clear reasons why each fits their needs.",
      max_turns: 4,
    },
    {
      id: "compare",
      type: "answer",
      title: "Compare Options",
      instructions: "Help compare options, answer questions about specific products, highlight differences.",
      max_turns: 6,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Next Steps",
      instructions: "Once they've chosen, guide to purchase/demo or connect with sales for complex purchases.",
      max_turns: 3,
    },
    {
      id: "close",
      type: "close",
      title: "Close",
      instructions: "Thank them and confirm next steps or purchase path.",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Clarify Needs",
      instructions: "Ask clarifying questions to better understand requirements and refine recommendations.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "wants_recommendation",
      description: "User wants product suggestions",
      examples: ["what do you recommend", "which is best", "suggest something"],
    },
    {
      id: "wants_comparison",
      description: "User wants to compare options",
      examples: ["compare these", "what's the difference", "which is better"],
    },
    {
      id: "ready_to_buy",
      description: "User ready to proceed",
      examples: ["I'll take it", "how do I buy", "I want this one"],
    },
    {
      id: "need_more_info",
      description: "User needs more details",
      examples: ["tell me more", "what features", "does it have"],
    },
  ];

  const edges: FlowEdge[] = [
    { id: "e1", from: "greet", to: "discover", when: { condition: "after greeting" }, priority: 10 },
    { id: "e2", from: "discover", to: "recommend", when: { condition: "needs captured" }, priority: 10 },
    { id: "e3", from: "recommend", to: "compare", when: { intent: "wants_comparison" }, priority: 20 },
    { id: "e4", from: "recommend", to: "handoff", when: { intent: "ready_to_buy" }, priority: 30 },
    { id: "e5", from: "compare", to: "handoff", when: { intent: "ready_to_buy" }, priority: 30 },
    { id: "e6", from: "compare", to: "recommend", when: { condition: "needs refined" }, priority: 20 },
    { id: "e7", from: "discover", to: "fallback", when: { condition: "unclear needs" }, priority: 40 },
    { id: "e8", from: "fallback", to: "discover", when: { condition: "clarified" }, priority: 10 },
    { id: "e9", from: "handoff", to: "close", when: { condition: "next steps confirmed" }, priority: 10 },
  ];

  return {
    nodes,
    intents,
    edges,
    entry_node_id: "greet",
    exit_node_ids: ["close"],
  };
}

// ============================================
// CATALOG HELPERS
// ============================================

/**
 * Get all available template keys with flow support
 */
export function getFlowSupportedTemplates(): AgentType[] {
  return [
    "sales_qualifier",
    "appointment_setter",
    "customer_support",
    "lead_capture",
    "faq_bot",
    "onboarding_guide",
    "booking_assistant",
    "product_recommender",
  ];
}

/**
 * Check if a template has a custom flow (vs default)
 */
export function hasCustomFlow(templateKey: AgentType): boolean {
  return getFlowSupportedTemplates().includes(templateKey);
}
