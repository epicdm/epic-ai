import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { emitLeadCreated } from "@/lib/events/emit-lead-events";

// GET all leads with filtering
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: {
      organizationId: string;
      status?: string;
      source?: string;
      OR?: Array<{
        firstName?: { contains: string; mode: "insensitive" };
        lastName?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        company?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      organizationId: org.id,
    };

    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: where as never,
        include: {
          brand: {
            select: { id: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({ where: where as never }),
    ]);

    return NextResponse.json({ leads, total, limit, offset });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST create new lead
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      status,
      source,
      sourceDetails,
      estimatedValue,
      notes,
      tags,
      brandId,
    } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        status: status || "NEW",
        source: source || "MANUAL",
        sourcePlatform: sourceDetails, // Map sourceDetails to sourcePlatform
        score: estimatedValue || 0, // Map estimatedValue to score
        notes,
        tags: tags || [],
        organizationId: org.id,
        brandId,
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
      },
    });

    // Note: leadActivity model is not available in current schema
    // Activity tracking can be added when schema supports it

    // Emit lead created event for automations
    emitLeadCreated({
      id: lead.id,
      organizationId: org.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
    }).catch(console.error);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
