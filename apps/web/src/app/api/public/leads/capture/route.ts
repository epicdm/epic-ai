import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { emitLeadCreated } from "@/lib/events/emit-lead-events";

/**
 * Public endpoint for lead capture forms.
 * No authentication required - uses organization ID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      brandId,
      firstName,
      lastName,
      email,
      phone,
      company,
      source,
      sourceDetails,
      customFields,
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (!firstName && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of firstName, email, or phone is required" },
        { status: 400 }
      );
    }

    // Verify organization exists and get default brand
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        brands: { take: 1 },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Invalid organization" },
        { status: 400 }
      );
    }

    // Use provided brandId or fall back to first brand
    const targetBrandId = brandId || org.brands[0]?.id;
    if (!targetBrandId) {
      return NextResponse.json(
        { error: "No brand found for organization" },
        { status: 400 }
      );
    }

    // Check for duplicate by email or phone
    let existingLead = null;
    if (email) {
      existingLead = await prisma.lead.findFirst({
        where: { organizationId, email },
      });
    }
    if (!existingLead && phone) {
      existingLead = await prisma.lead.findFirst({
        where: { organizationId, phone },
      });
    }

    if (existingLead) {
      // Update existing lead with new info
      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          firstName: firstName || existingLead.firstName,
          lastName: lastName || existingLead.lastName,
          company: company || existingLead.company,
          customFields: customFields
            ? {
                ...((existingLead.customFields as object) || {}),
                ...customFields,
              }
            : existingLead.customFields,
        },
      });

      // Note: LeadActivity model not in current schema

      return NextResponse.json({
        success: true,
        leadId: updatedLead.id,
        isNew: false,
      });
    }

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        firstName: firstName || "Unknown",
        lastName,
        email,
        phone,
        company,
        source: source || "WEBSITE",
        sourcePlatform: sourceDetails, // Map to sourcePlatform
        customFields: customFields || {},
        organizationId,
        brandId: targetBrandId,
        status: "NEW",
      },
    });

    // Note: LeadActivity model not in current schema

    // Emit lead created event for automations
    emitLeadCreated({
      id: lead.id,
      organizationId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
    }).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error capturing lead:", error);
    return NextResponse.json(
      { error: "Failed to capture lead" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
