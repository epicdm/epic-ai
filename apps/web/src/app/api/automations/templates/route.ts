import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const TEMPLATES = [
  {
    id: "new-lead-welcome",
    name: "Welcome New Lead",
    description: "Add a welcome note when a new lead is created",
    trigger: "LEAD_CREATED",
    conditions: [],
    actions: [
      {
        type: "add_lead_activity",
        config: {
          activityType: "NOTE",
          title: "Welcome!",
          description: "New lead added to the system. Follow up within 24 hours.",
        },
      },
    ],
  },
  {
    id: "call-completed-update-status",
    name: "Update Lead After Call",
    description: "Change lead status to CONTACTED after a completed call",
    trigger: "CALL_COMPLETED",
    conditions: [],
    actions: [
      {
        type: "update_lead_status",
        config: { status: "CONTACTED" },
      },
      {
        type: "add_lead_activity",
        config: {
          activityType: "CALL",
          title: "Call completed",
          description: "Voice call completed successfully",
        },
      },
    ],
  },
  {
    id: "call-failed-tag",
    name: "Tag Failed Calls",
    description: "Add a tag to leads when a call fails",
    trigger: "CALL_FAILED",
    conditions: [],
    actions: [
      {
        type: "add_lead_tag",
        config: { tag: "call-failed" },
      },
      {
        type: "add_lead_activity",
        config: {
          activityType: "NOTE",
          title: "Call failed",
          description: "Voice call attempt failed. Schedule retry.",
        },
      },
    ],
  },
  {
    id: "qualified-lead-notify",
    name: "Notify on Qualified Lead",
    description: "Send notification when a lead becomes qualified",
    trigger: "LEAD_STATUS_CHANGED",
    conditions: [{ field: "newStatus", operator: "equals", value: "QUALIFIED" }],
    actions: [
      {
        type: "send_notification",
        config: {
          notificationType: "email",
          subject: "New Qualified Lead!",
          message: "A lead has been qualified and is ready for follow-up.",
        },
      },
    ],
  },
  {
    id: "social-to-lead",
    name: "Create Lead from Social",
    description: "Create a new lead when social engagement is detected",
    trigger: "SOCIAL_ENGAGEMENT",
    conditions: [],
    actions: [
      {
        type: "create_lead",
        config: {
          source: "SOCIAL_MEDIA",
          status: "NEW",
        },
      },
    ],
  },
];

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(TEMPLATES);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
