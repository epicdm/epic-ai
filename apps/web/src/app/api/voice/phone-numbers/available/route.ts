/**
 * Available Phone Numbers API
 * GET - List available DIDs from Magnus Billing for purchase
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";

// Voice service URL - auto-detects production (Vercel) vs development
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL ||
  (process.env.VERCEL ? "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice" : "http://localhost:5000");

interface AvailableDID {
  did_number: string;
  country_code: string;
  area_code: string;
  city?: string;
  state?: string;
  monthly_cost: number;
  setup_cost: number;
  features: string[];
  available: boolean;
}

interface MagnusAvailableResponse {
  dids: AvailableDID[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * GET /api/voice/phone-numbers/available - List available DIDs from Magnus Billing
 *
 * Query params:
 * - country_code: Filter by country (e.g., "US", "CA")
 * - area_code: Filter by area code (e.g., "212", "415")
 * - city: Filter by city name
 * - limit: Number of results (default: 20)
 * - page: Page number (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country_code") || "US";
    const areaCode = searchParams.get("area_code") || "";
    const city = searchParams.get("city") || "";
    const limit = searchParams.get("limit") || "20";
    const page = searchParams.get("page") || "1";

    // Build query string for voice service
    const queryParams = new URLSearchParams({
      country_code: countryCode,
      limit: limit,
      page: page,
    });

    if (areaCode) {
      queryParams.set("area_code", areaCode);
    }

    if (city) {
      queryParams.set("city", city);
    }

    // Call voice service to get available DIDs from Magnus
    const magnusResponse = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/dids/available?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!magnusResponse.ok) {
      const errorText = await magnusResponse.text();
      console.error("Magnus API error:", magnusResponse.status, errorText);

      // Return empty results if Magnus is not configured or unavailable
      if (magnusResponse.status === 503 || magnusResponse.status === 404) {
        return NextResponse.json({
          dids: [],
          total: 0,
          page: parseInt(page),
          per_page: parseInt(limit),
          message: "Magnus Billing service is not configured or unavailable",
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch available numbers from Magnus Billing" },
        { status: magnusResponse.status }
      );
    }

    const data: MagnusAvailableResponse = await magnusResponse.json();

    // Transform the response for frontend consumption
    const transformedDids = data.dids.map((did) => ({
      phoneNumber: did.did_number,
      countryCode: did.country_code,
      areaCode: did.area_code,
      city: did.city || null,
      state: did.state || null,
      monthlyCost: did.monthly_cost,
      setupCost: did.setup_cost,
      features: did.features || [],
      available: did.available,
    }));

    return NextResponse.json({
      availableNumbers: transformedDids,
      total: data.total,
      page: data.page,
      perPage: data.per_page,
    });
  } catch (error) {
    console.error("Error fetching available phone numbers:", error);

    // Check if it's a connection error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json({
        availableNumbers: [],
        total: 0,
        page: 1,
        perPage: 20,
        message: "Voice service is not available",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch available phone numbers" },
      { status: 500 }
    );
  }
}
