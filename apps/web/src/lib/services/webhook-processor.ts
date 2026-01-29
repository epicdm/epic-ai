/**
 * Webhook Processor
 * TODO: Implement when webhook and automation models are complete
 */

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
export function extractMetaLeadData(payload: unknown): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    const typedPayload = payload as Record<string, unknown>;
    const entry = (typedPayload.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
    const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
    const value = changes?.value as Record<string, unknown> | undefined;

    sourceId = (value?.leadgen_id as string) || "";

    // Extract field data
    const fieldData = (value?.field_data as unknown[]) || [];
    for (const field of fieldData) {
      const typedField = field as Record<string, unknown>;
      const name = (typedField.name as string)?.toLowerCase();
      const fieldValue = ((typedField.values as unknown[])?.[0] as string) || "";

      switch (name) {
        case "email":
          leadData.email = fieldValue;
          break;
        case "full_name": {
          const [first, ...rest] = fieldValue.split(" ");
          leadData.firstName = first;
          leadData.lastName = rest.join(" ");
          break;
        }
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
export function extractGoogleLeadData(payload: unknown): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    const typedPayload = payload as Record<string, unknown>;
    // Google Ads lead form webhook structure
    const leadFormData = (typedPayload.lead_form_submit_data as Record<string, unknown>) || typedPayload;
    sourceId = (leadFormData.lead_id as string) || (leadFormData.google_key as string) || "";

    const columnData = (leadFormData.user_column_data as unknown[]) || [];
    for (const column of columnData) {
      const typedColumn = column as Record<string, unknown>;
      const name = ((typedColumn.column_id as string) || (typedColumn.column_name as string))?.toLowerCase();
      const value = (typedColumn.string_value as string) || "";

      switch (name) {
        case "email":
        case "user_email":
          leadData.email = value;
          break;
        case "full_name":
        case "user_name": {
          const [first, ...rest] = value.split(" ");
          leadData.firstName = first;
          leadData.lastName = rest.join(" ");
          break;
        }
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
export function extractLinkedInLeadData(payload: unknown): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  let sourceId = "";

  try {
    const typedPayload = payload as Record<string, unknown>;
    // LinkedIn Lead Gen Forms webhook structure
    const formResponse = (typedPayload.formResponse as Record<string, unknown>) || typedPayload;
    sourceId = (formResponse.leadId as string) || (formResponse.id as string) || "";

    const answers = (formResponse.answers as unknown[]) || [];
    for (const answer of answers) {
      const typedAnswer = answer as Record<string, unknown>;
      const questionId = (typedAnswer.questionId as string)?.toLowerCase();
      const value = (typedAnswer.answer as string) || "";

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
    if (formResponse.firstName) leadData.firstName = formResponse.firstName as string;
    if (formResponse.lastName) leadData.lastName = formResponse.lastName as string;
    if (formResponse.email) leadData.email = formResponse.email as string;
    if (formResponse.companyName) leadData.company = formResponse.companyName as string;
  } catch (error) {
    console.error("Error extracting LinkedIn lead data:", error);
  }

  return { ...leadData, sourceId };
}

/**
 * Flatten nested object for easier field mapping
 */
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
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
  payload: unknown,
  fieldMappings?: Record<string, string>
): ProcessedLead & { sourceId: string } {
  const leadData: ProcessedLead = {};
  const typedPayload = payload as Record<string, unknown>;
  const sourceId = (typedPayload.id as string) || (typedPayload.lead_id as string) || (typedPayload.sourceId as string) || "";

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
  const flatPayload = flattenObject(typedPayload);

  // Map fields
  for (const [sourceField, targetField] of Object.entries(mappings)) {
    const value = flatPayload[sourceField] || flatPayload[sourceField.toLowerCase()];
    if (value) {
      if (targetField === "fullName") {
        const [first, ...rest] = String(value).split(" ");
        leadData.firstName = first;
        leadData.lastName = rest.join(" ");
      } else {
        (leadData as Record<string, string>)[targetField] = value;
      }
    }
  }

  return { ...leadData, sourceId };
}

/**
 * Process webhook and create lead
 * TODO: Implement fully when Lead model has all required fields
 */
export async function processWebhookLead(
  orgId: string,
  platform: "META" | "GOOGLE" | "LINKEDIN" | "GENERIC",
  payload: unknown,
  _webhookLogId: string,
  config?: { fieldMappings?: Record<string, string>; linkedCampaigns?: string[] }
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

    // Check for duplicate by email
    if (leadData.email) {
      const existing = await prisma.lead.findFirst({
        where: {
          organizationId: orgId,
          email: leadData.email,
        },
      });

      if (existing) {
        return {
          success: true,
          duplicate: true,
          leadId: existing.id,
        };
      }
    }

    // Get the first brand for the organization
    const brand = await prisma.brand.findFirst({
      where: { organizationId: orgId },
    });

    if (!brand) {
      return {
        success: false,
        error: "No brand found for organization",
      };
    }

    // Create lead with available fields
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        brandId: brand.id,
        firstName: leadData.firstName || "",
        lastName: leadData.lastName || "",
        email: leadData.email || null,
        phone: leadData.phone || null,
        company: leadData.company || null,
        jobTitle: leadData.title || null,
        source: `WEBHOOK_${platform}`,
        status: "NEW",
      },
    });

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
 * TODO: Implement when automation model is complete
 */
export async function triggerVoiceAIForLead(_orgId: string, leadId: string): Promise<void> {
  // Stub implementation - just log for now
  console.log(`[Webhook] Would trigger Voice AI for lead ${leadId} - automation model not yet implemented`);
}
