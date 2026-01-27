/**
 * Knowledge Retriever
 *
 * Retrieves relevant knowledge chunks from configured sources
 * based on user input and context.
 *
 * @module runtime/knowledge-retriever
 */

import type {
  KnowledgeConfig,
  RuntimeContext,
  KnowledgeResult,
  KnowledgeChunk,
} from "./types";

// ============================================================================
// Knowledge Retrieval
// ============================================================================

export interface RetrieveKnowledgeParams {
  knowledgeConfig: KnowledgeConfig;
  userInput: string;
  context: RuntimeContext;
}

/**
 * Retrieve relevant knowledge for the current turn.
 */
export async function retrieveKnowledge(
  params: RetrieveKnowledgeParams
): Promise<KnowledgeResult> {
  const { knowledgeConfig, userInput, context } = params;

  // Build search query from user input + context
  const query = buildSearchQuery(userInput, context);

  // Check quick answers first (FAQ-style exact matches)
  const quickAnswer = findQuickAnswer(knowledgeConfig, query);
  if (quickAnswer) {
    return {
      chunks: [quickAnswer],
      totalFound: 1,
      query,
      totalTokens: estimateTokens(quickAnswer.content),
    };
  }

  // Retrieve from configured sources
  const chunks = await searchKnowledgeSources(knowledgeConfig, query);

  // Rerank if enabled
  const rankedChunks = knowledgeConfig.retrieval_settings?.rerank
    ? await rerankChunks(chunks, query, knowledgeConfig.retrieval_settings.rerank_model)
    : chunks;

  // Apply top_k limit
  const topK = knowledgeConfig.retrieval_settings?.top_k ?? 5;
  const limitedChunks = rankedChunks.slice(0, topK);

  // Apply token limit
  const maxTokens = knowledgeConfig.context_window?.max_knowledge_tokens ?? 2000;
  const tokenLimitedChunks = applyTokenLimit(limitedChunks, maxTokens);

  return {
    chunks: tokenLimitedChunks,
    totalFound: chunks.length,
    query,
    totalTokens: tokenLimitedChunks.reduce((sum, c) => sum + (c.tokens ?? 0), 0),
  };
}

// ============================================================================
// Query Building
// ============================================================================

function buildSearchQuery(
  userInput: string,
  context: RuntimeContext
): string {
  // Start with user input
  let query = userInput;

  // Add context from recent conversation if it helps
  const lastAssistantMessage = [...context.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  // If this is a follow-up, include context
  if (
    lastAssistantMessage &&
    isFollowUpQuestion(userInput)
  ) {
    query = `${lastAssistantMessage.content.slice(0, 100)}... ${userInput}`;
  }

  // Add relevant entities
  const relevantEntities = context.entities
    .filter((e) => e.confidence > 0.7)
    .slice(0, 3);

  if (relevantEntities.length > 0) {
    const entityContext = relevantEntities
      .map((e) => `${e.type}: ${e.value}`)
      .join(", ");
    query = `${query} (context: ${entityContext})`;
  }

  return query;
}

function isFollowUpQuestion(input: string): boolean {
  const followUpIndicators = [
    "what about",
    "how about",
    "and",
    "also",
    "more about",
    "tell me more",
    "can you explain",
    "what do you mean",
  ];

  const inputLower = input.toLowerCase();
  return followUpIndicators.some((i) => inputLower.includes(i));
}

// ============================================================================
// Quick Answers (FAQ)
// ============================================================================

function findQuickAnswer(
  knowledgeConfig: KnowledgeConfig,
  query: string
): KnowledgeChunk | null {
  const quickAnswers = knowledgeConfig.quick_answers ?? [];

  if (quickAnswers.length === 0) {
    return null;
  }

  const queryLower = query.toLowerCase();

  for (const qa of quickAnswers) {
    const triggerMatch = qa.triggers.some((trigger) => {
      const triggerLower = trigger.toLowerCase();
      // Fuzzy match: check if query contains trigger or vice versa
      return (
        queryLower.includes(triggerLower) ||
        triggerLower.includes(queryLower) ||
        similarEnough(queryLower, triggerLower)
      );
    });

    if (triggerMatch) {
      const threshold = qa.confidence_threshold ?? 0.8;
      const confidence = calculateMatchConfidence(queryLower, qa.triggers);

      if (confidence >= threshold) {
        return {
          id: `qa-${qa.triggers[0]}`,
          content: qa.answer,
          source: {
            type: "faq",
            name: "Quick Answers",
          },
          relevance: confidence,
          tokens: estimateTokens(qa.answer),
        };
      }
    }
  }

  return null;
}

function similarEnough(a: string, b: string): boolean {
  // Simple similarity: check word overlap
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  return overlap / Math.min(wordsA.size, wordsB.size) > 0.5;
}

function calculateMatchConfidence(query: string, triggers: string[]): number {
  let bestMatch = 0;

  for (const trigger of triggers) {
    const triggerLower = trigger.toLowerCase();

    // Exact match
    if (query === triggerLower) {
      return 1.0;
    }

    // Contains match
    if (query.includes(triggerLower)) {
      bestMatch = Math.max(bestMatch, 0.9);
      continue;
    }

    // Word overlap
    const queryWords = new Set(query.split(/\s+/));
    const triggerWords = trigger.toLowerCase().split(/\s+/);
    const matchingWords = triggerWords.filter((w) => queryWords.has(w));
    const overlapScore = matchingWords.length / triggerWords.length;

    bestMatch = Math.max(bestMatch, overlapScore * 0.8);
  }

  return bestMatch;
}

// ============================================================================
// Source Search
// ============================================================================

async function searchKnowledgeSources(
  knowledgeConfig: KnowledgeConfig,
  query: string
): Promise<KnowledgeChunk[]> {
  const sources = knowledgeConfig.sources ?? [];
  const allChunks: KnowledgeChunk[] = [];

  // Group sources by priority
  const byPriority = new Map<number, typeof sources>();
  for (const source of sources) {
    const priority = source.priority ?? 1;
    const list = byPriority.get(priority) ?? [];
    list.push(source);
    byPriority.set(priority, list);
  }

  // Search high priority sources first
  const priorities = [...byPriority.keys()].sort((a, b) => b - a);

  for (const priority of priorities) {
    const sourcesAtPriority = byPriority.get(priority) ?? [];

    // Search sources in parallel at same priority level
    const results = await Promise.all(
      sourcesAtPriority.map((source) => searchSingleSource(source, query))
    );

    for (const chunks of results) {
      allChunks.push(...chunks);
    }

    // If we have enough chunks from high priority, we can stop
    const topK = knowledgeConfig.retrieval_settings?.top_k ?? 5;
    if (allChunks.length >= topK * 2) {
      break;
    }
  }

  return allChunks;
}

async function searchSingleSource(
  source: { id: string; name: string; type: string },
  query: string
): Promise<KnowledgeChunk[]> {
  // TODO: Implement actual vector search integration
  // For v1, this is a stub that would connect to:
  // - Pinecone, Qdrant, or Weaviate for vector search
  // - PostgreSQL with pgvector
  // - Simple text search as fallback

  // Stub implementation: return empty
  // In production, this would call the appropriate vector store
  return [];
}

// ============================================================================
// Reranking
// ============================================================================

async function rerankChunks(
  chunks: KnowledgeChunk[],
  query: string,
  _model?: string
): Promise<KnowledgeChunk[]> {
  // TODO: Implement cross-encoder reranking
  // Options:
  // - Cohere Rerank API
  // - OpenAI embedding similarity
  // - Custom cross-encoder model

  // For v1, just sort by relevance score
  return [...chunks].sort((a, b) => b.relevance - a.relevance);
}

// ============================================================================
// Token Management
// ============================================================================

function estimateTokens(text: string): number {
  // Simple estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function applyTokenLimit(
  chunks: KnowledgeChunk[],
  maxTokens: number
): KnowledgeChunk[] {
  const result: KnowledgeChunk[] = [];
  let totalTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = chunk.tokens ?? estimateTokens(chunk.content);

    if (totalTokens + chunkTokens > maxTokens) {
      // Check if we have at least one chunk
      if (result.length === 0) {
        // Include first chunk even if it exceeds limit
        result.push({ ...chunk, tokens: chunkTokens });
      }
      break;
    }

    result.push({ ...chunk, tokens: chunkTokens });
    totalTokens += chunkTokens;
  }

  return result;
}

// ============================================================================
// Knowledge Formatting
// ============================================================================

/**
 * Format knowledge chunks for inclusion in prompt.
 */
export function formatKnowledgeForPrompt(
  chunks: KnowledgeChunk[],
  maxChunks: number = 5
): string {
  if (chunks.length === 0) {
    return "";
  }

  const limitedChunks = chunks.slice(0, maxChunks);

  const parts = ["Relevant Knowledge:"];

  for (const chunk of limitedChunks) {
    const sourceInfo = chunk.source.url
      ? `[${chunk.source.name}](${chunk.source.url})`
      : chunk.source.name;

    parts.push(`\n---\nSource: ${sourceInfo}\n${chunk.content}`);
  }

  return parts.join("\n");
}

/**
 * Check if we have enough knowledge to answer.
 */
export function hasRelevantKnowledge(
  result: KnowledgeResult,
  threshold: number = 0.6
): boolean {
  if (result.chunks.length === 0) {
    return false;
  }

  // Check if at least one chunk has high enough relevance
  return result.chunks.some((c) => c.relevance >= threshold);
}
