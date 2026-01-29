/**
 * Voice Deployment Adapter
 *
 * Maps Agent OS configuration blobs (roleCard, personality, governance,
 * tools, knowledge, flow, economics) to VoiceAgent fields. Handles
 * creating or updating the linked VoiceAgent and syncing phone-level
 * changes back to the parent Agent.
 *
 * @module lib/adapters/voice-deployment-adapter
 */

import type { PrismaClient, Agent, VoiceAgent, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Type helpers for the Agent config JSON blobs
// ---------------------------------------------------------------------------

/** Shape of the roleCard JSON blob on Agent */
interface RoleCardConfig {
  name?: string;
  title?: string;
  company?: string;
  mission?: string;
  boundaries?: string[];
  escalation_rules?: Array<{
    trigger?: string;
    action?: string;
    target?: string;
  }>;
  greeting?: string;
  [key: string]: unknown;
}

/** Shape of the personalityConfig JSON blob on Agent */
interface PersonalityConfig {
  voice_tone?: string;
  formality?: number; // 1 (very casual) to 5 (very formal)
  humor_level?: number;
  empathy_level?: number;
  pace?: string;
  language_style?: string;
  use_emojis?: boolean;
  preferred_voice?: string;
  [key: string]: unknown;
}

/** Shape of the governanceConfig JSON blob on Agent */
interface GovernanceConfig {
  compliance_rules?: Array<{
    rule?: string;
    enforcement?: string;
  }>;
  risk_thresholds?: Record<string, number>;
  audit_settings?: Record<string, unknown>;
  escalation_paths?: Array<{
    condition?: string;
    target?: string;
  }>;
  pii_handling?: string;
  prohibited_topics?: string[];
  required_disclaimers?: string[];
  [key: string]: unknown;
}

/** Shape of the toolConfig JSON blob on Agent */
interface ToolConfig {
  enabled_tools?: Array<{
    id?: string;
    name?: string;
    description?: string;
    type?: string;
    webhook_url?: string;
    webhook_method?: string;
    webhook_headers?: Record<string, string>;
    parameters?: Record<string, unknown>;
    permissions?: string[];
    rate_limits?: Record<string, unknown>;
  }>;
  tool_policies?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Shape of the knowledgeConfig JSON blob on Agent */
interface KnowledgeConfig {
  knowledge_bases?: string[];
  retrieval_settings?: {
    max_chunks?: number;
    min_score?: number;
    priority?: number;
  };
  context_window?: number;
  sources?: string[];
  [key: string]: unknown;
}

/** Shape of the flowConfig JSON blob on Agent */
interface FlowConfig {
  version?: number;
  templateKey?: string;
  entry_node_id?: string;
  exit_node_ids?: string[];
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  intents?: Array<Record<string, unknown>>;
  tool_hooks?: Array<Record<string, unknown>>;
  guardrails?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Shape of the economicsConfig JSON blob on Agent */
interface EconomicsConfig {
  budget_limits?: {
    daily?: number;
    monthly?: number;
    per_call?: number;
  };
  cost_tracking?: boolean;
  usage_caps?: Record<string, number>;
  billing_rules?: Record<string, unknown>;
  tier_overrides?: Record<string, unknown>;
  llm_model_override?: string;
  [key: string]: unknown;
}

/** Result returned from voice/personality mapping */
interface VoicePersonalityMapping {
  ttsVoiceId: string;
  realtimeVoice: string;
  temperature: number;
}

/** Result returned from a successful deploy */
interface DeployResult {
  agent: Agent;
  voiceAgent: VoiceAgent;
  created: boolean;
}

/** Result from syncBack */
interface SyncBackResult {
  synced: boolean;
  phoneNumbers: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(blob: unknown): Record<string, unknown> {
  if (blob && typeof blob === "object" && !Array.isArray(blob)) {
    return blob as Record<string, unknown>;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Voice Deployment Adapter
// ---------------------------------------------------------------------------

export const VoiceDeploymentAdapter = {
  /**
   * Deploy an Agent OS agent to the voice channel.
   *
   * Maps the agent's 10 config blobs to VoiceAgent fields, creating or
   * updating the linked VoiceAgent record. Sets the agent's voiceAgentId
   * and records publishedAt timestamp.
   *
   * @param agent  - The full Agent record (with JSON config blobs)
   * @param orgId  - Organization ID the agent belongs to
   * @param db     - Prisma client instance
   * @returns The updated agent and voice agent
   */
  async deploy(agent: Agent, orgId: string, db: PrismaClient): Promise<DeployResult> {
    const roleCard = asRecord(agent.roleCard) as RoleCardConfig;
    const personality = asRecord(agent.personalityConfig) as PersonalityConfig;
    const governance = asRecord(agent.governanceConfig) as GovernanceConfig;
    const tools = asRecord(agent.toolConfig) as ToolConfig;
    const knowledge = asRecord(agent.knowledgeConfig) as KnowledgeConfig;
    const flow = asRecord(agent.flowConfig) as FlowConfig;
    const economics = asRecord(agent.economicsConfig) as EconomicsConfig;

    // Build the system prompt from role card, personality, and governance
    const systemPrompt = VoiceDeploymentAdapter.buildSystemPrompt(
      roleCard,
      personality,
      governance
    );

    // Map personality to TTS voice and LLM temperature
    const voiceMapping = VoiceDeploymentAdapter.mapPersonalityToVoice(personality);

    // Determine the greeting message
    const greetingMessage = roleCard.greeting
      ?? (roleCard.name
        ? `Hello, I'm ${roleCard.name}${roleCard.company ? ` from ${roleCard.company}` : ""}. How can I help you today?`
        : undefined);

    // Determine LLM model from economics override or default
    const llmModel = economics.llm_model_override ?? "gpt-4o-mini";

    // Build the custom instructions from flow config summary
    const customInstructions = buildCustomInstructions(flow, tools);

    // Build settings JSON with extra metadata
    const settings = {
      agentOsId: agent.id,
      agentOsVersion: agent.version,
      deployedFromAgentOs: true,
      flowConfig: JSON.parse(JSON.stringify(flow)),
      economicsConfig: JSON.parse(JSON.stringify(economics)),
    } as Prisma.InputJsonValue;

    // Build channels JSON from flow config
    const channels = {
      voice: {
        enabled: true,
        flowVersion: flow.version ?? 1,
      },
    } as Prisma.InputJsonValue;

    // Common voice agent field values
    const commonFields = {
      name: agent.name,
      description: agent.description,
      systemPrompt,
      customInstructions,
      llmModel: String(llmModel),
      temperature: voiceMapping.temperature,
      ttsVoiceId: voiceMapping.ttsVoiceId,
      realtimeVoice: voiceMapping.realtimeVoice,
      greetingEnabled: !!greetingMessage,
      greetingMessage: greetingMessage ?? null,
      settings,
      channels,
      isActive: true,
      status: "deployed",
      deploymentMode: "production",
    };

    let voiceAgent: VoiceAgent;
    let created = false;

    if (agent.voiceAgentId) {
      // Update existing VoiceAgent
      voiceAgent = await db.voiceAgent.update({
        where: { id: agent.voiceAgentId },
        data: commonFields as Prisma.VoiceAgentUncheckedUpdateInput,
      });
    } else {
      // Create new VoiceAgent
      voiceAgent = await db.voiceAgent.create({
        data: {
          ...commonFields,
          organizationId: orgId,
          agentType: "INBOUND",
          language: "en-US",
        } as Prisma.VoiceAgentUncheckedCreateInput,
      });
      created = true;
    }

    // Sync knowledge bases if configured
    if (knowledge.knowledge_bases && knowledge.knowledge_bases.length > 0) {
      await syncKnowledgeBases(
        voiceAgent.id,
        knowledge.knowledge_bases,
        knowledge.retrieval_settings,
        db
      );
    }

    // Sync tools if configured
    if (tools.enabled_tools && tools.enabled_tools.length > 0) {
      await syncTools(voiceAgent.id, orgId, tools.enabled_tools, db);
    }

    // Link agent to voice agent and record deployment timestamp
    const updatedAgent = await db.agent.update({
      where: { id: agent.id },
      data: {
        voiceAgentId: voiceAgent.id,
        publishedAt: new Date(),
      },
    });

    return {
      agent: updatedAgent,
      voiceAgent,
      created,
    };
  },

  /**
   * Build a system prompt from the Agent's role card, personality,
   * and governance config modules.
   *
   * The prompt is structured as sections that give the LLM clear
   * context about who it is, how it should communicate, and what
   * rules it must follow.
   */
  buildSystemPrompt(
    roleCard: RoleCardConfig,
    personality: PersonalityConfig,
    governance: GovernanceConfig
  ): string {
    const sections: string[] = [];

    // --- Identity Section ---
    const identityParts: string[] = [];
    if (roleCard.name) {
      identityParts.push(`You are ${roleCard.name}.`);
    }
    if (roleCard.title) {
      identityParts.push(`Your role is ${roleCard.title}.`);
    }
    if (roleCard.company) {
      identityParts.push(`You work for ${roleCard.company}.`);
    }
    if (roleCard.mission) {
      identityParts.push(`Your mission: ${roleCard.mission}`);
    }
    if (identityParts.length > 0) {
      sections.push(`## Identity\n${identityParts.join(" ")}`);
    }

    // --- Communication Style Section ---
    const styleParts: string[] = [];
    if (personality.voice_tone) {
      styleParts.push(`Tone: ${personality.voice_tone}.`);
    }
    if (personality.formality !== undefined) {
      const formalityLabel = mapFormalityLevel(personality.formality);
      styleParts.push(`Formality: ${formalityLabel}.`);
    }
    if (personality.pace) {
      styleParts.push(`Pace: ${personality.pace}.`);
    }
    if (personality.language_style) {
      styleParts.push(`Language style: ${personality.language_style}.`);
    }
    if (personality.empathy_level !== undefined) {
      if (personality.empathy_level >= 4) {
        styleParts.push("Show high empathy and actively listen to concerns.");
      } else if (personality.empathy_level >= 2) {
        styleParts.push("Be empathetic but focused on solving problems.");
      }
    }
    if (personality.humor_level !== undefined) {
      if (personality.humor_level >= 4) {
        styleParts.push("Feel free to use appropriate humor.");
      } else if (personality.humor_level <= 1) {
        styleParts.push("Keep the conversation professional and serious.");
      }
    }
    if (styleParts.length > 0) {
      sections.push(`## Communication Style\n${styleParts.join(" ")}`);
    }

    // --- Boundaries Section ---
    if (roleCard.boundaries && roleCard.boundaries.length > 0) {
      const boundaryList = roleCard.boundaries
        .map((b) => `- ${b}`)
        .join("\n");
      sections.push(`## Boundaries\n${boundaryList}`);
    }

    // --- Governance Rules Section ---
    const govParts: string[] = [];
    if (governance.prohibited_topics && governance.prohibited_topics.length > 0) {
      govParts.push(
        `Never discuss: ${governance.prohibited_topics.join(", ")}.`
      );
    }
    if (governance.pii_handling) {
      govParts.push(`PII handling policy: ${governance.pii_handling}.`);
    }
    if (governance.required_disclaimers && governance.required_disclaimers.length > 0) {
      govParts.push(
        `Required disclaimers:\n${governance.required_disclaimers.map((d) => `- ${d}`).join("\n")}`
      );
    }
    if (governance.compliance_rules && governance.compliance_rules.length > 0) {
      const ruleList = governance.compliance_rules
        .filter((r) => r.rule)
        .map((r) => `- ${r.rule}${r.enforcement ? ` (${r.enforcement})` : ""}`)
        .join("\n");
      if (ruleList) {
        govParts.push(`Compliance rules:\n${ruleList}`);
      }
    }
    if (govParts.length > 0) {
      sections.push(`## Rules & Compliance\n${govParts.join("\n")}`);
    }

    // --- Escalation Section ---
    const escalationSources: Array<{ trigger?: string; action?: string; target?: string }> = [];
    if (roleCard.escalation_rules) {
      escalationSources.push(...roleCard.escalation_rules);
    }
    if (governance.escalation_paths) {
      escalationSources.push(
        ...governance.escalation_paths.map((p) => ({
          trigger: p.condition,
          action: "escalate",
          target: p.target,
        }))
      );
    }
    if (escalationSources.length > 0) {
      const escList = escalationSources
        .filter((e) => e.trigger)
        .map((e) => {
          let line = `- When: ${e.trigger}`;
          if (e.action) line += ` -> ${e.action}`;
          if (e.target) line += ` (to: ${e.target})`;
          return line;
        })
        .join("\n");
      if (escList) {
        sections.push(`## Escalation\n${escList}`);
      }
    }

    // If no content was generated, provide a minimal default
    if (sections.length === 0) {
      return "You are a helpful AI voice assistant. Be professional, clear, and concise.";
    }

    return sections.join("\n\n");
  },

  /**
   * Map personality tone and formality to TTS voice name and LLM temperature.
   *
   * Voices are mapped to OpenAI's realtime voice options: alloy, echo,
   * fable, onyx, nova, shimmer. Temperature ranges from 0.3 (very formal)
   * to 0.9 (very casual/creative).
   */
  mapPersonalityToVoice(personality: PersonalityConfig): VoicePersonalityMapping {
    const tone = (personality.voice_tone ?? "professional").toLowerCase();
    const formality = personality.formality ?? 3;
    const preferredVoice = personality.preferred_voice;

    // If a preferred voice is explicitly set, use it
    if (preferredVoice) {
      return {
        ttsVoiceId: preferredVoice,
        realtimeVoice: preferredVoice,
        temperature: mapFormalityToTemperature(formality),
      };
    }

    // Map tone to voice
    let voice: string;
    switch (tone) {
      case "professional":
      case "authoritative":
        voice = "onyx";
        break;
      case "friendly":
      case "warm":
      case "approachable":
        voice = "nova";
        break;
      case "energetic":
      case "enthusiastic":
      case "upbeat":
        voice = "shimmer";
        break;
      case "calm":
      case "soothing":
      case "empathetic":
        voice = "echo";
        break;
      case "witty":
      case "conversational":
      case "casual":
        voice = "fable";
        break;
      default:
        voice = "alloy";
        break;
    }

    return {
      ttsVoiceId: voice,
      realtimeVoice: voice,
      temperature: mapFormalityToTemperature(formality),
    };
  },

  /**
   * Sync VoiceAgent phone-level changes back to the parent Agent.
   *
   * Reads the VoiceAgent's phone mappings and active status and
   * returns data that can be used to update the parent Agent's
   * channel overrides or status.
   */
  async syncBack(
    voiceAgentId: string,
    db: PrismaClient
  ): Promise<SyncBackResult> {
    const voiceAgent = await db.voiceAgent.findUnique({
      where: { id: voiceAgentId },
      include: {
        phoneMappings: {
          where: { isActive: true },
          select: {
            phoneNumber: true,
            routingType: true,
            isActive: true,
          },
        },
      },
    });

    if (!voiceAgent) {
      return {
        synced: false,
        phoneNumbers: [],
        isActive: false,
      };
    }

    const phoneNumbers = voiceAgent.phoneMappings.map((pm) => pm.phoneNumber);

    // Find the parent Agent linked to this VoiceAgent
    const parentAgent = await db.agent.findFirst({
      where: { voiceAgentId },
    });

    if (parentAgent) {
      // Update the parent agent's channel overrides with phone info
      const currentOverrides = asRecord(parentAgent.channelOverrides);
      const voiceOverrides = asRecord(currentOverrides.voice);

      await db.agent.update({
        where: { id: parentAgent.id },
        data: {
          channelOverrides: {
            ...currentOverrides,
            voice: {
              ...voiceOverrides,
              phoneNumbers,
              isActive: voiceAgent.isActive,
              lastSyncedAt: new Date().toISOString(),
            },
          },
        },
      });
    }

    return {
      synced: true,
      phoneNumbers,
      isActive: voiceAgent.isActive,
    };
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map numeric formality (1-5) to a human-readable label for the prompt.
 */
function mapFormalityLevel(level: number): string {
  if (level <= 1) return "very casual";
  if (level <= 2) return "casual";
  if (level <= 3) return "neutral";
  if (level <= 4) return "formal";
  return "very formal";
}

/**
 * Map formality level (1-5) to LLM temperature.
 * Lower formality = higher temperature (more creative).
 * Higher formality = lower temperature (more precise).
 */
function mapFormalityToTemperature(formality: number): number {
  // Clamp to 1-5 range
  const clamped = Math.max(1, Math.min(5, formality));
  // Map: 1 -> 0.9, 2 -> 0.8, 3 -> 0.7, 4 -> 0.5, 5 -> 0.3
  const temperatureMap: Record<number, number> = {
    1: 0.9,
    2: 0.8,
    3: 0.7,
    4: 0.5,
    5: 0.3,
  };
  return temperatureMap[clamped] ?? 0.7;
}

/**
 * Build custom instructions from flow and tool configs.
 * These provide additional context to the VoiceAgent's LLM
 * beyond the system prompt.
 */
function buildCustomInstructions(
  flow: FlowConfig,
  tools: ToolConfig
): string | null {
  const parts: string[] = [];

  // Describe the conversation flow template if set
  if (flow.templateKey) {
    parts.push(`Conversation flow template: ${flow.templateKey}.`);
  }

  // Describe available intents
  if (flow.intents && flow.intents.length > 0) {
    const intentNames = flow.intents
      .map((i) => (i as Record<string, unknown>).name ?? (i as Record<string, unknown>).id)
      .filter(Boolean);
    if (intentNames.length > 0) {
      parts.push(
        `Recognized intents: ${intentNames.join(", ")}.`
      );
    }
  }

  // Describe available tools
  if (tools.enabled_tools && tools.enabled_tools.length > 0) {
    const toolNames = tools.enabled_tools
      .map((t) => t.name)
      .filter(Boolean);
    if (toolNames.length > 0) {
      parts.push(
        `Available tools: ${toolNames.join(", ")}.`
      );
    }
  }

  // Describe guardrails from flow config
  if (flow.guardrails && Object.keys(flow.guardrails).length > 0) {
    parts.push("Follow the configured guardrails for conversation flow.");
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Sync knowledge base links from Agent OS knowledge config to VoiceAgent.
 * Creates AgentKnowledgeBase join records.
 */
async function syncKnowledgeBases(
  voiceAgentId: string,
  knowledgeBaseIds: string[],
  retrievalSettings: KnowledgeConfig["retrieval_settings"],
  db: PrismaClient
): Promise<void> {
  // Remove existing links
  await db.agentKnowledgeBase.deleteMany({
    where: { agentId: voiceAgentId },
  });

  // Create new links
  for (let i = 0; i < knowledgeBaseIds.length; i++) {
    const kbId = knowledgeBaseIds[i];
    // Verify the knowledge base exists before linking
    const kbExists = await db.knowledgeBase.findUnique({
      where: { id: kbId },
      select: { id: true },
    });

    if (kbExists) {
      await db.agentKnowledgeBase.create({
        data: {
          agentId: voiceAgentId,
          knowledgeBaseId: kbId,
          priority: i,
          maxChunks: retrievalSettings?.max_chunks ?? 5,
          minScore: retrievalSettings?.min_score ?? 0.7,
          isActive: true,
        },
      });
    }
  }
}

/**
 * Sync tools from Agent OS tool config to VoiceAgent's AgentTool records.
 */
async function syncTools(
  voiceAgentId: string,
  orgId: string,
  enabledTools: NonNullable<ToolConfig["enabled_tools"]>,
  db: PrismaClient
): Promise<void> {
  // Remove existing tools for this voice agent
  await db.agentTool.deleteMany({
    where: { agentId: voiceAgentId },
  });

  // Create tools from the Agent OS config
  for (const tool of enabledTools) {
    if (!tool.name) continue;

    await db.agentTool.create({
      data: {
        agentId: voiceAgentId,
        organizationId: orgId,
        name: tool.name,
        description: tool.description ?? `Tool: ${tool.name}`,
        type: (tool.type as "WEBHOOK" | "FUNCTION" | "BUILTIN") ?? "WEBHOOK",
        webhookUrl: tool.webhook_url ?? null,
        webhookMethod: tool.webhook_method ?? "POST",
        webhookHeaders: tool.webhook_headers ?? {},
        parameters: (tool.parameters ?? {}) as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }
}
