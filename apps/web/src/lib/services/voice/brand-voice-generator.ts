/**
 * Brand Voice Generator for Voice Agents
 *
 * Generates voice agent system prompts and greetings from Brand Brain data.
 * This enables "One Brain, Many Voices" - the Brand Brain powers both
 * social media content and voice AI conversations.
 */

import { VoiceTone } from "@epic-ai/database";

export interface BrandBrainData {
  companyName?: string | null;
  description?: string | null;
  mission?: string | null;
  values: string[];
  uniqueSellingPoints: string[];
  industry?: string | null;
  voiceTone: VoiceTone;
  voiceToneCustom?: string | null;
  formalityLevel: number;
  writingStyle?: string | null;
  doNotMention: string[];
  mustMention: string[];
  ctaStyle?: string | null;
  audiences?: Array<{
    name: string;
    description?: string | null;
    demographics?: string | null;
    painPoints: string[];
    goals: string[];
    interests: string[];
    isPrimary: boolean;
  }>;
  pillars?: Array<{
    name: string;
    description?: string | null;
    topics: string[];
    isActive: boolean;
  }>;
}

interface GeneratedVoiceConfig {
  systemPrompt: string;
  greeting: string;
  suggestedVoice: {
    provider: string;
    voiceId: string;
    voiceName: string;
    reason: string;
  };
  temperature: number;
}

/**
 * Maps VoiceTone enum to natural language descriptions for the system prompt
 */
const VOICE_TONE_DESCRIPTIONS: Record<VoiceTone, string> = {
  PROFESSIONAL: "professional, polished, and business-appropriate",
  CASUAL: "casual, relaxed, and conversational",
  ENTHUSIASTIC: "enthusiastic, energetic, and upbeat",
  EDUCATIONAL: "educational, informative, and helpful",
  WITTY: "witty, clever, and engaging with appropriate humor",
  INSPIRATIONAL: "inspirational, motivating, and uplifting",
  EMPATHETIC: "empathetic, understanding, and supportive",
  BOLD: "bold, confident, and assertive",
};

/**
 * Maps formality level (1-5) to language style guidance
 */
const FORMALITY_DESCRIPTIONS: Record<number, string> = {
  1: "very casual and informal, like talking to a friend",
  2: "casual but respectful, approachable and friendly",
  3: "balanced, professional yet personable",
  4: "formal and business-like, maintaining professionalism",
  5: "highly formal and polished, suitable for executive communication",
};

/**
 * Suggests the best TTS voice based on brand personality
 */
function suggestVoice(brandData: BrandBrainData): GeneratedVoiceConfig["suggestedVoice"] {
  const { voiceTone, formalityLevel } = brandData;

  // ElevenLabs voices are premium - suggest based on brand personality
  if (formalityLevel >= 4) {
    // Formal brands get authoritative voices
    if (voiceTone === "PROFESSIONAL" || voiceTone === "BOLD") {
      return {
        provider: "elevenlabs",
        voiceId: "onwK4e9ZLuTAKqWW03F9",
        voiceName: "Daniel (British Male)",
        reason: "Deep, authoritative voice suitable for professional brands",
      };
    }
    return {
      provider: "elevenlabs",
      voiceId: "Xb7hH8MSUJpSbSDYk0k2",
      voiceName: "Alice (British Female)",
      reason: "Confident, professional voice for formal communication",
    };
  }

  if (voiceTone === "ENTHUSIASTIC" || voiceTone === "INSPIRATIONAL") {
    return {
      provider: "elevenlabs",
      voiceId: "AZnzlk1XvdvUeBnXmlld",
      voiceName: "Domi (American Female)",
      reason: "Energetic, friendly voice that conveys enthusiasm",
    };
  }

  if (voiceTone === "EMPATHETIC" || voiceTone === "EDUCATIONAL") {
    return {
      provider: "elevenlabs",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      voiceName: "Rachel (American Female)",
      reason: "Warm, professional voice ideal for supportive conversations",
    };
  }

  if (voiceTone === "CASUAL" || voiceTone === "WITTY") {
    return {
      provider: "elevenlabs",
      voiceId: "iP95p4xoKVk53GoZ742B",
      voiceName: "Chris (American Male)",
      reason: "Casual, conversational voice for approachable brands",
    };
  }

  // Default: versatile, neutral voice
  return {
    provider: "openai",
    voiceId: "nova",
    voiceName: "Nova",
    reason: "Versatile, natural-sounding voice suitable for most brands",
  };
}

/**
 * Generates temperature setting based on brand personality
 */
function suggestTemperature(brandData: BrandBrainData): number {
  const { voiceTone, formalityLevel } = brandData;

  // More creative/casual brands get higher temperature
  if (voiceTone === "WITTY" || voiceTone === "CASUAL") {
    return 0.8;
  }

  // Formal/professional brands get lower temperature for consistency
  if (formalityLevel >= 4 || voiceTone === "PROFESSIONAL") {
    return 0.5;
  }

  // Educational brands need balanced, accurate responses
  if (voiceTone === "EDUCATIONAL") {
    return 0.6;
  }

  // Default: moderate creativity
  return 0.7;
}

/**
 * Generates a voice agent system prompt from Brand Brain data
 */
export function generateSystemPrompt(brandData: BrandBrainData): string {
  const {
    companyName,
    description,
    mission,
    values,
    uniqueSellingPoints,
    industry,
    voiceTone,
    voiceToneCustom,
    formalityLevel,
    writingStyle,
    doNotMention,
    mustMention,
    ctaStyle,
    audiences,
    pillars,
  } = brandData;

  const sections: string[] = [];

  // 1. Identity Section
  const identityParts: string[] = [];
  identityParts.push(`You are a voice AI assistant for ${companyName || "our company"}.`);

  if (description) {
    identityParts.push(description);
  }

  if (industry) {
    identityParts.push(`We operate in the ${industry} industry.`);
  }

  if (mission) {
    identityParts.push(`Our mission: ${mission}`);
  }

  sections.push(identityParts.join(" "));

  // 2. Voice & Tone Section
  const toneParts: string[] = [];
  const toneDescription = voiceToneCustom || VOICE_TONE_DESCRIPTIONS[voiceTone];
  const formalityDescription = FORMALITY_DESCRIPTIONS[formalityLevel] || FORMALITY_DESCRIPTIONS[3];

  toneParts.push(`\nCOMMUNICATION STYLE:`);
  toneParts.push(`- Tone: Be ${toneDescription}.`);
  toneParts.push(`- Formality: Speak in a manner that is ${formalityDescription}.`);

  if (writingStyle) {
    toneParts.push(`- Style: ${writingStyle}`);
  }

  sections.push(toneParts.join("\n"));

  // 3. Key Messages (must mention)
  if (mustMention.length > 0) {
    sections.push(`\nKEY MESSAGES TO CONVEY:\nWhen appropriate, work these points into the conversation:\n${mustMention.map(m => `- ${m}`).join("\n")}`);
  }

  // 4. Unique Selling Points
  if (uniqueSellingPoints.length > 0) {
    sections.push(`\nOUR KEY DIFFERENTIATORS:\n${uniqueSellingPoints.map(usp => `- ${usp}`).join("\n")}`);
  }

  // 5. Brand Values
  if (values.length > 0) {
    sections.push(`\nCORE VALUES TO EMBODY:\n${values.map(v => `- ${v}`).join("\n")}`);
  }

  // 6. Topics to Avoid
  if (doNotMention.length > 0) {
    sections.push(`\nTOPICS TO AVOID:\nNever discuss or mention:\n${doNotMention.map(d => `- ${d}`).join("\n")}`);
  }

  // 7. Audience Understanding
  const primaryAudience = audiences?.find(a => a.isPrimary) || audiences?.[0];
  if (primaryAudience) {
    const audienceParts: string[] = [];
    audienceParts.push(`\nTARGET AUDIENCE UNDERSTANDING:`);
    audienceParts.push(`Our primary audience: ${primaryAudience.name}`);

    if (primaryAudience.description) {
      audienceParts.push(primaryAudience.description);
    }

    if (primaryAudience.painPoints.length > 0) {
      audienceParts.push(`\nTheir common challenges:\n${primaryAudience.painPoints.map(p => `- ${p}`).join("\n")}`);
    }

    if (primaryAudience.goals.length > 0) {
      audienceParts.push(`\nWhat they want to achieve:\n${primaryAudience.goals.map(g => `- ${g}`).join("\n")}`);
    }

    sections.push(audienceParts.join("\n"));
  }

  // 8. Content Expertise (from pillars)
  const activePillars = pillars?.filter(p => p.isActive) || [];
  if (activePillars.length > 0) {
    const pillarTopics = activePillars.flatMap(p => [p.name, ...p.topics]);
    sections.push(`\nAREAS OF EXPERTISE:\nYou can confidently discuss: ${pillarTopics.slice(0, 10).join(", ")}.`);
  }

  // 9. CTA Guidance
  if (ctaStyle && ctaStyle !== "none") {
    const ctaGuidance: Record<string, string> = {
      soft: "When appropriate, gently suggest next steps or offer to help further.",
      direct: "Clearly offer to help callers take action, such as scheduling, purchasing, or connecting with our team.",
      urgent: "Create a sense of importance and encourage immediate action when relevant.",
    };
    sections.push(`\nCALL TO ACTION STYLE:\n${ctaGuidance[ctaStyle] || ctaGuidance.soft}`);
  }

  // 10. General Guidelines
  sections.push(`\nGENERAL GUIDELINES:
- Listen actively and respond thoughtfully to the caller's needs.
- Keep responses concise for natural phone conversation flow.
- Ask clarifying questions when needed rather than making assumptions.
- If you don't know something, be honest and offer to connect them with the right person.
- Always be respectful and patient, even with frustrated callers.`);

  return sections.join("\n");
}

/**
 * Generates a greeting message based on brand personality
 */
export function generateGreeting(brandData: BrandBrainData): string {
  const { companyName, voiceTone, formalityLevel } = brandData;
  const company = companyName || "our team";

  // Formal greetings (level 4-5)
  if (formalityLevel >= 4) {
    if (voiceTone === "PROFESSIONAL") {
      return `Good day, thank you for calling ${company}. How may I assist you today?`;
    }
    return `Hello, and thank you for contacting ${company}. How may I be of service?`;
  }

  // Casual greetings (level 1-2)
  if (formalityLevel <= 2) {
    if (voiceTone === "ENTHUSIASTIC") {
      return `Hey there! Thanks for calling ${company}! What can I help you with today?`;
    }
    if (voiceTone === "CASUAL") {
      return `Hi! You've reached ${company}. What can I do for you?`;
    }
    return `Hey! Thanks for calling ${company}. How can I help?`;
  }

  // Balanced greetings (level 3)
  if (voiceTone === "EMPATHETIC") {
    return `Hello, thank you for calling ${company}. I'm here to help. What can I assist you with today?`;
  }
  if (voiceTone === "ENTHUSIASTIC") {
    return `Hello and welcome to ${company}! I'm excited to help you today. What can I do for you?`;
  }
  if (voiceTone === "WITTY") {
    return `Hello! You've reached ${company}, where every call is a good call. How can I help you today?`;
  }

  // Default balanced greeting
  return `Hello, thank you for calling ${company}. How can I help you today?`;
}

/**
 * Main function: Generate complete voice agent configuration from Brand Brain
 */
export function generateVoiceAgentConfig(brandData: BrandBrainData): GeneratedVoiceConfig {
  return {
    systemPrompt: generateSystemPrompt(brandData),
    greeting: generateGreeting(brandData),
    suggestedVoice: suggestVoice(brandData),
    temperature: suggestTemperature(brandData),
  };
}
