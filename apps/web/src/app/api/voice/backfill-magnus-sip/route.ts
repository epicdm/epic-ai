/**
 * API endpoint to backfill missing Magnus SIP accounts for phones
 * that have LiveKit outbound trunks but are missing Magnus SIP accounts.
 *
 * POST /api/voice/backfill-magnus-sip
 *
 * This fixes the 403 Forbidden error when LiveKit tries to authenticate
 * with Magnus for outbound calls.
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

/**
 * Create a Magnus SIP account for an existing phone number.
 * This is used to backfill missing SIP accounts for phones that already
 * have LiveKit outbound trunks configured.
 */
async function createMagnusSipAccount(params: {
  magnusUserId: string;
  sipUsername: string;
  sipPassword: string;
  phoneNumber: string;
  agentName: string;
  email: string;
}): Promise<{ success: boolean; sipId?: string; error?: string }> {
  try {
    const controller = createTimeoutController(TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/create-sip-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magnus_user_id: params.magnusUserId,
          sip_username: params.sipUsername,
          sip_password: params.sipPassword,
          phone_number: params.phoneNumber,
          agent_name: params.agentName,
          email: params.email,
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, sipId: result.sip_id };
    }

    return { success: false, error: result.error || 'Failed to create SIP account' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Magnus has a SIP account for a given username
 */
async function checkMagnusSipAccount(
  username: string
): Promise<{ exists: boolean; sipId?: string; error?: string }> {
  try {
    const controller = createTimeoutController(TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/sip-accounts?username=${encodeURIComponent(username)}&limit=1`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok) {
      const accounts = result.accounts || [];
      if (accounts.length > 0) {
        return { exists: true, sipId: accounts[0].id };
      }
      return { exists: false };
    }

    return { exists: false, error: result.error || 'Failed to check SIP account' };
  } catch (error) {
    return {
      exists: false,
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body for optional filters
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, phoneNumber = null, limit = 50 } = body;

    // Find all phones with LiveKit outbound trunks
    // These are the phones that need Magnus SIP accounts for outbound calls
    const whereClause: {
      livekitOutboundTrunkId: { not: null };
      sipConfigId: { not: null };
      phoneNumber?: string;
    } = {
      livekitOutboundTrunkId: { not: null },
      sipConfigId: { not: null },
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
        organization: {
          select: {
            id: true,
            name: true,
            magnusUserId: true,
          },
        },
      },
      take: limit,
    });

    if (phones.length === 0) {
      return NextResponse.json({
        message: 'No phones with LiveKit outbound trunks found',
        processed: 0,
        success: 0,
        errors: 0,
      });
    }

    // Check which phones are missing Magnus SIP accounts
    const phonesToProcess: Array<{
      phone: typeof phones[0];
      needsSipAccount: boolean;
      existingSipId?: string;
      error?: string;
    }> = [];

    for (const phone of phones) {
      if (!phone.sipConfig?.sipUsername) {
        phonesToProcess.push({
          phone,
          needsSipAccount: false,
          error: 'Missing SIP username in config',
        });
        continue;
      }

      // Check if Magnus already has this SIP account
      const checkResult = await checkMagnusSipAccount(phone.sipConfig.sipUsername);

      if (checkResult.error) {
        phonesToProcess.push({
          phone,
          needsSipAccount: false,
          error: `Failed to check: ${checkResult.error}`,
        });
      } else if (checkResult.exists) {
        phonesToProcess.push({
          phone,
          needsSipAccount: false,
          existingSipId: checkResult.sipId,
        });
      } else {
        phonesToProcess.push({
          phone,
          needsSipAccount: true,
        });
      }

      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const needsBackfill = phonesToProcess.filter(p => p.needsSipAccount);

    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run - no changes made',
        total: phones.length,
        needsBackfill: needsBackfill.length,
        alreadyExists: phonesToProcess.filter(p => p.existingSipId).length,
        errors: phonesToProcess.filter(p => p.error).length,
        details: phonesToProcess.map(p => ({
          phoneNumber: p.phone.phoneNumber,
          sipUsername: p.phone.sipConfig?.sipUsername || null,
          needsSipAccount: p.needsSipAccount,
          existingSipId: p.existingSipId || null,
          error: p.error || null,
          magnusUserId: p.phone.organization?.magnusUserId || null,
        })),
      });
    }

    // Create missing SIP accounts
    const results: Array<{
      phoneNumber: string;
      sipUsername: string;
      success: boolean;
      sipId?: string;
      error?: string;
    }> = [];

    let successCount = 0;
    let errorCount = 0;

    for (const item of needsBackfill) {
      const { phone } = item;

      if (!phone.organization?.magnusUserId) {
        results.push({
          phoneNumber: phone.phoneNumber,
          sipUsername: phone.sipConfig?.sipUsername || '',
          success: false,
          error: 'Organization has no Magnus user ID',
        });
        errorCount++;
        continue;
      }

      if (!phone.sipConfig?.sipUsername || !phone.sipConfig?.sipPassword) {
        results.push({
          phoneNumber: phone.phoneNumber,
          sipUsername: phone.sipConfig?.sipUsername || '',
          success: false,
          error: 'Missing SIP credentials in config',
        });
        errorCount++;
        continue;
      }

      // Decrypt the password
      const sipPassword = safeDecryptToken(phone.sipConfig.sipPassword);

      // Create the Magnus SIP account
      const createResult = await createMagnusSipAccount({
        magnusUserId: phone.organization.magnusUserId,
        sipUsername: phone.sipConfig.sipUsername,
        sipPassword: sipPassword,
        phoneNumber: phone.phoneNumber,
        agentName: phone.agent?.name || `Agent ${phone.agentId}`,
        email: `agent-${phone.agentId}@epic.dm`,
      });

      if (createResult.success) {
        results.push({
          phoneNumber: phone.phoneNumber,
          sipUsername: phone.sipConfig.sipUsername,
          success: true,
          sipId: createResult.sipId,
        });
        successCount++;

        // Update SIPConfig with the new Magnus SIP ID if we got one
        if (createResult.sipId && phone.sipConfig.id) {
          await prisma.sIPConfig.update({
            where: { id: phone.sipConfig.id },
            data: { magnusTrunkId: createResult.sipId },
          });
        }
      } else {
        results.push({
          phoneNumber: phone.phoneNumber,
          sipUsername: phone.sipConfig.sipUsername,
          success: false,
          error: createResult.error,
        });
        errorCount++;
      }

      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      message: 'Magnus SIP backfill complete',
      processed: needsBackfill.length,
      success: successCount,
      errors: errorCount,
      skipped: {
        alreadyExists: phonesToProcess.filter(p => p.existingSipId).length,
        checkErrors: phonesToProcess.filter(p => p.error).length,
      },
      results,
    });
  } catch (error) {
    console.error('[Backfill Magnus SIP] Error:', error);
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

    // Find all phones with LiveKit outbound trunks
    const phones = await prisma.phoneMapping.findMany({
      where: {
        livekitOutboundTrunkId: { not: null },
        sipConfigId: { not: null },
      },
      include: {
        sipConfig: {
          select: {
            sipUsername: true,
            magnusTrunkId: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            magnusUserId: true,
          },
        },
      },
    });

    return NextResponse.json({
      phonesWithOutboundTrunks: phones.length,
      phones: phones.map(p => ({
        phoneNumber: p.phoneNumber,
        agentName: p.agent?.name || null,
        sipUsername: p.sipConfig?.sipUsername || null,
        hasMagnusSipId: !!p.sipConfig?.magnusTrunkId,
        magnusSipId: p.sipConfig?.magnusTrunkId || null,
        hasMagnusUserId: !!p.organization?.magnusUserId,
        livekitOutboundTrunkId: p.livekitOutboundTrunkId,
      })),
    });
  } catch (error) {
    console.error('[Backfill Magnus SIP] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check failed' },
      { status: 500 }
    );
  }
}
