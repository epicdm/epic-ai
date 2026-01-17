/**
 * Cross-Channel Workflow Templates
 *
 * Pre-built workflow templates for common cross-channel marketing scenarios.
 * All workflows leverage Brand Brain for consistent voice across channels.
 *
 * "One Brain, Many Voices" - Same brand personality, multiple touchpoints.
 */

import { ChannelType } from "@epic-ai/database";
import { WorkflowTemplate, WorkflowCategory } from "./types";

/**
 * Lead Nurture Workflow
 *
 * Multi-channel lead nurturing sequence:
 * Social engagement → Email sequence → Voice follow-up
 */
export const LEAD_NURTURE_WORKFLOW: WorkflowTemplate = {
  id: "tpl_lead_nurture",
  name: "Lead Nurture Sequence",
  description:
    "Nurture leads across social, email, and voice channels with consistent brand messaging. Perfect for converting engaged prospects into customers.",
  category: "LEAD_NURTURE",

  trigger: "event",
  triggerConfig: {
    event: "lead.created",
    conditions: [
      {
        field: "lead.source",
        operator: "in_list",
        value: ["ORGANIC_SOCIAL", "WEBSITE", "REFERRAL"],
      },
    ],
  },

  channels: [ChannelType.SOCIAL, ChannelType.EMAIL, ChannelType.VOICE],
  requiresBrandBrain: true,
  brandBrainFeatures: ["voiceTone", "formalityLevel", "mustMention", "ctaStyle"],

  entryStepId: "step_1",
  steps: [
    {
      id: "step_1",
      name: "Record Initial Touchpoint",
      action: "attribute",
      config: {
        touchpointType: "lead_created",
      },
      recordTouchpoint: true,
      touchpointAction: "SIGNUP",
      onSuccess: "step_2",
    },
    {
      id: "step_2",
      name: "Welcome Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "welcome",
        subject: "Welcome to {{brand.name}}!",
        personalizeContent: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "step_3",
      onFailure: "step_3", // Continue even if email fails
    },
    {
      id: "step_3",
      name: "Wait 2 Days",
      action: "wait",
      config: {
        duration: 2,
        unit: "days",
      },
      delayType: "business_hours",
      onSuccess: "step_4",
    },
    {
      id: "step_4",
      name: "Check Engagement",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "lead.engagementScore",
            operator: "greater_than",
            value: 50,
          },
          nextStepId: "step_5a", // High engagement path
        },
        {
          condition: {
            field: "lead.engagementScore",
            operator: "less_than",
            value: 50,
          },
          nextStepId: "step_5b", // Low engagement path
        },
      ],
    },
    {
      id: "step_5a",
      name: "High-Value Social Engage",
      action: "social_dm",
      channel: ChannelType.SOCIAL,
      config: {
        messageType: "personalized_outreach",
        mentionPainPoints: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      delayMinutes: 60,
      onSuccess: "step_6a",
    },
    {
      id: "step_5b",
      name: "Nurture Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "value_proposition",
        includeTestimonial: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "step_6b",
    },
    {
      id: "step_6a",
      name: "Schedule Discovery Call",
      action: "voice_call_schedule",
      channel: ChannelType.VOICE,
      config: {
        callType: "discovery",
        useAIAgent: true,
        agentPersonality: "consultative",
      },
      useBrandVoice: true,
      delayMinutes: 1440, // 24 hours
      onSuccess: "step_7",
    },
    {
      id: "step_6b",
      name: "Wait 3 Days",
      action: "wait",
      config: {
        duration: 3,
        unit: "days",
      },
      onSuccess: "step_6b_check",
    },
    {
      id: "step_6b_check",
      name: "Re-check Engagement",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "lead.engagementScore",
            operator: "greater_than",
            value: 30,
          },
          nextStepId: "step_6a", // Move to high-value path
        },
        {
          condition: {
            field: "lead.engagementScore",
            operator: "less_than",
            value: 30,
          },
          nextStepId: "step_end_dormant",
        },
      ],
    },
    {
      id: "step_7",
      name: "Update Lead Status",
      action: "update_lead",
      config: {
        status: "QUALIFIED",
        addTag: "nurture_complete",
      },
      onSuccess: "step_end_success",
    },
    {
      id: "step_end_success",
      name: "Complete - Success",
      action: "end",
      config: {
        outcome: "success",
        notifyTeam: true,
      },
    },
    {
      id: "step_end_dormant",
      name: "Complete - Dormant",
      action: "end",
      config: {
        outcome: "dormant",
        scheduleReEngagement: true,
        reEngagementDays: 30,
      },
    },
  ],

  isTemplate: true,
  isActive: true,
  version: "1.0.0",
};

/**
 * Customer Onboarding Workflow
 *
 * Multi-channel onboarding:
 * Welcome email → Onboarding call → Social connection → Check-in
 */
export const CUSTOMER_ONBOARDING_WORKFLOW: WorkflowTemplate = {
  id: "tpl_customer_onboarding",
  name: "Customer Onboarding",
  description:
    "Onboard new customers with personalized welcome sequences across email, voice, and social. Ensures a smooth start and high satisfaction.",
  category: "CUSTOMER_ONBOARDING",

  trigger: "event",
  triggerConfig: {
    event: "customer.created",
  },

  channels: [ChannelType.EMAIL, ChannelType.VOICE, ChannelType.SOCIAL],
  requiresBrandBrain: true,
  brandBrainFeatures: ["voiceTone", "values", "mustMention"],

  entryStepId: "onb_1",
  steps: [
    {
      id: "onb_1",
      name: "Welcome Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "customer_welcome",
        includeGettingStarted: true,
        includeResources: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "onb_2",
    },
    {
      id: "onb_2",
      name: "Wait 1 Day",
      action: "wait",
      config: {
        duration: 1,
        unit: "days",
      },
      delayType: "business_hours",
      onSuccess: "onb_3",
    },
    {
      id: "onb_3",
      name: "Onboarding Call",
      action: "voice_call_outbound",
      channel: ChannelType.VOICE,
      config: {
        callType: "onboarding",
        useAIAgent: true,
        agentPersonality: "helpful_guide",
        objectives: ["welcome", "answer_questions", "set_expectations"],
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "CALL",
      onSuccess: "onb_4",
      onFailure: "onb_4_alt",
    },
    {
      id: "onb_4",
      name: "Social Connection",
      action: "social_engage",
      channel: ChannelType.SOCIAL,
      config: {
        action: "follow_and_welcome",
        platforms: ["twitter", "linkedin"],
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "ENGAGE",
      delayMinutes: 120,
      onSuccess: "onb_5",
    },
    {
      id: "onb_4_alt",
      name: "Missed Call - Email Follow-up",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "missed_onboarding_call",
        includeRescheduleLink: true,
      },
      useBrandVoice: true,
      onSuccess: "onb_5",
    },
    {
      id: "onb_5",
      name: "Wait 5 Days",
      action: "wait",
      config: {
        duration: 5,
        unit: "days",
      },
      onSuccess: "onb_6",
    },
    {
      id: "onb_6",
      name: "Check-in Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "onboarding_checkin",
        askForFeedback: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "onb_7",
    },
    {
      id: "onb_7",
      name: "Update Customer Status",
      action: "update_lead",
      config: {
        status: "ONBOARDED",
        addTag: "onboarding_complete",
      },
      onSuccess: "onb_end",
    },
    {
      id: "onb_end",
      name: "Complete",
      action: "end",
      config: {
        outcome: "onboarded",
        notifyTeam: true,
      },
    },
  ],

  isTemplate: true,
  isActive: true,
  version: "1.0.0",
};

/**
 * Re-engagement Workflow
 *
 * Win back dormant contacts:
 * Voice check-in → Social retargeting → Email win-back
 */
export const RE_ENGAGEMENT_WORKFLOW: WorkflowTemplate = {
  id: "tpl_re_engagement",
  name: "Re-engagement Campaign",
  description:
    "Re-engage dormant contacts with a personalized multi-channel approach. Voice check-ins, social touchpoints, and win-back offers.",
  category: "RE_ENGAGEMENT",

  trigger: "condition",
  triggerConfig: {
    conditions: [
      {
        field: "contact.lastActivityDays",
        operator: "greater_than",
        value: 30,
      },
      {
        field: "contact.status",
        operator: "not_equals",
        value: "unsubscribed",
      },
    ],
  },

  channels: [ChannelType.VOICE, ChannelType.SOCIAL, ChannelType.EMAIL],
  requiresBrandBrain: true,
  brandBrainFeatures: ["voiceTone", "ctaStyle", "uniqueSellingPoints"],

  entryStepId: "re_1",
  steps: [
    {
      id: "re_1",
      name: "AI Analysis",
      action: "ai_analyze",
      config: {
        analyzeType: "re_engagement_potential",
        factors: ["past_engagement", "purchase_history", "social_activity"],
      },
      onSuccess: "re_2",
    },
    {
      id: "re_2",
      name: "Segment by Potential",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "analysis.reEngagementScore",
            operator: "greater_than",
            value: 70,
          },
          nextStepId: "re_3a", // High potential - voice first
        },
        {
          condition: {
            field: "analysis.reEngagementScore",
            operator: "greater_than",
            value: 40,
          },
          nextStepId: "re_3b", // Medium potential - email first
        },
        {
          condition: {
            field: "analysis.reEngagementScore",
            operator: "less_than",
            value: 40,
          },
          nextStepId: "re_3c", // Low potential - social only
        },
      ],
    },
    {
      id: "re_3a",
      name: "Personal Check-in Call",
      action: "voice_call_outbound",
      channel: ChannelType.VOICE,
      config: {
        callType: "check_in",
        useAIAgent: true,
        agentPersonality: "caring_consultant",
        objectives: ["reconnect", "understand_needs", "offer_value"],
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "CALL",
      onSuccess: "re_4",
      onFailure: "re_3b",
    },
    {
      id: "re_3b",
      name: "We Miss You Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "we_miss_you",
        includePersonalizedOffer: true,
        highlightNewFeatures: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "re_4",
    },
    {
      id: "re_3c",
      name: "Social Retargeting",
      action: "social_engage",
      channel: ChannelType.SOCIAL,
      config: {
        action: "retarget_post",
        contentType: "value_reminder",
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "VIEW",
      onSuccess: "re_end_low",
    },
    {
      id: "re_4",
      name: "Wait 3 Days",
      action: "wait",
      config: {
        duration: 3,
        unit: "days",
      },
      onSuccess: "re_5",
    },
    {
      id: "re_5",
      name: "Check Response",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "contact.hasResponded",
            operator: "equals",
            value: true,
          },
          nextStepId: "re_6_engaged",
        },
        {
          condition: {
            field: "contact.hasResponded",
            operator: "equals",
            value: false,
          },
          nextStepId: "re_6_no_response",
        },
      ],
    },
    {
      id: "re_6_engaged",
      name: "Update Status - Re-engaged",
      action: "update_lead",
      config: {
        status: "ACTIVE",
        removeTag: "dormant",
        addTag: "re_engaged",
      },
      onSuccess: "re_end_success",
    },
    {
      id: "re_6_no_response",
      name: "Final Offer Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "final_offer",
        includeSpecialDiscount: true,
        urgencyLevel: "moderate",
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "re_end_attempted",
    },
    {
      id: "re_end_success",
      name: "Complete - Re-engaged",
      action: "end",
      config: {
        outcome: "re_engaged",
        notifyTeam: true,
      },
    },
    {
      id: "re_end_attempted",
      name: "Complete - Attempted",
      action: "end",
      config: {
        outcome: "attempted",
        scheduleNextAttempt: true,
        nextAttemptDays: 60,
      },
    },
    {
      id: "re_end_low",
      name: "Complete - Low Priority",
      action: "end",
      config: {
        outcome: "low_priority_touched",
      },
    },
  ],

  isTemplate: true,
  isActive: true,
  version: "1.0.0",
};

/**
 * Event Promotion Workflow
 *
 * Multi-channel event promotion:
 * Announcement → Reminders → Voice for high-value → Post-event follow-up
 */
export const EVENT_PROMOTION_WORKFLOW: WorkflowTemplate = {
  id: "tpl_event_promotion",
  name: "Event Promotion",
  description:
    "Promote webinars, events, or launches across all channels. Includes announcements, reminders, and personal outreach for high-value contacts.",
  category: "EVENT_PROMOTION",

  trigger: "manual",
  triggerConfig: {},

  channels: [ChannelType.SOCIAL, ChannelType.EMAIL, ChannelType.VOICE],
  requiresBrandBrain: true,
  brandBrainFeatures: ["voiceTone", "ctaStyle", "audiences"],

  defaultConfig: {
    eventName: "{{event.name}}",
    eventDate: "{{event.date}}",
    eventType: "webinar", // webinar, conference, launch, demo
  },

  entryStepId: "evt_1",
  steps: [
    {
      id: "evt_1",
      name: "Social Announcement",
      action: "social_post",
      channel: ChannelType.SOCIAL,
      config: {
        contentType: "event_announcement",
        platforms: ["twitter", "linkedin", "facebook"],
        includeRegistrationLink: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "VIEW",
      onSuccess: "evt_2",
    },
    {
      id: "evt_2",
      name: "Email Invitation",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "event_invitation",
        segmentByInterest: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "evt_3",
    },
    {
      id: "evt_3",
      name: "Wait Until 3 Days Before",
      action: "wait",
      config: {
        waitUntil: "{{event.date - 3 days}}",
      },
      onSuccess: "evt_4",
    },
    {
      id: "evt_4",
      name: "Segment by Registration",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "contact.hasRegistered",
            operator: "equals",
            value: true,
          },
          nextStepId: "evt_5a", // Registered - reminder path
        },
        {
          condition: {
            field: "contact.hasRegistered",
            operator: "equals",
            value: false,
          },
          nextStepId: "evt_5b", // Not registered - push path
        },
      ],
    },
    {
      id: "evt_5a",
      name: "Reminder Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "event_reminder",
        includeCalendarLink: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "evt_6a",
    },
    {
      id: "evt_5b",
      name: "Check Lead Score for Voice",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "lead.score",
            operator: "greater_than",
            value: 60,
          },
          nextStepId: "evt_5b_call", // High value - personal call
        },
        {
          condition: {
            field: "lead.score",
            operator: "less_than",
            value: 60,
          },
          nextStepId: "evt_5b_email", // Lower value - email push
        },
      ],
    },
    {
      id: "evt_5b_call",
      name: "Personal Invitation Call",
      action: "voice_call_outbound",
      channel: ChannelType.VOICE,
      config: {
        callType: "event_invitation",
        useAIAgent: true,
        agentPersonality: "enthusiastic_host",
        objectives: ["invite", "highlight_value", "register"],
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "CALL",
      onSuccess: "evt_6b",
    },
    {
      id: "evt_5b_email",
      name: "Last Chance Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "event_last_chance",
        urgencyLevel: "high",
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "evt_6b",
    },
    {
      id: "evt_6a",
      name: "Social Reminder Post",
      action: "social_post",
      channel: ChannelType.SOCIAL,
      config: {
        contentType: "event_reminder",
        platforms: ["twitter", "linkedin"],
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "VIEW",
      onSuccess: "evt_end_registered",
    },
    {
      id: "evt_6b",
      name: "Wait for Event",
      action: "wait",
      config: {
        waitUntil: "{{event.date + 1 day}}",
      },
      onSuccess: "evt_end_not_registered",
    },
    {
      id: "evt_end_registered",
      name: "Complete - Registered",
      action: "end",
      config: {
        outcome: "registered",
        addToAttendeeList: true,
      },
    },
    {
      id: "evt_end_not_registered",
      name: "Complete - Not Registered",
      action: "end",
      config: {
        outcome: "not_registered",
        addToFollowUpList: true,
      },
    },
  ],

  isTemplate: true,
  isActive: true,
  version: "1.0.0",
};

/**
 * Sales Outreach Workflow
 *
 * Multi-touch sales sequence:
 * Social research → Personalized email → Voice follow-up → Meeting booking
 */
export const SALES_OUTREACH_WORKFLOW: WorkflowTemplate = {
  id: "tpl_sales_outreach",
  name: "Sales Outreach Sequence",
  description:
    "Structured sales outreach across channels. Social warming, personalized emails, and voice calls to book meetings with qualified prospects.",
  category: "SALES_OUTREACH",

  trigger: "event",
  triggerConfig: {
    event: "lead.qualified",
  },

  channels: [ChannelType.SOCIAL, ChannelType.EMAIL, ChannelType.VOICE],
  requiresBrandBrain: true,
  brandBrainFeatures: ["voiceTone", "uniqueSellingPoints", "audiences", "ctaStyle"],

  entryStepId: "sales_1",
  steps: [
    {
      id: "sales_1",
      name: "Social Research & Connect",
      action: "social_engage",
      channel: ChannelType.SOCIAL,
      config: {
        action: "research_and_connect",
        platforms: ["linkedin"],
        engagementType: "thoughtful_comment",
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "ENGAGE",
      onSuccess: "sales_2",
    },
    {
      id: "sales_2",
      name: "Wait 1 Day",
      action: "wait",
      config: {
        duration: 1,
        unit: "days",
      },
      delayType: "business_hours",
      onSuccess: "sales_3",
    },
    {
      id: "sales_3",
      name: "Personalized Email #1",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "sales_intro",
        personalize: ["company_research", "pain_points", "mutual_connections"],
      },
      useBrandVoice: true,
      brandBrainConfig: {
        tone: "consultative",
        formality: 3,
      },
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "sales_4",
    },
    {
      id: "sales_4",
      name: "Wait 3 Days",
      action: "wait",
      config: {
        duration: 3,
        unit: "days",
      },
      delayType: "business_hours",
      onSuccess: "sales_5",
    },
    {
      id: "sales_5",
      name: "Check Email Engagement",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "email.opened",
            operator: "equals",
            value: true,
          },
          nextStepId: "sales_6a", // Opened - voice follow-up
        },
        {
          condition: {
            field: "email.opened",
            operator: "equals",
            value: false,
          },
          nextStepId: "sales_6b", // Not opened - second email
        },
      ],
    },
    {
      id: "sales_6a",
      name: "Voice Follow-up",
      action: "voice_call_outbound",
      channel: ChannelType.VOICE,
      config: {
        callType: "sales_follow_up",
        useAIAgent: true,
        agentPersonality: "consultative_seller",
        objectives: ["qualify", "understand_needs", "book_meeting"],
        fallbackToVoicemail: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "CALL",
      onSuccess: "sales_7",
      onFailure: "sales_6b",
    },
    {
      id: "sales_6b",
      name: "Follow-up Email #2",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "sales_follow_up",
        includeValueProp: true,
        includeCalendarLink: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "sales_7b",
    },
    {
      id: "sales_7",
      name: "Check Call Outcome",
      action: "condition",
      config: {},
      branches: [
        {
          condition: {
            field: "call.outcome",
            operator: "equals",
            value: "meeting_booked",
          },
          nextStepId: "sales_end_meeting",
        },
        {
          condition: {
            field: "call.outcome",
            operator: "equals",
            value: "interested",
          },
          nextStepId: "sales_8",
        },
        {
          condition: {
            field: "call.outcome",
            operator: "equals",
            value: "not_interested",
          },
          nextStepId: "sales_end_not_interested",
        },
      ],
    },
    {
      id: "sales_7b",
      name: "Wait 4 Days",
      action: "wait",
      config: {
        duration: 4,
        unit: "days",
      },
      onSuccess: "sales_8",
    },
    {
      id: "sales_8",
      name: "Final Touch - Breakup Email",
      action: "email_send",
      channel: ChannelType.EMAIL,
      config: {
        template: "sales_breakup",
        tone: "respectful_close",
        keepDoorOpen: true,
      },
      useBrandVoice: true,
      recordTouchpoint: true,
      touchpointAction: "MESSAGE",
      onSuccess: "sales_end_nurture",
    },
    {
      id: "sales_end_meeting",
      name: "Complete - Meeting Booked",
      action: "end",
      config: {
        outcome: "meeting_booked",
        notifyTeam: true,
        updateCRM: true,
      },
    },
    {
      id: "sales_end_not_interested",
      name: "Complete - Not Interested",
      action: "end",
      config: {
        outcome: "not_interested",
        addToDoNotContact: false,
        scheduleReEngagement: true,
        reEngagementDays: 90,
      },
    },
    {
      id: "sales_end_nurture",
      name: "Complete - Move to Nurture",
      action: "end",
      config: {
        outcome: "move_to_nurture",
        addToNurtureList: true,
      },
    },
  ],

  isTemplate: true,
  isActive: true,
  version: "1.0.0",
};

/**
 * All available workflow templates
 */
export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  lead_nurture: LEAD_NURTURE_WORKFLOW,
  customer_onboarding: CUSTOMER_ONBOARDING_WORKFLOW,
  re_engagement: RE_ENGAGEMENT_WORKFLOW,
  event_promotion: EVENT_PROMOTION_WORKFLOW,
  sales_outreach: SALES_OUTREACH_WORKFLOW,
};

/**
 * Get workflow template by ID or category
 */
export function getWorkflowTemplate(
  idOrCategory: string
): WorkflowTemplate | undefined {
  return (
    WORKFLOW_TEMPLATES[idOrCategory] ||
    Object.values(WORKFLOW_TEMPLATES).find(
      (t) => t.id === idOrCategory || t.category === idOrCategory
    )
  );
}

/**
 * Get all templates for a specific category
 */
export function getTemplatesByCategory(
  category: WorkflowCategory
): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES).filter(
    (t) => t.category === category
  );
}

/**
 * Get templates that use specific channels
 */
export function getTemplatesByChannels(
  channels: ChannelType[]
): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES).filter((t) =>
    channels.every((c) => t.channels.includes(c))
  );
}
