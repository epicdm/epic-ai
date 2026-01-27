/**
 * Agent Assembly Processor
 *
 * BullMQ processor for ASSEMBLE_AGENT jobs.
 * Validates the payload and invokes the assembly orchestrator to create
 * or update an agent through the 8-phase pipeline.
 *
 * @module agent-assemble.processor
 */

import { prisma, Prisma } from '@epic-ai/database';
import { logger } from '../../lib/logger';
import {
  AgentAssemblyPayloadSchema,
  type AgentAssemblyResult,
} from '../../types/payloads';
import {
  assembleAgent,
  type AssemblyInput,
  type AssemblyContext,
  type AssemblyResult,
} from './assembly.orchestrator';
import type { AgentType } from './template-recommendation.engine';

const COMPONENT = 'agent-assemble-processor';

/**
 * Maps assembly orchestrator result to job result format
 */
function mapToJobResult(
  result: AssemblyResult,
  processingTimeMs: number
): AgentAssemblyResult {
  return {
    agentId: result.agentId,
    status: result.status,
    assembly_state: {
      phase: result.assembly_state.phase,
      completed: result.assembly_state.completed,
      error: result.assembly_state.error,
    },
    confidence: {
      overall: result.confidence.overall,
      by_phase: result.confidence.by_phase,
      by_dimension: result.confidence.by_dimension,
    },
    gaps: result.gaps.map((gap) => ({
      gap_type: gap.gap_type,
      field_path: gap.field_path,
      severity: gap.severity,
      impact: gap.impact,
      recommended_fix: gap.recommended_fix,
    })),
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: warning.severity,
    })),
    processing_time_ms: processingTimeMs,
  };
}

/**
 * Loads existing context for resume scenarios
 * When an agentId is provided, loads the agent's current state to enable resume
 */
async function loadExistingContext(
  agentId: string | undefined,
  organizationId: string
): Promise<Partial<AssemblyContext> | undefined> {
  if (!agentId) {
    return undefined;
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        companyProfile: true,
        template: true,
        wizardSessions: {
          where: { status: 'IN_PROGRESS' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!agent) {
      logger.warn(COMPONENT, 'Agent not found for resume', { agentId });
      return undefined;
    }

    // Verify org ownership
    if (agent.organizationId !== organizationId) {
      logger.error(COMPONENT, 'Agent organization mismatch', {
        agentId,
        expected: organizationId,
        actual: agent.organizationId,
      });
      throw new Error('Agent does not belong to organization');
    }

    // Check if agent is immutable
    if (agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED') {
      throw new Error(
        `Cannot assemble into ${agent.status} agent. Clone to DRAFT first.`
      );
    }

    // Build context from existing agent state
    const context: Partial<AssemblyContext> = {
      agentId: agent.id,
    };

    // Load assembly state from wizard session's step data if available
    const wizardSession = agent.wizardSessions[0];
    if (wizardSession) {
      const stepData = wizardSession.stepData as Record<string, unknown>;
      if (stepData.assemblyState) {
        const assemblyState = stepData.assemblyState as Record<string, unknown>;
        context.state = {
          phase: (assemblyState.phase as AssemblyContext['state']['phase']) || 'enrichment',
          completed: (assemblyState.completed as AssemblyContext['state']['completed']) || [],
          error: assemblyState.error as string | undefined,
        };
      }
    }

    // Load company profile if available - map Prisma model to assembly format
    if (agent.companyProfile) {
      const cp = agent.companyProfile;
      context.companyProfile = {
        name: cp.name,
        website: cp.website || undefined,
        industry: cp.industry || undefined,
        company_size: cp.companySize as 'small' | 'medium' | 'large' | 'enterprise' | undefined,
      };
    }

    // Load selected template if available - map Prisma model to assembly format
    if (agent.template) {
      context.selectedTemplate = {
        template_id: agent.template.slug,
        agent_type: agent.template.slug as AgentType,
        match_score: 100, // Preserved from previous run
        match_level: 'excellent',
        reasons: ['Resumed from checkpoint'],
        expected_outcome: {
          kpi: 'conversion_rate',
          range: '10-20%',
          impact: 'primary revenue driver',
          description: 'Resumed from previous checkpoint',
        },
      };
    }

    logger.info(COMPONENT, 'Loaded existing context for resume', {
      agentId,
      phase: context.state?.phase,
      completedPhases: context.state?.completed?.length || 0,
    });

    return context;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot assemble')) {
      throw error; // Re-throw immutability errors
    }
    logger.error(COMPONENT, 'Failed to load existing context', {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * Processes an ASSEMBLE_AGENT job
 *
 * @param payload - The job payload (validated inside)
 * @returns The assembly result
 */
export async function processAgentAssemblyJob(
  payload: unknown
): Promise<AgentAssemblyResult> {
  const startTime = Date.now();

  // Validate payload
  const parsed = AgentAssemblyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error(COMPONENT, 'Invalid payload', {
      errors: parsed.error.errors,
    });
    throw new Error(`Invalid payload: ${parsed.error.message}`);
  }

  const validPayload = parsed.data;

  logger.info(COMPONENT, 'Processing agent assembly job', {
    organizationId: validPayload.organizationId,
    userId: validPayload.userId,
    companyId: validPayload.companyId,
    agentId: validPayload.agentId,
    force: validPayload.force,
    hasWebsiteUrl: !!validPayload.websiteUrl,
    hasUserAnswers: !!validPayload.userAnswers,
  });

  try {
    // Load existing context for resume scenarios
    const existingContext = await loadExistingContext(
      validPayload.agentId,
      validPayload.organizationId
    );

    // If force flag is set, clear the existing context state
    const context = validPayload.force
      ? { ...existingContext, state: undefined }
      : existingContext;

    // Map payload to AssemblyInput
    // The orchestrator requires companyId, but we can create one if not provided
    let companyId = validPayload.companyId;

    // If no companyId but we have a websiteUrl or userAnswers, we need to create/find a company
    if (!companyId && (validPayload.websiteUrl || validPayload.userAnswers)) {
      // Check for existing company profile by website
      const existingCompany = await prisma.companyProfile.findFirst({
        where: {
          organizationId: validPayload.organizationId,
          website: validPayload.websiteUrl || undefined,
        },
        select: { id: true },
      });

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create a new company profile placeholder
        const newCompany = await prisma.companyProfile.create({
          data: {
            organizationId: validPayload.organizationId,
            name: validPayload.name || 'New Company',
            website: validPayload.websiteUrl,
          },
          select: { id: true },
        });
        companyId = newCompany.id;
      }
    }

    if (!companyId) {
      throw new Error('Either companyId, websiteUrl, or userAnswers must be provided');
    }

    // Build assembly input
    const assemblyInput: AssemblyInput = {
      companyId,
      agentId: validPayload.agentId,
      websiteUrl: validPayload.websiteUrl,
      desiredTemplateKey: validPayload.desiredTemplateKey,
      channels: validPayload.channels,
      userAnswers: validPayload.userAnswers,
      force: validPayload.force,
    };

    // Run the assembly orchestrator
    const result = await assembleAgent(assemblyInput, context);

    const processingTimeMs = Date.now() - startTime;

    logger.info(COMPONENT, 'Agent assembly completed', {
      agentId: result.agentId,
      status: result.status,
      phase: result.assembly_state.phase,
      completedPhases: result.assembly_state.completed.length,
      gapsCount: result.gaps.length,
      warningsCount: result.warnings.length,
      confidence: result.confidence.overall,
      processingTimeMs,
    });

    // Persist the result to the database
    await persistAssemblyResult(
      result,
      validPayload.organizationId,
      validPayload.userId || 'system', // Default to 'system' for background jobs without user context
      validPayload.name,
      validPayload.slug
    );

    return mapToJobResult(result, processingTimeMs);
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    logger.error(COMPONENT, 'Agent assembly failed', {
      organizationId: validPayload.organizationId,
      agentId: validPayload.agentId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs,
    });

    // Return a failed result instead of throwing
    // This allows the job to complete with a failed status
    return {
      agentId: validPayload.agentId || '',
      status: 'failed',
      assembly_state: {
        phase: 'error',
        completed: [],
        error: error instanceof Error ? error.message : String(error),
      },
      confidence: {
        overall: 0,
        by_phase: {},
      },
      gaps: [],
      warnings: [
        {
          code: 'ASSEMBLY_FAILED',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error',
        },
      ],
      processing_time_ms: processingTimeMs,
    };
  }
}

/**
 * Persists the assembly result to the database
 * Maps the wizard_snapshot to the 10 configuration blobs on the Agent model
 */
async function persistAssemblyResult(
  result: AssemblyResult,
  organizationId: string,
  userId: string,
  name?: string,
  slug?: string
): Promise<void> {
  try {
    // Generate a unique slug if not provided
    const agentSlug = slug || generateSlug(name || 'agent');

    // Extract configs from wizard_snapshot
    const snapshot = result.wizard_snapshot;

    // Map wizard_snapshot to database config blobs
    // Cast via unknown to Prisma.InputJsonValue for JSON field compatibility
    const configData = {
      // Role card from company profile and template
      roleCard: {
        name: snapshot?.company_profile?.name || name || 'Agent',
        company: snapshot?.company_profile?.name,
        mission: snapshot?.company_profile?.name
          ? `AI assistant for ${snapshot.company_profile.name}`
          : 'AI assistant',
      } as unknown as Prisma.InputJsonValue,
      // Personality from personality phase
      personalityConfig: (snapshot?.personality || {}) as unknown as Prisma.InputJsonValue,
      // Tools from tools phase
      toolConfig: (snapshot?.tools || {}) as unknown as Prisma.InputJsonValue,
      // Knowledge from knowledge phase
      knowledgeConfig: (snapshot?.knowledge || {}) as unknown as Prisma.InputJsonValue,
      // Governance from governance phase
      governanceConfig: (snapshot?.governance || {}) as unknown as Prisma.InputJsonValue,
      // Economics from economics phase
      economicsConfig: (snapshot?.economics || {}) as unknown as Prisma.InputJsonValue,
      // Confidence scores
      configConfidence: (result.confidence || {}) as unknown as Prisma.InputJsonValue,
      // Gaps for user to fill
      configGaps: (result.gaps || []) as unknown as Prisma.InputJsonValue,
      // Warnings
      configWarnings: (result.warnings || []) as unknown as Prisma.InputJsonValue,
    };

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { id: result.agentId },
    });

    if (existingAgent) {
      // Update existing agent
      await prisma.agent.update({
        where: { id: result.agentId },
        data: {
          ...configData,
          status: 'DRAFT', // Always DRAFT until published
          updatedAt: new Date(),
        },
      });

      // Update or create wizard session with assembly state
      const wizardStepData = {
        assemblyState: result.assembly_state,
        wizardSnapshot: result.wizard_snapshot,
      } as unknown as Prisma.InputJsonValue;

      await prisma.agentWizardSession.upsert({
        where: {
          id: `${result.agentId}-wizard`,
        },
        create: {
          id: `${result.agentId}-wizard`,
          agentId: result.agentId,
          userId,
          currentStep: result.assembly_state.completed.length,
          completedSteps: result.assembly_state.completed.map((_, i) => i),
          stepData: wizardStepData,
          status: result.status === 'complete' ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: result.status === 'complete' ? new Date() : null,
        },
        update: {
          currentStep: result.assembly_state.completed.length,
          completedSteps: result.assembly_state.completed.map((_, i) => i),
          stepData: wizardStepData,
          status: result.status === 'complete' ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: result.status === 'complete' ? new Date() : null,
        },
      });

      logger.debug(COMPONENT, 'Updated existing agent', {
        agentId: result.agentId,
        status: result.status,
      });
    } else {
      // Get template ID if we have a template key
      let templateId: string | undefined;
      if (snapshot?.selected_template?.template_key) {
        const template = await prisma.agentTemplate.findFirst({
          where: { slug: snapshot.selected_template.template_key },
          select: { id: true },
        });
        templateId = template?.id;
      }

      // Get company profile ID
      let companyProfileId: string | undefined;
      if (snapshot?.company_profile?.name) {
        const company = await prisma.companyProfile.findFirst({
          where: {
            organizationId,
            name: snapshot.company_profile.name,
          },
          select: { id: true },
        });
        companyProfileId = company?.id;
      }

      // Create new agent
      await prisma.agent.create({
        data: {
          id: result.agentId,
          organizationId,
          name: name || snapshot?.company_profile?.name || 'New Agent',
          slug: agentSlug,
          status: 'DRAFT',
          templateId,
          companyProfileId,
          ...configData,
        },
      });

      // Create wizard session
      const newWizardStepData = {
        assemblyState: result.assembly_state,
        wizardSnapshot: result.wizard_snapshot,
      } as unknown as Prisma.InputJsonValue;

      await prisma.agentWizardSession.create({
        data: {
          id: `${result.agentId}-wizard`,
          agentId: result.agentId,
          userId,
          currentStep: result.assembly_state.completed.length,
          completedSteps: result.assembly_state.completed.map((_, i) => i),
          stepData: newWizardStepData,
          status: result.status === 'complete' ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: result.status === 'complete' ? new Date() : null,
        },
      });

      logger.debug(COMPONENT, 'Created new agent', {
        agentId: result.agentId,
        name: name || snapshot?.company_profile?.name,
        slug: agentSlug,
      });
    }
  } catch (error) {
    logger.error(COMPONENT, 'Failed to persist assembly result', {
      agentId: result.agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - the assembly succeeded, persistence is secondary
  }
}

/**
 * Generates a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Add a random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${baseSlug}-${suffix}`;
}
