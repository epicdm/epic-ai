import { prisma } from "@epic-ai/database";

interface ProcessedLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  [key: string]: string | undefined;
}

interface WebhookProcessResult {
  success: boolean;
  leadId?: string;
  error?: string;
  duplicate?: boolean;
}

/**
 * Extract lead data from Meta webhook payload
 */
export function extractMetaLeadData(payload: any): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    sourceId = value?.leadgen_id || "";

    // Extract field data
    const fieldData = value?.field_data || [];
    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const fieldValue = field.values?.[0] || "";

      switch (name) {
        case "email":
          leadData.email = fieldValue;
          break;
        case "full_name":
          const [first, ...rest] = fieldValue.split(" ");
          leadData.firstName = first;
          leadData.lastName = rest.join(" ");
          break;
        case "first_name":
          leadData.firstName = fieldValue;
          break;
        case "last_name":
          leadData.lastName = fieldValue;
          break;
        case "phone_number":
        case "phone":
          leadData.phone = fieldValue;
          break;
        case "company_name":
        case "company":
          leadData.company = fieldValue;
          break;
        case "job_title":
        case "title":
          leadData.title = fieldValue;
          break;
        default:
          leadData[name] = fieldValue;
      }
    }
  } catch (error) {
    console.error("Error extracting Meta lead data:", error);
  }

  return { ...leadData, sourceId };
}

/**
 * Extract lead data from Google webhook payload
 */
export function extractGoogleLeadData(payload: any): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    // Google Ads lead form webhook structure
    const leadFormData = payload.lead_form_submit_data || payload;
    sourceId = leadFormData.lead_id || leadFormData.google_key || "";

    const columnData = leadFormData.user_column_data || [];
    for (const column of columnData) {
      const name = column.column_id?.toLowerCase() || column.column_name?.toLowerCase();
      const value = column.string_value || "";

      switch (name) {
        case "email":
        case "user_email":
          leadData.email = value;
          break;
        case "full_name":
        case "user_name":
          const [first, ...rest] = value.split(" ");
          leadData.firstName = first;
          leadData.lastName = rest.join(" ");
          break;
        case "first_name":
          leadData.firstName = value;
          break;
        case "last_name":
          leadData.lastName = value;
          break;
        case "phone_number":
        case "phone":
          leadData.phone = value;
          break;
        case "company_name":
        case "company":
          leadData.company = value;
          break;
        default:
          leadData[name] = value;
      }
    }
  } catch (error) {
    console.error("Error extracting Google lead data:", error);
  }

  return { ...leadData, sourceId };
}

/**
 * Extract lead data from LinkedIn webhook payload
 */
export function extractLinkedInLeadData(payload: any): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    // LinkedIn Lead Gen Forms webhook structure
    const formResponse = payload.formResponse || payload;
    sourceId = formResponse.leadId || formResponse.id || "";

    const answers = formResponse.answers || [];
    for (const answer of answers) {
      const questionId = answer.questionId?.toLowerCase();
      const value = answer.answer || "";

      switch (questionId) {
        case "email":
        case "emailaddress":
          leadData.email = value;
          break;
        case "firstname":
          leadData.firstName = value;
          break;
        case "lastname":
          leadData.lastName = value;
          break;
        case "phonenumber":
        case "phone":
          leadData.phone = value;
          break;
        case "companyname":
        case "company":
          leadData.company = value;
          break;
        case "title":
        case "jobtitle":
          leadData.title = value;
          break;
        default:
          leadData[questionId] = value;
      }
    }

    // LinkedIn also provides some data directly
    if (formResponse.firstName) leadData.firstName = formResponse.firstName;
    if (formResponse.lastName) leadData.lastName = formResponse.lastName;
    if (formResponse.email) leadData.email = formResponse.email;
    if (formResponse.companyName) leadData.company = formResponse.companyName;
  } catch (error) {
    console.error("Error extracting LinkedIn lead data:", error);
  }

  return { ...leadData, sourceId };
}

/**
 * Flatten nested object for easier field mapping
 */
function flattenObject(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (typeof value === "string" || typeof value === "number") {
      result[key] = String(value);
      result[newKey] = String(value);
    }
  }

  return result;
}

/**
 * Extract lead data from generic webhook payload
 */
export function extractGenericLeadData(
  payload: any,
  fieldMappings?: Record<string, string>
): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  const sourceId = payload.id || payload.lead_id || payload.sourceId || "";

  // Default field mappings
  const mappings = fieldMappings || {
    email: "email",
    first_name: "firstName",
    firstName: "firstName",
    last_name: "lastName",
    lastName: "lastName",
    full_name: "fullName",
    name: "fullName",
    phone: "phone",
    phone_number: "phone",
    company: "company",
    company_name: "company",
    title: "title",
    job_title: "title",
  };

  // Flatten nested payload
  const flatPayload = flattenObject(payload);

  // Map fields
  for (const [sourceField, targetField] of Object.entries(mappings)) {
    const value = flatPayload[sourceField] || flatPayload[sourceField.toLowerCase()];
    if (value) {
      if (targetField === "fullName") {
        const [first, ...rest] = String(value).split(" ");
        leadData.firstName = first;
        leadData.lastName = rest.join(" ");
      } else {
        (leadData as any)[targetField] = value;
      }
    }
  }

  return { ...leadData, sourceId };
}

/**
 * Process webhook and create lead
 */
export async function processWebhookLead(
  orgId: string,
  platform: "META" | "GOOGLE" | "LINKEDIN" | "GENERIC",
  payload: any,
  webhookLogId: string,
  config?: any
): Promise<WebhookProcessResult> {
  try {
    // Extract lead data based on platform
    let leadData: ProcessedLead & { sourceId: string };

    switch (platform) {
      case "META":
        leadData = extractMetaLeadData(payload);
        break;
      case "GOOGLE":
        leadData = extractGoogleLeadData(payload);
        break;
      case "LINKEDIN":
        leadData = extractLinkedInLeadData(payload);
        break;
      case "GENERIC":
        leadData = extractGenericLeadData(payload, config?.fieldMappings);
        break;
      default:
        leadData = extractGenericLeadData(payload);
    }

    // Validate required fields
    if (!leadData.email && !leadData.phone) {
      return {
        success: false,
        error: "No email or phone provided",
      };
    }

    // Check for duplicate by sourceId
    if (leadData.sourceId) {
      const existing = await prisma.lead.findFirst({
        where: {
          organizationId: orgId,
          sourceId: leadData.sourceId,
        },
      });

      if (existing) {
        return {
          success: false,
          duplicate: true,
          leadId: existing.id,
          error: "Duplicate lead",
        };
      }
    }

    // Check for duplicate by email
    if (leadData.email) {
      const existing = await prisma.lead.findFirst({
        where: {
          organizationId: orgId,
          email: leadData.email,
        },
      });

      if (existing) {
        // Update existing lead with new source info
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            sourcePlatform: platform.toLowerCase(),
            sourceId: leadData.sourceId,
            webhookLogId,
          },
        });

        return {
          success: true,
          duplicate: true,
          leadId: existing.id,
        };
      }
    }

    // Extract campaign info from payload
    let sourceCampaign = "";
    let sourceAdSet = "";
    let sourceAd = "";

    if (platform === "META") {
      sourceCampaign = payload.entry?.[0]?.changes?.[0]?.value?.campaign_name || "";
      sourceAdSet = payload.entry?.[0]?.changes?.[0]?.value?.adset_name || "";
      sourceAd = payload.entry?.[0]?.changes?.[0]?.value?.ad_name || "";
    }

    // Try to match to an AdCampaign
    let adCampaignId: string | null = null;
    if (sourceCampaign && config?.linkedCampaigns?.length > 0) {
      const matchedCampaign = await prisma.adCampaign.findFirst({
        where: {
          orgId,
          id: { in: config.linkedCampaigns },
          name: { contains: sourceCampaign, mode: "insensitive" },
        },
      });
      adCampaignId = matchedCampaign?.id || null;
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        firstName: leadData.firstName || "",
        lastName: leadData.lastName || "",
        email: leadData.email || null,
        phone: leadData.phone || null,
        company: leadData.company || null,
        jobTitle: leadData.title || null,
        source: `WEBHOOK_${platform}`,
        sourceId: leadData.sourceId || null,
        sourcePlatform: platform.toLowerCase(),
        sourceCampaign,
        sourceAdSet,
        sourceAd,
        webhookLogId,
        adCampaignId,
        status: "NEW",
      },
    });

    // Update AdCampaign metrics if linked
    if (adCampaignId) {
      await prisma.adCampaignMetrics.update({
        where: { campaignId: adCampaignId },
        data: {
          leads: { increment: 1 },
          lastUpdated: new Date(),
        },
      }).catch(() => {}); // Ignore if metrics don't exist
    }

    return {
      success: true,
      leadId: lead.id,
    };
  } catch (error) {
    console.error("Error processing webhook lead:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Trigger Voice AI for new lead
 */
export async function triggerVoiceAIForLead(orgId: string, leadId: string): Promise<void> {
  try {
    // Check if there's an automation for new leads
    const automation = await prisma.automation.findFirst({
      where: {
        organizationId: orgId,
        trigger: "LEAD_CREATED",
        isActive: true,
      },
    });

    if (!automation) {
      console.log("No automation found for new leads");
      return;
    }

    // Trigger the automation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leads.epic.dm";

    await fetch(`${appUrl}/api/automations/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET || "internal"}`,
      },
      body: JSON.stringify({
        orgId,
        trigger: "LEAD_CREATED",
        data: { leadId },
      }),
    }).catch((err) => {
      console.error("Error triggering automation:", err);
    });

    console.log(`Triggered Voice AI automation for lead ${leadId}`);
  } catch (error) {
    console.error("Error triggering Voice AI:", error);
  }
}
