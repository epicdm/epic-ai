/**
 * Personality Renderer
 *
 * Applies personality_config traits to transform
 * raw LLM output into brand-voiced responses.
 *
 * @module runtime/personality-renderer
 */

import type { AgentFullConfig } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface ApplyPersonalityParams {
  personalityConfig: AgentFullConfig["personality_config"];
  rawContent: string;
  context?: {
    isFirstTurn?: boolean;
    isClosing?: boolean;
    detectedEmotion?: string;
  };
}

// ============================================================================
// Main Renderer
// ============================================================================

/**
 * Apply personality traits to transform raw LLM content.
 */
export function applyPersonality(params: ApplyPersonalityParams): string {
  const { personalityConfig, rawContent, context } = params;

  let result = rawContent;

  // 1. Apply greeting style if first turn
  if (context?.isFirstTurn && personalityConfig.greeting_style) {
    result = applyGreetingStyle(result, personalityConfig.greeting_style);
  }

  // 2. Apply signoff style if ending
  if (context?.isClosing && personalityConfig.signoff_style) {
    result = applyClosingStyle(result, personalityConfig.signoff_style);
  }

  // 3. Apply emoji preferences
  result = applyEmojiPreferences(result, personalityConfig);

  // 4. Apply formality adjustments
  result = applyFormality(result, personalityConfig.formality);

  // 5. Apply pace-based adjustments (pace is in schema: "slow" | "moderate" | "fast")
  result = applyPace(result, personalityConfig.pace);

  return result.trim();
}

// ============================================================================
// Greeting Style
// ============================================================================

function applyGreetingStyle(content: string, greetingStyle: string): string {
  // If content doesn't start with a greeting, prepend one based on style
  const greetingPatterns = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|welcome)/i;

  if (greetingPatterns.test(content)) {
    return content; // Already has greeting
  }

  const styleLower = greetingStyle.toLowerCase();

  if (styleLower === "warm" || styleLower === "friendly") {
    return `Hi there! ${content}`;
  }

  if (styleLower === "professional" || styleLower === "formal") {
    return `Hello. ${content}`;
  }

  if (styleLower === "casual" || styleLower === "relaxed") {
    return `Hey! ${content}`;
  }

  return content;
}

// ============================================================================
// Closing Style
// ============================================================================

function applyClosingStyle(content: string, closingStyle: string): string {
  const closingPatterns = /\b(bye|goodbye|talk soon|have a great|take care|best regards)/i;

  if (closingPatterns.test(content)) {
    return content; // Already has closing
  }

  const styleLower = closingStyle.toLowerCase();

  if (styleLower === "warm" || styleLower === "friendly") {
    return `${content}\n\nTake care!`;
  }

  if (styleLower === "professional" || styleLower === "formal") {
    return `${content}\n\nBest regards.`;
  }

  if (styleLower === "casual" || styleLower === "relaxed") {
    return `${content}\n\nCatch you later!`;
  }

  return content;
}

// ============================================================================
// Emoji Preferences
// ============================================================================

function applyEmojiPreferences(
  content: string,
  personalityConfig: AgentFullConfig["personality_config"]
): string {
  const useEmojis = personalityConfig.use_emojis;

  if (!useEmojis) {
    // Remove existing emojis if emojis are disabled
    return content.replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      ""
    );
  }

  // When emojis are enabled, apply sparingly (limit to max 2)
  // We rely on LLM to add them if personality allows
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = content.match(emojiRegex) ?? [];

  if (emojis.length > 2) {
    let count = 0;
    return content.replace(emojiRegex, (match) => {
      count++;
      return count <= 2 ? match : "";
    });
  }

  return content;
}

// ============================================================================
// Language Style
// ============================================================================

function applyLanguageStyle(
  content: string,
  languageStyle?: AgentFullConfig["personality_config"]["language_style"]
): string {
  if (!languageStyle) {
    return content;
  }

  let result = content;

  // Apply contractions preference
  if (languageStyle.use_contractions) {
    result = expandToContractions(result);
  } else if (languageStyle.use_contractions === false) {
    result = expandContractions(result);
  }

  // Apply sentence length adjustments
  if (languageStyle.sentence_length === "short") {
    result = shortenSentences(result);
  }

  return result;
}

function expandToContractions(text: string): string {
  const contractionMap: Record<string, string> = {
    "I am": "I'm",
    "I have": "I've",
    "I will": "I'll",
    "I would": "I'd",
    "you are": "you're",
    "you have": "you've",
    "you will": "you'll",
    "you would": "you'd",
    "we are": "we're",
    "we have": "we've",
    "we will": "we'll",
    "we would": "we'd",
    "they are": "they're",
    "they have": "they've",
    "they will": "they'll",
    "they would": "they'd",
    "it is": "it's",
    "it has": "it's",
    "it will": "it'll",
    "that is": "that's",
    "that has": "that's",
    "that will": "that'll",
    "there is": "there's",
    "there are": "there're",
    "here is": "here's",
    "what is": "what's",
    "who is": "who's",
    "how is": "how's",
    "do not": "don't",
    "does not": "doesn't",
    "did not": "didn't",
    "is not": "isn't",
    "are not": "aren't",
    "was not": "wasn't",
    "were not": "weren't",
    "have not": "haven't",
    "has not": "hasn't",
    "had not": "hadn't",
    "will not": "won't",
    "would not": "wouldn't",
    "could not": "couldn't",
    "should not": "shouldn't",
    "cannot": "can't",
    "let us": "let's",
  };

  let result = text;
  for (const [full, contraction] of Object.entries(contractionMap)) {
    const regex = new RegExp(`\\b${full}\\b`, "gi");
    result = result.replace(regex, contraction);
  }

  return result;
}

function expandContractions(text: string): string {
  const expansionMap: Record<string, string> = {
    "I'm": "I am",
    "I've": "I have",
    "I'll": "I will",
    "I'd": "I would",
    "you're": "you are",
    "you've": "you have",
    "you'll": "you will",
    "you'd": "you would",
    "we're": "we are",
    "we've": "we have",
    "we'll": "we will",
    "we'd": "we would",
    "they're": "they are",
    "they've": "they have",
    "they'll": "they will",
    "they'd": "they would",
    "it's": "it is",
    "it'll": "it will",
    "that's": "that is",
    "that'll": "that will",
    "there's": "there is",
    "there're": "there are",
    "here's": "here is",
    "what's": "what is",
    "who's": "who is",
    "how's": "how is",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "won't": "will not",
    "wouldn't": "would not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "can't": "cannot",
    "let's": "let us",
  };

  let result = text;
  for (const [contraction, full] of Object.entries(expansionMap)) {
    const regex = new RegExp(`\\b${contraction}\\b`, "gi");
    result = result.replace(regex, full);
  }

  return result;
}

function shortenSentences(text: string): string {
  // Split long sentences (more than 30 words) at commas or conjunctions
  const sentences = text.split(/(?<=[.!?])\s+/);

  return sentences
    .map((sentence) => {
      const words = sentence.split(/\s+/);
      if (words.length <= 30) {
        return sentence;
      }

      // Try to split at natural break points
      const breakPoints = [", and ", ", but ", ", however ", ", so "];
      for (const bp of breakPoints) {
        if (sentence.includes(bp)) {
          const [first, ...rest] = sentence.split(bp);
          const second = rest.join(bp);
          return `${first}. ${second.charAt(0).toUpperCase()}${second.slice(1)}`;
        }
      }

      return sentence;
    })
    .join(" ");
}

// ============================================================================
// Formality
// ============================================================================

function applyFormality(content: string, formality?: number): string {
  if (formality === undefined) {
    return content;
  }

  // formality 1-5 scale: 1 = casual, 5 = formal (per schema)
  if (formality >= 4) {
    // Very formal - expand contractions, remove casual phrases
    let result = expandContractions(content);
    result = result.replace(/\b(yeah|yep|yup|nope|gonna|wanna|gotta|kinda|sorta)\b/gi, (match) => {
      const formal: Record<string, string> = {
        yeah: "yes",
        yep: "yes",
        yup: "yes",
        nope: "no",
        gonna: "going to",
        wanna: "want to",
        gotta: "have to",
        kinda: "kind of",
        sorta: "sort of",
      };
      return formal[match.toLowerCase()] ?? match;
    });
    return result;
  }

  if (formality <= 2) {
    // Very casual - use contractions, allow casual phrases
    return expandToContractions(content);
  }

  return content;
}

// ============================================================================
// Pace
// ============================================================================

function applyPace(
  content: string,
  pace?: "slow" | "moderate" | "fast"
): string {
  if (!pace || pace === "moderate") {
    return content;
  }

  if (pace === "fast") {
    // For fast pace, attempt to shorten by removing filler phrases
    let result = content;
    const fillerPhrases = [
      /\bbasically\b/gi,
      /\bactually\b/gi,
      /\bjust\b/gi,
      /\breally\b/gi,
      /\bI think that\b/gi,
      /\bit seems like\b/gi,
      /\bkind of\b/gi,
      /\bsort of\b/gi,
    ];
    for (const filler of fillerPhrases) {
      result = result.replace(filler, "");
    }
    // Clean up double spaces
    return result.replace(/\s+/g, " ").trim();
  }

  // For slow pace, we rely on the LLM to provide more detail
  // No post-processing needed
  return content;
}

// ============================================================================
// Phrase Management (legacy - not in current schema)
// ============================================================================

function replaceAvoidedPhrases(content: string, avoidedPhrases?: string[]): string {
  if (!avoidedPhrases || avoidedPhrases.length === 0) {
    return content;
  }

  let result = content;

  for (const phrase of avoidedPhrases) {
    const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "gi");
    // Just remove the phrase for now
    // In v2, we could have a mapping to preferred alternatives
    result = result.replace(regex, "");
  }

  // Clean up any double spaces
  return result.replace(/\s+/g, " ");
}

function ensurePreferredPhrases(content: string, preferredPhrases?: string[]): string {
  // For v1, this is a no-op
  // In v2, we could try to inject preferred phrases where appropriate
  return content;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Tone Adjustment
// ============================================================================

/**
 * Adjust response tone based on detected emotion in user input.
 */
export function adjustToneForEmotion(
  content: string,
  detectedEmotion: string,
  empathyLevel?: "low" | "medium" | "high"
): string {
  if (!detectedEmotion || empathyLevel === "low") {
    return content;
  }

  const emotionLower = detectedEmotion.toLowerCase();

  // Add empathetic preamble for negative emotions
  if (["frustrated", "angry", "upset", "disappointed"].includes(emotionLower)) {
    const empathyPhrases = {
      high: "I completely understand how frustrating this must be, and I really want to help. ",
      medium: "I understand your concern. ",
    };

    const prefix = empathyPhrases[empathyLevel ?? "medium"];
    return `${prefix}${content}`;
  }

  if (["confused", "uncertain", "lost"].includes(emotionLower)) {
    return `Let me help clarify that for you. ${content}`;
  }

  if (["happy", "excited", "pleased"].includes(emotionLower)) {
    return `Great to hear! ${content}`;
  }

  return content;
}

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Format response for specific channel requirements.
 */
export function formatForChannel(
  content: string,
  channel: string,
  maxLength?: number
): string {
  let result = content;

  // Apply character limits
  if (maxLength && result.length > maxLength) {
    // Truncate at word boundary
    result = result.substring(0, maxLength - 3);
    const lastSpace = result.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.7) {
      result = result.substring(0, lastSpace);
    }
    result += "...";
  }

  // Channel-specific formatting
  switch (channel) {
    case "sms":
      // SMS: Keep it short, no markdown
      result = result.replace(/[*_`#]/g, "");
      break;
    case "voice":
      // Voice: Remove markdown, make it speakable
      result = result.replace(/[*_`#\[\]()]/g, "");
      result = result.replace(/\n{2,}/g, ". ");
      break;
    case "webchat":
    case "widget":
      // Web: Markdown is fine
      break;
    case "whatsapp":
      // WhatsApp: Basic formatting
      break;
  }

  return result;
}

/**
 * Generate a brand-consistent signature based on signoff_style.
 * The signoff_style in the schema is a string template for the signoff.
 */
export function generateSignature(
  personalityConfig: AgentFullConfig["personality_config"],
  agentName?: string
): string | null {
  // signoff_style contains the actual signoff text
  // It's used in applyClosingStyle, so this function returns null
  // to avoid duplication. The closing is handled by signoff_style.
  return null;
}
