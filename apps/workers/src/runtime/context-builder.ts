/**
 * Context Builder
 *
 * Loads and builds runtime context from memory, session state,
 * and channel metadata for each agent turn.
 *
 * @module runtime/context-builder
 */

import { prisma } from "@epic-ai/database";
import type {
  AgentFullConfig,
  RuntimeContext,
  RuntimeChannel,
  ConversationMessage,
  ExtractedEntity,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

function nowIso(): string {
  return new Date().toISOString();
}

// ============================================================================
// Context Builder
// ============================================================================

export interface BuildContextParams {
  agent: AgentFullConfig;
  sessionId: string;
  conversationId?: string;
  channel: RuntimeChannel;
  channelMetadata?: Record<string, unknown>;
  userId?: string;
}

/**
 * Build runtime context for an agent turn.
 * Loads conversation history, entities, and session state.
 */
export async function buildContext(
  params: BuildContextParams
): Promise<RuntimeContext> {
  const { agent, sessionId, channel, channelMetadata, userId } = params;
  const conversationId = params.conversationId ?? sessionId;

  // Load short-term memory (recent messages)
  const messages = await loadRecentMessages(
    sessionId,
    agent.memory_config.short_term?.window_size ?? 10
  );

  // Load extracted entities from this session
  const entities = await loadEntities(sessionId);

  // Load session state (flow position, turn count)
  const sessionState = await loadSessionState(sessionId);

  // Load user profile if userId provided
  const userProfile = userId ? await loadUserProfile(userId, agent.id) : undefined;

  return {
    sessionId,
    conversationId,
    flowStage: sessionState.flowStage,
    turnNumber: sessionState.turnNumber,
    messages,
    entities,
    userProfile,
    channelContext: {
      channel,
      metadata: channelMetadata,
    },
    sessionStartedAt: sessionState.startedAt,
    lastActivityAt: nowIso(),
  };
}

// ============================================================================
// Memory Loaders
// ============================================================================

interface SessionState {
  flowStage: string;
  turnNumber: number;
  startedAt: string;
}

async function loadSessionState(sessionId: string): Promise<SessionState> {
  // Try to load existing session
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  }).catch(() => null);

  if (session) {
    return {
      flowStage: (session.flowData as Record<string, unknown>)?.currentNode as string ?? "greeting",
      turnNumber: session.turnCount ?? 0,
      startedAt: session.startedAt?.toISOString() ?? nowIso(),
    };
  }

  // New session defaults
  return {
    flowStage: "greeting",
    turnNumber: 0,
    startedAt: nowIso(),
  };
}

async function loadRecentMessages(
  sessionId: string,
  windowSize: number
): Promise<ConversationMessage[]> {
  const messages = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { timestamp: "desc" },
    take: windowSize,
  }).catch(() => []);

  // Reverse to get chronological order
  return messages.reverse().map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    timestamp: m.timestamp.toISOString(),
    metadata: m.metadata as ConversationMessage["metadata"],
  }));
}

async function loadEntities(
  sessionId: string
): Promise<ExtractedEntity[]> {
  const entities = await prisma.agentEntity.findMany({
    where: { sessionId },
    orderBy: { extractedAt: "desc" },
    take: 50, // Limit to most recent 50 entities
  }).catch(() => []);

  return entities.map((e) => ({
    type: e.entityType as ExtractedEntity["type"],
    value: e.value,
    confidence: e.confidence ?? 1.0,
    source: (e.extractedFrom ?? "user") as ExtractedEntity["source"],
    timestamp: e.extractedAt.toISOString(),
  }));
}

async function loadUserProfile(
  userId: string,
  agentId: string
): Promise<RuntimeContext["userProfile"] | undefined> {
  // Try to load lead data associated with this user
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { id: userId },
        { email: userId },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      tags: true,
      customFields: true,
    },
  }).catch(() => null);

  if (!lead) return undefined;

  return {
    id: lead.id,
    name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || undefined,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    tags: lead.tags ?? [],
    customFields: (lead.customFields as Record<string, unknown>) ?? {},
  };
}

// ============================================================================
// Context Formatters
// ============================================================================

/**
 * Format context for inclusion in prompts.
 */
export function formatContextForPrompt(
  context: RuntimeContext,
  maxMessages: number = 5
): string {
  const parts: string[] = [];

  // Session info
  parts.push(`Session: ${context.sessionId}`);
  parts.push(`Flow Stage: ${context.flowStage}`);
  parts.push(`Turn: ${context.turnNumber + 1}`);
  parts.push(`Channel: ${context.channelContext.channel}`);

  // User profile if available
  if (context.userProfile?.name) {
    parts.push(`\nUser: ${context.userProfile.name}`);
    if (context.userProfile.email) parts.push(`Email: ${context.userProfile.email}`);
  }

  // Relevant entities
  const relevantEntities = context.entities.slice(0, 10);
  if (relevantEntities.length > 0) {
    parts.push("\nKnown Information:");
    for (const entity of relevantEntities) {
      parts.push(`- ${entity.type}: ${entity.value}`);
    }
  }

  // Recent conversation
  const recentMessages = context.messages.slice(-maxMessages);
  if (recentMessages.length > 0) {
    parts.push("\nRecent Conversation:");
    for (const msg of recentMessages) {
      const role = msg.role === "user" ? "User" : "Assistant";
      parts.push(`${role}: ${msg.content.slice(0, 500)}`);
    }
  }

  return parts.join("\n");
}

/**
 * Extract key information from context for decision making.
 */
export function extractContextSignals(
  context: RuntimeContext
): {
  isNewSession: boolean;
  hasUserProfile: boolean;
  entityCount: number;
  messageCount: number;
  lastUserMessage?: string;
  detectedTopics: string[];
} {
  const lastUserMsg = [...context.messages]
    .reverse()
    .find((m) => m.role === "user");

  return {
    isNewSession: context.turnNumber === 0,
    hasUserProfile: !!context.userProfile?.id,
    entityCount: context.entities.length,
    messageCount: context.messages.length,
    lastUserMessage: lastUserMsg?.content,
    detectedTopics: extractTopicsFromEntities(context.entities),
  };
}

function extractTopicsFromEntities(entities: ExtractedEntity[]): string[] {
  // Group entities by type and extract common patterns
  const topics: string[] = [];

  const byType = new Map<string, ExtractedEntity[]>();
  for (const e of entities) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  if (byType.has("company")) topics.push("business");
  if (byType.has("email") || byType.has("phone")) topics.push("contact_info");
  if (byType.has("date")) topics.push("scheduling");
  if (byType.has("location")) topics.push("location");

  return topics;
}
