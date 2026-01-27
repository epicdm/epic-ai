/**
 * Agent Helpers
 *
 * Core helper functions for Agent OS operations.
 * Handles draft agent creation/validation with strict status enforcement.
 */

import { prisma, AgentStatus, Prisma } from '@epic-ai/database';
import { randomBytes } from 'crypto';

export interface EnsureDraftAgentInput {
  organizationId: string;
  companyProfileId?: string;
  agentId?: string;
  name?: string;
  slug?: string;
}

export interface DraftAgentResult {
  agent: Awaited<ReturnType<typeof prisma.agent.findUnique>>;
  isNew: boolean;
}

/**
 * Ensures a DRAFT agent exists for assembly operations.
 *
 * If agentId is provided:
 *   - Validates the agent exists
 *   - Validates the agent belongs to the organization
 *   - Validates the agent is in DRAFT status (PUBLISHED/ARCHIVED are immutable)
 *
 * If no agentId:
 *   - Creates a new DRAFT agent with empty config blobs
 *
 * @throws Error with code 'AGENT_NOT_FOUND' if agentId doesn't exist
 * @throws Error with code 'AGENT_ORG_MISMATCH' if agent belongs to different org
 * @throws Error with code 'AGENT_IMMUTABLE' if agent is PUBLISHED or ARCHIVED
 */
export async function ensureDraftAgent(
  input: EnsureDraftAgentInput
): Promise<DraftAgentResult> {
  const { organizationId, companyProfileId, agentId, name, slug } = input;

  // If agentId provided → validate and return existing
  if (agentId) {
    const existing = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        companyProfile: true,
        template: true,
      },
    });

    if (!existing) {
      throw new Error('AGENT_NOT_FOUND');
    }

    // Validate organization ownership
    if (existing.organizationId !== organizationId) {
      throw new Error('AGENT_ORG_MISMATCH');
    }

    // Enforce immutability - PUBLISHED and ARCHIVED agents cannot be modified
    if (existing.status === AgentStatus.PUBLISHED || existing.status === AgentStatus.ARCHIVED) {
      throw new Error(`AGENT_IMMUTABLE:${existing.status}`);
    }

    return { agent: existing, isNew: false };
  }

  // Generate unique slug if not provided
  const agentName = name || 'AI Agent Draft';
  const baseSlug = slug || generateSlug(agentName);

  // Check for slug uniqueness within organization
  let finalSlug = baseSlug;
  const existingWithSlug = await prisma.agent.findFirst({
    where: { organizationId, slug: baseSlug },
    select: { id: true },
  });

  if (existingWithSlug) {
    finalSlug = `${baseSlug}-${randomBytes(3).toString('hex')}`;
  }

  // Create new DRAFT agent with all config blobs initialized
  const agent = await prisma.agent.create({
    data: {
      organizationId,
      companyProfileId,
      name: agentName,
      slug: finalSlug,
      status: AgentStatus.DRAFT,

      // Initialize all 10 config blobs as empty but valid JSON
      roleCard: {},
      brainConfig: {},
      personalityConfig: {},
      toolConfig: {},
      knowledgeConfig: {},
      memoryConfig: {},
      learningConfig: {},
      governanceConfig: {},
      economicsConfig: {},
      flowConfig: {},

      // Initialize tracking fields
      configConfidence: {},
      configGaps: [],
      configWarnings: [],
    },
    include: {
      companyProfile: true,
      template: true,
    },
  });

  return { agent, isNew: true };
}

/**
 * Updates an existing DRAFT agent's config blobs
 *
 * @throws Error with code 'AGENT_NOT_FOUND' if agent doesn't exist
 * @throws Error with code 'AGENT_IMMUTABLE' if agent is not DRAFT
 */
export async function updateDraftAgentConfig(
  agentId: string,
  updates: {
    roleCard?: Record<string, unknown>;
    brainConfig?: Record<string, unknown>;
    personalityConfig?: Record<string, unknown>;
    toolConfig?: Record<string, unknown>;
    knowledgeConfig?: Record<string, unknown>;
    memoryConfig?: Record<string, unknown>;
    learningConfig?: Record<string, unknown>;
    governanceConfig?: Record<string, unknown>;
    economicsConfig?: Record<string, unknown>;
    configConfidence?: Record<string, unknown>;
    configGaps?: unknown[];
    configWarnings?: unknown[];
    templateId?: string;
  }
) {
  const existing = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { status: true },
  });

  if (!existing) {
    throw new Error('AGENT_NOT_FOUND');
  }

  if (existing.status !== AgentStatus.DRAFT) {
    throw new Error(`AGENT_IMMUTABLE:${existing.status}`);
  }

  // Extract templateId separately for proper Prisma relation handling
  const { templateId, ...configUpdates } = updates;

  // Build update data with proper JSON casting for Prisma
  const updateData: Prisma.AgentUpdateInput = {
    updatedAt: new Date(),
  };

  // Cast JSON fields properly for Prisma
  if (configUpdates.roleCard !== undefined) {
    updateData.roleCard = configUpdates.roleCard as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.brainConfig !== undefined) {
    updateData.brainConfig = configUpdates.brainConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.personalityConfig !== undefined) {
    updateData.personalityConfig = configUpdates.personalityConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.toolConfig !== undefined) {
    updateData.toolConfig = configUpdates.toolConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.knowledgeConfig !== undefined) {
    updateData.knowledgeConfig = configUpdates.knowledgeConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.memoryConfig !== undefined) {
    updateData.memoryConfig = configUpdates.memoryConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.learningConfig !== undefined) {
    updateData.learningConfig = configUpdates.learningConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.governanceConfig !== undefined) {
    updateData.governanceConfig = configUpdates.governanceConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.economicsConfig !== undefined) {
    updateData.economicsConfig = configUpdates.economicsConfig as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.configConfidence !== undefined) {
    updateData.configConfidence = configUpdates.configConfidence as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.configGaps !== undefined) {
    updateData.configGaps = configUpdates.configGaps as unknown as Prisma.InputJsonValue;
  }
  if (configUpdates.configWarnings !== undefined) {
    updateData.configWarnings = configUpdates.configWarnings as unknown as Prisma.InputJsonValue;
  }

  // Handle template relation
  if (templateId !== undefined) {
    updateData.template = { connect: { id: templateId } };
  }

  return prisma.agent.update({
    where: { id: agentId },
    data: updateData,
    include: {
      companyProfile: true,
      template: true,
    },
  });
}

/**
 * Generates a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'agent';
}
