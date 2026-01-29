import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Lazy initialization to prevent build errors when env vars are not set
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export interface VoiceAgentConfig {
  agentId: string;
  name: string;
  systemPrompt: string;
  greeting: string;
  fallbackMessage: string;
  voiceId: string;
  llmModel: string;
  knowledgeBase?: string[];
  transferNumber?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface ConversationResult {
  response: string;
  shouldTransfer: boolean;
  sentiment?: "positive" | "neutral" | "negative";
  intent?: string;
}

/**
 * Voice Agent Worker - Handles AI conversations for voice calls
 */
export class VoiceAgent {
  private config: VoiceAgentConfig;
  private conversationHistory: ConversationMessage[];
  private startTime: Date;

  constructor(config: VoiceAgentConfig) {
    this.config = config;
    this.conversationHistory = [];
    this.startTime = new Date();

    // Initialize with system prompt
    this.conversationHistory.push({
      role: "system",
      content: this.buildSystemPrompt(),
      timestamp: new Date(),
    });
  }

  /**
   * Build the complete system prompt including knowledge base
   */
  private buildSystemPrompt(): string {
    let prompt = this.config.systemPrompt;

    // Add knowledge base if available
    if (this.config.knowledgeBase && this.config.knowledgeBase.length > 0) {
      prompt += "\n\n## Knowledge Base\n";
      prompt += this.config.knowledgeBase.join("\n");
    }

    // Add transfer instructions if transfer number is configured
    if (this.config.transferNumber) {
      prompt += `\n\nIf the caller asks to speak to a human or if you cannot help them, respond with exactly "[TRANSFER]" to transfer the call.`;
    }

    // Add conversation guidelines
    prompt += `\n\n## Conversation Guidelines
- Be concise and natural in your responses
- Keep responses under 2-3 sentences for voice clarity
- Ask clarifying questions when needed
- Be helpful and professional
- If you don't know something, say so honestly`;

    return prompt;
  }

  /**
   * Get the greeting message for the call
   */
  getGreeting(): string {
    return this.config.greeting || `Hello! I'm ${this.config.name}. How can I help you today?`;
  }

  /**
   * Get the fallback message when something goes wrong
   */
  getFallbackMessage(): string {
    return this.config.fallbackMessage || "I'm sorry, I didn't catch that. Could you please repeat?";
  }

  /**
   * Process user input and generate a response
   */
  async processMessage(userMessage: string): Promise<ConversationResult> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    try {
      // Build messages for OpenAI
      const messages: ChatCompletionMessageParam[] = this.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call OpenAI
      const completion = await getOpenAI().chat.completions.create({
        model: this.config.llmModel || "gpt-4o-mini",
        messages,
        max_tokens: 150, // Keep responses short for voice
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || this.getFallbackMessage();

      // Check if we should transfer
      const shouldTransfer = response.includes("[TRANSFER]");
      const cleanResponse = response.replace("[TRANSFER]", "").trim();

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: cleanResponse,
        timestamp: new Date(),
      });

      // Analyze sentiment (simple heuristic)
      const sentiment = this.analyzeSentiment(userMessage);

      return {
        response: cleanResponse,
        shouldTransfer,
        sentiment,
      };
    } catch (error) {
      console.error("Error processing message:", error);
      return {
        response: this.getFallbackMessage(),
        shouldTransfer: false,
        sentiment: "neutral",
      };
    }
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
    const lowerText = text.toLowerCase();

    const positiveWords = ["thank", "great", "good", "excellent", "happy", "pleased", "wonderful", "amazing"];
    const negativeWords = ["angry", "frustrated", "upset", "bad", "terrible", "awful", "disappointed", "hate"];

    const positiveCount = positiveWords.filter((word) => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  /**
   * Get the full conversation transcript
   */
  getTranscript(): string {
    return this.conversationHistory
      .filter((msg) => msg.role !== "system")
      .map((msg) => {
        const speaker = msg.role === "user" ? "Caller" : this.config.name;
        return `[${msg.timestamp.toISOString()}] ${speaker}: ${msg.content}`;
      })
      .join("\n");
  }

  /**
   * Get conversation summary using AI
   */
  async getSummary(): Promise<string> {
    const transcript = this.getTranscript();

    if (!transcript) {
      return "No conversation to summarize.";
    }

    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Summarize this phone conversation in 2-3 sentences. Focus on:
1. What the caller wanted
2. How the issue was resolved (or not)
3. Any follow-up actions needed`,
          },
          {
            role: "user",
            content: transcript,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || "Unable to generate summary.";
    } catch (error) {
      console.error("Error generating summary:", error);
      return "Unable to generate summary.";
    }
  }

  /**
   * Get conversation duration in seconds
   */
  getDuration(): number {
    return Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    duration: number;
  } {
    const userMessages = this.conversationHistory.filter((m) => m.role === "user").length;
    const assistantMessages = this.conversationHistory.filter((m) => m.role === "assistant").length;

    return {
      messageCount: userMessages + assistantMessages,
      userMessages,
      assistantMessages,
      duration: this.getDuration(),
    };
  }
}

/**
 * Create a VoiceAgent from database configuration
 */
export function createVoiceAgentFromConfig(dbAgent: {
  id: string;
  name: string;
  systemPrompt: string | null;
  greeting: string | null;
  fallbackMessage: string | null;
  voiceSettings: unknown;
  llmModel: string;
  knowledgeBase: unknown;
  transferNumber: string | null;
}): VoiceAgent {
  const voiceSettings = (dbAgent.voiceSettings as { voiceId?: string }) || {};
  const knowledgeBase = Array.isArray(dbAgent.knowledgeBase) ? dbAgent.knowledgeBase as string[] : [];

  return new VoiceAgent({
    agentId: dbAgent.id,
    name: dbAgent.name,
    systemPrompt: dbAgent.systemPrompt || "You are a helpful voice assistant.",
    greeting: dbAgent.greeting || `Hello! I'm ${dbAgent.name}. How can I help you today?`,
    fallbackMessage: dbAgent.fallbackMessage || "I'm sorry, could you repeat that?",
    voiceId: voiceSettings.voiceId || "nova",
    llmModel: dbAgent.llmModel || "gpt-4o-mini",
    knowledgeBase,
    transferNumber: dbAgent.transferNumber || undefined,
  });
}
