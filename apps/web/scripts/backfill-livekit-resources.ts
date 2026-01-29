/**
 * Backfill script to create missing LiveKit resources for phones
 * that have Magnus provisioning but are missing LiveKit resources.
 *
 * Run with: npx tsx scripts/backfill-livekit-resources.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Voice service URL
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'https://epic-ai-platform-zcjiu.ondigitalocean.app/voice';
const TIMEOUT_MS = 30000;

// Encryption functions (copied from lib/encryption.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    return null;
  }
  return Buffer.from(key, 'hex');
}

function safeDecryptToken(token: string): string {
  const key = getEncryptionKey();
  if (!key) {
    return token;
  }

  try {
    const combined = Buffer.from(token, 'base64');
    if (combined.length > IV_LENGTH + AUTH_TAG_LENGTH) {
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    }
  } catch {
    // Not encrypted, return as-is
  }

  return token;
}

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
    console.log(`  [LiveKit] Creating inbound trunk for ${phoneNumber}`);

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
      console.log(`  [LiveKit] Created inbound trunk: ${result.trunk_id}`);
      return { success: true, trunkId: result.trunk_id };
    }

    console.warn(`  [LiveKit] Failed to create inbound trunk: ${result.error}`);
    return { success: false, error: result.error || 'Failed to create inbound trunk' };
  } catch (error) {
    console.error(`  [LiveKit] Error creating inbound trunk:`, error);
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
    console.log(`  [LiveKit] Creating outbound trunk for ${phoneNumber}`);

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
      console.log(`  [LiveKit] Created outbound trunk: ${result.trunk_id}`);
      return { success: true, trunkId: result.trunk_id };
    }

    console.warn(`  [LiveKit] Failed to create outbound trunk: ${result.error}`);
    return { success: false, error: result.error || 'Failed to create outbound trunk' };
  } catch (error) {
    console.error(`  [LiveKit] Error creating outbound trunk:`, error);
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
    console.log(`  [LiveKit] Creating dispatch rule for ${phoneNumber}`);

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
          user_id: 'backfill-script',
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`  [LiveKit] Created dispatch rule: ${result.rule_id}`);
      return { success: true, ruleId: result.rule_id };
    }

    console.warn(`  [LiveKit] Failed to create dispatch rule: ${result.error}`);
    return { success: false, error: result.error || 'Failed to create dispatch rule' };
  } catch (error) {
    console.error(`  [LiveKit] Error creating dispatch rule:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('=== LiveKit Resources Backfill Script ===\n');
  console.log(`Voice Service URL: ${VOICE_SERVICE_URL}`);
  console.log(`Encryption configured: ${getEncryptionKey() ? 'Yes' : 'No'}\n`);

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
      sipConfig: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  console.log(`Found ${phones.length} phones missing LiveKit resources.\n`);

  if (phones.length === 0) {
    console.log('No phones need backfilling.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const phone of phones) {
    console.log(`\n[${phone.phoneNumber}] Processing...`);
    console.log(`  Agent: ${phone.agent?.name || 'None'}`);
    console.log(`  SIP Config: ${phone.sipConfig?.sipUsername || 'Missing'}`);
    console.log(`  Current state: inbound=${phone.livekitTrunkId || 'null'}, outbound=${phone.livekitOutboundTrunkId || 'null'}, rule=${phone.livekitDispatchRuleId || 'null'}`);

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
      }
    }

    // Update database if we have any new IDs
    if (Object.keys(updates).length > 0) {
      await prisma.phoneMapping.update({
        where: { id: phone.id },
        data: updates,
      });
      console.log(`  [DB] Updated with:`, updates);
      successCount++;
    } else {
      console.log(`  [WARN] No resources were created`);
      errorCount++;
    }

    // Small delay to avoid overwhelming the voice service
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n=== Backfill Complete ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
