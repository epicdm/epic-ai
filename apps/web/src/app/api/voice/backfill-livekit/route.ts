/**
 * API endpoint to backfill missing LiveKit resources for phones
 * that have Magnus provisioning but are missing LiveKit resources.
 *
 * POST /api/voice/backfill-livekit
 *
 * This is an admin-only endpoint that should be called manually when needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { safeDecryptToken } from '@/lib/encryption';

// Voice service URL
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  'https://openclaw-platform-zcjiu.ondigitalocean.app/voice';
const TIMEOUT_MS = 30000;

// Create timeout controller
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

// Create LiveKit inbound trunk
async function createLiveKitInboundTrunk(
  phoneNumber: string,
  organizationId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    const controller = createTimeoutController(TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/inbound`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_numbers: [phoneNumber],
          organization_id: organizationId,
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, trunkId: result.trunk_id };
    }

    return { success: false, error: result.error || 'Failed to create inbound trunk' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Create LiveKit outbound trunk
async function createLiveKitOutboundTrunk(
  phoneNumber: string,
  sipUsername: string,
  sipPassword: string,
  sipDomain: string,
  organizationId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    const controller = createTimeoutController(TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          sip_username: sipUsername,
          sip_password: sipPassword,
          sip_domain: sipDomain,
          organization_id: organizationId,
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, trunkId: result.trunk_id };
    }

    return { success: false, error: result.error || 'Failed to create outbound trunk' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Create LiveKit dispatch rule
async function createLiveKitDispatchRule(
  phoneNumber: string,
  trunkId: string | undefined,
  agentId: string | null,
  organizationId: string
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    const controller = createTimeoutController(TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          trunk_id: trunkId,
          agent_id: agentId || 'default',
          organization_id: organizationId,
          user_id: 'backfill-api',
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, ruleId: result.rule_id };
    }

    return { success: false, error: result.error || 'Failed to create dispatch rule' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to add proper admin check)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body for optional filters
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, phoneNumber = null, limit = 50 } = body;

    // Find all phones with Magnus but missing LiveKit resources
    const whereClause: {
      magnusDidId: { not: null };
      OR: Array<{ livekitTrunkId: null } | { livekitOutboundTrunkId: null } | { livekitDispatchRuleId: null }>;
      phoneNumber?: string;
    } = {
      magnusDidId: { not: null },
      OR: [
        { livekitTrunkId: null },
        { livekitOutboundTrunkId: null },
        { livekitDispatchRuleId: null },
      ],
    };

    if (phoneNumber) {
      whereClause.phoneNumber = phoneNumber;
    }

    const phones = await prisma.phoneMapping.findMany({
      where: whereClause,
      include: {
        sipConfig: true,
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
    });

    if (phones.length === 0) {
      return NextResponse.json({
        message: 'No phones need backfilling',
        processed: 0,
        success: 0,
        errors: 0,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run - no changes made',
        phonesToProcess: phones.map(p => ({
          phoneNumber: p.phoneNumber,
          agentName: p.agent?.name || null,
          missingInbound: !p.livekitTrunkId,
          missingOutbound: !p.livekitOutboundTrunkId,
          missingDispatchRule: !p.livekitDispatchRuleId,
          hasSipCredentials: !!(p.sipConfig?.sipUsername && p.sipConfig?.sipPassword),
        })),
        total: phones.length,
      });
    }

    const results: Array<{
      phoneNumber: string;
      success: boolean;
      updates: Record<string, string>;
      errors: string[];
    }> = [];

    let successCount = 0;
    let errorCount = 0;

    for (const phone of phones) {
      const phoneResult: {
        phoneNumber: string;
        success: boolean;
        updates: Record<string, string>;
        errors: string[];
      } = {
        phoneNumber: phone.phoneNumber,
        success: false,
        updates: {},
        errors: [],
      };

      const updates: {
        livekitTrunkId?: string;
        livekitOutboundTrunkId?: string;
        livekitDispatchRuleId?: string;
      } = {};

      // Create inbound trunk if missing
      if (!phone.livekitTrunkId) {
        const result = await createLiveKitInboundTrunk(
          phone.phoneNumber,
          phone.organizationId
        );
        if (result.success && result.trunkId) {
          updates.livekitTrunkId = result.trunkId;
          phoneResult.updates.livekitTrunkId = result.trunkId;
        } else if (result.error) {
          phoneResult.errors.push(`Inbound: ${result.error}`);
        }
      }

      // Create outbound trunk if missing and we have SIP credentials
      if (!phone.livekitOutboundTrunkId && phone.sipConfig?.sipUsername && phone.sipConfig?.sipPassword) {
        const sipPassword = safeDecryptToken(phone.sipConfig.sipPassword);
        const sipDomain = phone.sipConfig.sipUrl?.replace(/^sip:[^@]+@/, '') || 'voice00.epic.dm';

        const result = await createLiveKitOutboundTrunk(
          phone.phoneNumber,
          phone.sipConfig.sipUsername,
          sipPassword,
          sipDomain,
          phone.organizationId
        );
        if (result.success && result.trunkId) {
          updates.livekitOutboundTrunkId = result.trunkId;
          phoneResult.updates.livekitOutboundTrunkId = result.trunkId;
        } else if (result.error) {
          phoneResult.errors.push(`Outbound: ${result.error}`);
        }
      }

      // Create dispatch rule if missing
      if (!phone.livekitDispatchRuleId) {
        const result = await createLiveKitDispatchRule(
          phone.phoneNumber,
          phone.livekitTrunkId || updates.livekitTrunkId,
          phone.agentId,
          phone.organizationId
        );
        if (result.success && result.ruleId) {
          updates.livekitDispatchRuleId = result.ruleId;
          phoneResult.updates.livekitDispatchRuleId = result.ruleId;
        } else if (result.error) {
          phoneResult.errors.push(`Dispatch: ${result.error}`);
        }
      }

      // Update database if we have any new IDs
      if (Object.keys(updates).length > 0) {
        await prisma.phoneMapping.update({
          where: { id: phone.id },
          data: updates,
        });
        phoneResult.success = true;
        successCount++;
      } else {
        errorCount++;
      }

      results.push(phoneResult);

      // Small delay to avoid overwhelming the voice service
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      message: 'Backfill complete',
      processed: phones.length,
      success: successCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    console.error('[Backfill] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status (dry run)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all phones with Magnus but missing LiveKit resources
    const phones = await prisma.phoneMapping.findMany({
      where: {
        magnusDidId: { not: null },
        OR: [
          { livekitTrunkId: null },
          { livekitOutboundTrunkId: null },
          { livekitDispatchRuleId: null },
        ],
      },
      include: {
        sipConfig: {
          select: {
            sipUsername: true,
            sipUrl: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      phonesNeedingBackfill: phones.length,
      phones: phones.map(p => ({
        phoneNumber: p.phoneNumber,
        agentName: p.agent?.name || null,
        missingInbound: !p.livekitTrunkId,
        missingOutbound: !p.livekitOutboundTrunkId,
        missingDispatchRule: !p.livekitDispatchRuleId,
        hasSipCredentials: !!p.sipConfig?.sipUsername,
      })),
    });
  } catch (error) {
    console.error('[Backfill] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check failed' },
      { status: 500 }
    );
  }
}
