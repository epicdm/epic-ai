/**
 * Magnus/Asterisk Diagnostics Admin API
 * GET - Fetch diagnostics from Magnus SIP integration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Voice service URL with fallback
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

interface MagnusDiagnosticsResponse {
  success: boolean;
  diagnostics: {
    overall_status: string;
    magnus_integration: {
      status: string;
      api_response_time_ms: number;
      total_dids_in_magnus: number;
    };
    did_usage: {
      total_capacity: number;
      currently_used: number;
      currently_available: number;
      utilization_percent: number;
      health_score: number;
      status: string;
      status_message: string;
    };
    configuration: {
      magnus_url: string;
      sip_server: string;
      did_range: string;
    };
    errors: string[];
  };
  sipAccountValidations?: Array<{
    trunkId: string;
    number: string;
    sipAccountExists: boolean;
    sipAccountId?: string;
    sipAccountDetails?: {
      username: string;
      fromdomain: string;
      insecure: string;
      transport: string;
    };
    error?: string;
  }>;
  error?: string;
}

/**
 * GET /api/admin/livekit/magnus-diagnostics
 * Fetch Magnus diagnostics and validate SIP accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const validateSip = searchParams.get("validateSip") === "true";

    // Fetch Magnus diagnostics from voice service
    const diagResponse = await fetch(`${VOICE_SERVICE_URL}/api/magnus/diagnostics`);

    if (!diagResponse.ok) {
      const errorText = await diagResponse.text();
      console.error("[Admin Magnus] Failed to fetch diagnostics:", diagResponse.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to fetch Magnus diagnostics",
          details: `Voice service returned ${diagResponse.status}`,
          voiceServiceUrl: VOICE_SERVICE_URL
        },
        { status: diagResponse.status }
      );
    }

    const diagData = await diagResponse.json();

    const result: MagnusDiagnosticsResponse = {
      success: true,
      diagnostics: {
        overall_status: diagData.overall_status || "unknown",
        magnus_integration: {
          status: diagData.magnus_integration?.status || "unknown",
          api_response_time_ms: diagData.magnus_integration?.api_response_time_ms || 0,
          total_dids_in_magnus: diagData.magnus_integration?.total_dids_in_magnus || 0,
        },
        did_usage: {
          total_capacity: diagData.did_usage?.total_capacity || 0,
          currently_used: diagData.did_usage?.currently_used || 0,
          currently_available: diagData.did_usage?.currently_available || 0,
          utilization_percent: diagData.did_usage?.utilization_percent || 0,
          health_score: diagData.did_usage?.health_score || 0,
          status: diagData.did_usage?.status || "unknown",
          status_message: diagData.did_usage?.status_message || "",
        },
        configuration: {
          magnus_url: diagData.configuration?.magnus_url || "",
          sip_server: diagData.configuration?.sip_server || "",
          did_range: diagData.configuration?.did_range || "",
        },
        errors: diagData.errors || [],
      },
    };

    // If requested, validate SIP accounts for outbound trunks
    if (validateSip) {
      // First, get outbound trunks to know which numbers to check
      const trunksResponse = await fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`);

      if (trunksResponse.ok) {
        const trunksData = await trunksResponse.json();
        const validations: MagnusDiagnosticsResponse["sipAccountValidations"] = [];

        if (trunksData.trunks && Array.isArray(trunksData.trunks)) {
          for (const trunk of trunksData.trunks) {
            const trunkId = trunk.trunk_id || trunk.sip_trunk_id;
            const numbers = trunk.numbers || [];

            for (const number of numbers) {
              // Clean the number - extract digits only
              const cleanNumber = number.replace(/[^0-9]/g, "");

              try {
                // Check if SIP account exists for this number
                const sipCheckResponse = await fetch(
                  `${VOICE_SERVICE_URL}/api/magnus/sip-accounts?username=${cleanNumber}`
                );

                if (sipCheckResponse.ok) {
                  const sipData = await sipCheckResponse.json();
                  const accountExists = sipData.accounts && sipData.accounts.length > 0;

                  const validation: NonNullable<MagnusDiagnosticsResponse["sipAccountValidations"]>[number] = {
                    trunkId,
                    number,
                    sipAccountExists: accountExists,
                  };

                  if (accountExists && sipData.accounts[0]) {
                    validation.sipAccountId = sipData.accounts[0].id?.toString();
                    validation.sipAccountDetails = {
                      username: sipData.accounts[0].username || "",
                      fromdomain: sipData.accounts[0].fromdomain || "",
                      insecure: sipData.accounts[0].insecure || "",
                      transport: sipData.accounts[0].transport || "",
                    };
                  }

                  validations.push(validation);
                } else {
                  validations.push({
                    trunkId,
                    number,
                    sipAccountExists: false,
                    error: `Failed to check SIP account: ${sipCheckResponse.status}`,
                  });
                }
              } catch (err) {
                validations.push({
                  trunkId,
                  number,
                  sipAccountExists: false,
                  error: err instanceof Error ? err.message : "Unknown error",
                });
              }
            }
          }
        }

        result.sipAccountValidations = validations;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Admin Magnus] Error fetching diagnostics:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch Magnus diagnostics",
        voiceServiceUrl: VOICE_SERVICE_URL
      },
      { status: 500 }
    );
  }
}
