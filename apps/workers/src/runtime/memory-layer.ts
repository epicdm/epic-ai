/**
 * Memory Layer
 *
 * Handles saving and retrieving conversation memory
 * based on memory_config settings.
 *
 * @module runtime/memory-layer
 */

import { prisma } from "@epic-ai/database";
import type {
  MemoryConfig,
  RuntimeContext,
  MemoryEntry,
  ExtractedEntity,
  ConversationMessage,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface SaveMemoryParams {
  memoryConfig: MemoryConfig;
  sessionId: string;
  agentId: string;
  userInput: string;
  agentResponse: string;
  entities: ExtractedEntity[];
  turnNumber: number;
}

export interface LoadMemoryParams {
  memoryConfig: MemoryConfig;
  sessionId: string;
  agentId: string;
  userId?: string;
}

// ============================================================================
// Memory Saving
// ============================================================================

/**
 * Save memory from the current conversation turn.
 */
export async function saveMemory(params: SaveMemoryParams): Promise<void> {
  const {
    memoryConfig,
    sessionId,
    agentId,
    userInput,
    agentResponse,
    entities,
    turnNumber,
  } = params;

  const now = new Date();

  // 1. Save short-term memory (messages)
  await saveShortTermMemory({
    sessionId,
    agentId,
    userInput,
    agentResponse,
    turnNumber,
    now,
  });

  // 2. Save entities
  await saveEntities({
    sessionId,
    agentId,
    entities,
    now,
  });

  // 3. Update session metadata
  await updateSessionMetadata({
    sessionId,
    turnNumber,
    now,
  });

  // 4. Check if we should promote to long-term memory
  if (shouldPromoteToLongTerm(memoryConfig, turnNumber)) {
    await promoteLongTermMemory({
      memoryConfig,
      sessionId,
      agentId,
      entities,
    });
  }
}

// ============================================================================
// Short-Term Memory (Messages)
// ============================================================================

interface SaveShortTermParams {
  sessionId: string;
  agentId: string;
  userInput: string;
  agentResponse: string;
  turnNumber: number;
  now: Date;
}

async function saveShortTermMemory(params: SaveShortTermParams): Promise<void> {
  const { sessionId, userInput, agentResponse, turnNumber, now } = params;

  // Save user message
  await prisma.agentMessage.create({
    data: {
      sessionId,
      role: "user",
      content: userInput,
      timestamp: now,
      metadata: { turnNumber },
    },
  });

  // Save agent response
  await prisma.agentMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: agentResponse,
      timestamp: now,
      metadata: { turnNumber },
    },
  });
}

// ============================================================================
// Entity Storage
// ============================================================================

interface SaveEntitiesParams {
  sessionId: string;
  agentId: string;
  entities: ExtractedEntity[];
  now: Date;
}

async function saveEntities(params: SaveEntitiesParams): Promise<void> {
  const { sessionId, agentId, entities, now } = params;

  if (entities.length === 0) {
    return;
  }

  // Save entities (check if same type+key exists, update or create)
  for (const entity of entities) {
    // Try to find existing entity with same type
    const existing = await prisma.agentEntity.findFirst({
      where: {
        sessionId,
        entityType: entity.type,
        entityKey: entity.type, // Use type as key for simple entities
      },
    });

    if (existing) {
      await prisma.agentEntity.update({
        where: { id: existing.id },
        data: {
          value: entity.value,
          confidence: entity.confidence,
          extractedFrom: entity.source,
          extractedAt: now,
        },
      });
    } else {
      await prisma.agentEntity.create({
        data: {
          sessionId,
          agentId,
          entityType: entity.type,
          entityKey: entity.type,
          value: entity.value,
          confidence: entity.confidence,
          extractedFrom: entity.source,
          extractedAt: now,
        },
      });
    }
  }
}

// ============================================================================
// Session Metadata
// ============================================================================

interface UpdateSessionParams {
  sessionId: string;
  turnNumber: number;
  now: Date;
}

async function updateSessionMetadata(params: UpdateSessionParams): Promise<void> {
  const { sessionId, turnNumber, now } = params;

  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      lastActivityAt: now,
      turnCount: turnNumber + 1,
      updatedAt: now,
    },
  });
}

// ============================================================================
// Long-Term Memory Promotion
// ============================================================================

function shouldPromoteToLongTerm(memoryConfig: MemoryConfig, turnNumber: number): boolean {
  // Promote after significant conversation (5+ turns)
  // Long-term memory must be enabled and we promote after 5 turns
  if (!memoryConfig.long_term?.enabled) {
    return false;
  }
  const promoteAfterTurns = 5; // Default threshold for long-term promotion
  return turnNumber >= promoteAfterTurns;
}

interface PromoteLongTermParams {
  memoryConfig: MemoryConfig;
  sessionId: string;
  agentId: string;
  entities: ExtractedEntity[];
}

async function promoteLongTermMemory(params: PromoteLongTermParams): Promise<void> {
  const { memoryConfig, sessionId, agentId, entities } = params;

  if (!memoryConfig.long_term?.enabled) {
    return;
  }

  // Get session to find user
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { leadId: true },
  });

  if (!session?.leadId) {
    return;
  }

  // Update lead with extracted entities
  const leadUpdate: Record<string, string> = {};

  for (const entity of entities) {
    if (entity.type === "email" && entity.confidence > 0.8) {
      leadUpdate.email = entity.value;
    }
    if (entity.type === "phone" && entity.confidence > 0.8) {
      leadUpdate.phone = entity.value;
    }
    if (entity.type === "person" && entity.confidence > 0.8) {
      leadUpdate.name = entity.value;
    }
  }

  if (Object.keys(leadUpdate).length > 0) {
    await prisma.lead.update({
      where: { id: session.leadId },
      data: leadUpdate,
    });
  }
}

// ============================================================================
// Memory Loading
// ============================================================================

/**
 * Load memory for a session.
 */
export async function loadMemory(params: LoadMemoryParams): Promise<MemoryEntry[]> {
  const { memoryConfig, sessionId, agentId, userId } = params;

  const entries: MemoryEntry[] = [];

  // 1. Load short-term memory (recent messages)
  const shortTerm = await loadShortTermMemory(sessionId, memoryConfig);
  entries.push(...shortTerm);

  // 2. Load episodic memory (key moments)
  if (memoryConfig.episodic?.enabled) {
    const episodic = await loadEpisodicMemory(sessionId);
    entries.push(...episodic);
  }

  // 3. Load long-term memory (user facts)
  if (memoryConfig.long_term?.enabled && userId) {
    const longTerm = await loadLongTermMemory(userId, sessionId);
    entries.push(...longTerm);
  }

  return entries;
}

async function loadShortTermMemory(
  sessionId: string,
  memoryConfig: MemoryConfig
): Promise<MemoryEntry[]> {
  // Use window_size from schema (not max_messages)
  const windowSize = memoryConfig.short_term?.window_size ?? 10;

  const messages = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { timestamp: "desc" },
    take: windowSize,
  });

  // Get session for conversationId
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  const conversationId = session?.id ?? sessionId;

  return messages.reverse().map((msg) => ({
    sessionId,
    conversationId,
    type: "message" as const,
    content: {
      role: msg.role as "user" | "assistant",
      text: msg.content,
    },
    timestamp: msg.timestamp.toISOString(),
  }));
}

async function loadEpisodicMemory(sessionId: string): Promise<MemoryEntry[]> {
  // TODO: Implement episodic memory storage
  // This would load key moments, decisions, and milestones
  return [];
}

async function loadLongTermMemory(
  userId: string,
  sessionId?: string
): Promise<MemoryEntry[]> {
  // Load user facts from lead data
  const lead = await prisma.lead.findFirst({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      notes: true,
    },
  });

  if (!lead) {
    return [];
  }

  const entries: MemoryEntry[] = [];
  const now = new Date().toISOString();
  // Use provided sessionId or generate a placeholder for long-term entries
  const sid = sessionId ?? "long-term";
  const cid = sid;

  // Combine firstName and lastName for display
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  if (fullName) {
    entries.push({
      sessionId: sid,
      conversationId: cid,
      type: "entity", // Use "entity" instead of invalid "fact"
      content: {
        entity: {
          type: "person",
          value: fullName,
          confidence: 1.0,
          source: "user", // Valid source: "user" | "system" | "assistant"
          timestamp: now,
        },
      },
      timestamp: now,
    });
  }

  if (lead.company) {
    entries.push({
      sessionId: sid,
      conversationId: cid,
      type: "entity",
      content: {
        entity: {
          type: "company",
          value: lead.company,
          confidence: 1.0,
          source: "user", // Valid source: "user" | "system" | "assistant"
          timestamp: now,
        },
      },
      timestamp: now,
    });
  }

  return entries;
}

// ============================================================================
// Memory Cleanup
// ============================================================================

/**
 * Clean up old memory based on retention settings.
 */
export async function cleanupMemory(
  memoryConfig: MemoryConfig,
  agentId: string
): Promise<{ deletedCount: number }> {
  // Use episodic.retention_days (retention_days is not at top level)
  const retentionDays = memoryConfig.episodic?.retention_days ?? 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Delete old messages
  const result = await prisma.agentMessage.deleteMany({
    where: {
      session: {
        agentId,
      },
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  // Delete old sessions
  await prisma.agentSession.deleteMany({
    where: {
      agentId,
      lastActivityAt: {
        lt: cutoffDate,
      },
    },
  });

  return { deletedCount: result.count };
}

// ============================================================================
// Memory Summarization
// ============================================================================

/**
 * Summarize conversation memory for context window management.
 */
export function summarizeMemory(
  entries: MemoryEntry[],
  maxTokens: number = 1000
): string {
  const parts: string[] = [];
  let tokenCount = 0;

  // Helper to extract text content from MemoryEntry
  function getTextContent(entry: MemoryEntry): string {
    if (entry.content.text) return entry.content.text;
    if (entry.content.summary) return entry.content.summary;
    if (entry.content.outcome) return entry.content.outcome;
    if (entry.content.entity) {
      return `${entry.content.entity.type}: ${entry.content.entity.value}`;
    }
    return "";
  }

  // Add entities first (facts about user)
  const entities = entries.filter((e) => e.type === "entity");
  for (const entity of entities) {
    const text = getTextContent(entity);
    const tokens = Math.ceil(text.length / 4);
    if (tokenCount + tokens > maxTokens) break;
    parts.push(`[Entity] ${text}`);
    tokenCount += tokens;
  }

  // Add summaries and outcomes (key moments)
  const summaries = entries.filter((e) => e.type === "summary" || e.type === "outcome");
  for (const summary of summaries) {
    const text = getTextContent(summary);
    const tokens = Math.ceil(text.length / 4);
    if (tokenCount + tokens > maxTokens) break;
    parts.push(`[Summary] ${text}`);
    tokenCount += tokens;
  }

  // Add recent messages (most recent first)
  const messages = entries.filter((e) => e.type === "message").slice(-10);
  for (const msg of messages) {
    const text = msg.content.text ?? "";
    const tokens = Math.ceil(text.length / 4);
    if (tokenCount + tokens > maxTokens) break;
    const role = msg.content.role === "user" ? "User" : "Agent";
    parts.push(`[${role}] ${text}`);
    tokenCount += tokens;
  }

  return parts.join("\n");
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create or get a session for the conversation.
 */
export async function getOrCreateSession(
  agentId: string,
  sessionId: string,
  channel: string,
  leadId?: string
): Promise<{ id: string; isNew: boolean }> {
  const existing = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const newSession = await prisma.agentSession.create({
    data: {
      id: sessionId,
      agentId,
      channel,
      leadId,
      status: "active",
      turnCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  return { id: newSession.id, isNew: true };
}

/**
 * End a session.
 */
export async function endSession(sessionId: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });
}
