/**
 * Contextual hints for the AI Assistant based on current page
 * Helps users understand what they can do on each page
 */

export interface ContextualHint {
  suggestions: string[];
  welcomeMessage?: string;
  tips?: string[];
}

const pageHints: Record<string, ContextualHint> = {
  "/dashboard": {
    suggestions: [
      "What should I do next to complete my flywheel setup?",
      "Explain how the content flywheel works",
      "How can I improve my engagement metrics?",
    ],
    welcomeMessage: "Welcome to your dashboard! I can help you understand your metrics and guide you through setting up your content flywheel.",
    tips: [
      "Complete the flywheel setup to enable autonomous posting",
      "Check your flywheel status regularly",
    ],
  },
  "/dashboard/brand": {
    suggestions: [
      "Help me define my brand voice",
      "What are content pillars and how do I set them up?",
      "How do I add target audience personas?",
    ],
    welcomeMessage: "I can help you set up your Brand Brain. This is crucial for generating content that matches your brand's voice.",
    tips: [
      "Start with a template that matches your industry",
      "Add at least 3 content pillars for variety",
      "Define your target audience for better content",
    ],
  },
  "/dashboard/content": {
    suggestions: [
      "Generate 3 posts for me right now",
      "How do I use Quick Generate?",
      "What's the difference between Quick and Custom Generate?",
    ],
    welcomeMessage: "This is your Content Factory! I can help you generate and manage AI-powered content.",
    tips: [
      "Use Quick Generate to instantly create 3 posts",
      "Review and edit posts before approving",
      "The AI learns from your edits over time",
    ],
  },
  "/dashboard/content/generate": {
    suggestions: [
      "Give me ideas for engaging LinkedIn posts",
      "How do I create a content series?",
      "What makes a post go viral?",
    ],
    welcomeMessage: "Let's create some great content! Tell me about your topic or let me suggest some ideas based on your Brand Brain.",
    tips: [
      "Be specific about your topic for better results",
      "You can generate for specific platforms",
      "Content pillars help maintain consistency",
    ],
  },
  "/dashboard/social/accounts": {
    suggestions: [
      "How do I connect my Twitter account?",
      "Is it safe to connect my social accounts?",
      "Which platforms should I connect first?",
    ],
    welcomeMessage: "Connect your social accounts here to enable publishing. I can guide you through the OAuth process.",
    tips: [
      "Connect at least 2 platforms for maximum reach",
      "Use your main business accounts",
      "We use OAuth so we never see your password",
    ],
  },
  "/dashboard/analytics": {
    suggestions: [
      "Which of my posts performed best?",
      "What time should I post for maximum engagement?",
      "How can I improve my reach?",
    ],
    welcomeMessage: "I can help you understand your analytics and identify patterns in your best-performing content.",
    tips: [
      "Look for patterns in your top posts",
      "Engagement rate matters more than raw numbers",
      "The AI learns from your analytics to improve content",
    ],
  },
  "/dashboard/voice": {
    suggestions: [
      "How do I create my first voice agent?",
      "What can voice agents do?",
      "How do I train my voice agent?",
    ],
    welcomeMessage: "Voice agents can make and receive calls on your behalf. I can help you set one up!",
    tips: [
      "Start with a template for faster setup",
      "Define your agent's persona clearly",
      "Test your agent before deploying",
    ],
  },
  "/dashboard/settings": {
    suggestions: [
      "How do I enable auto-publishing?",
      "How do I reset my onboarding?",
      "How can I manage my subscription?",
    ],
    welcomeMessage: "I can help you configure your settings and explain each option.",
    tips: [
      "Enable auto-publishing to complete the flywheel",
      "Set posting frequency per platform",
      "Review notifications settings",
    ],
  },
};

// Default hints for unknown pages
const defaultHints: ContextualHint = {
  suggestions: [
    "How do I set up the content flywheel?",
    "Generate some content ideas for me",
    "What should I do next?",
  ],
  welcomeMessage: "Hi! I'm your AI Assistant. I can help you with content creation, voice agents, and understanding your analytics.",
  tips: [
    "Complete your flywheel setup for autonomous posting",
    "Ask me anything about the platform",
  ],
};

/**
 * Get contextual hints based on the current page path
 */
export function getContextualHints(path: string): ContextualHint {
  // Try exact match first
  if (pageHints[path]) {
    return pageHints[path];
  }

  // Try prefix match for nested routes
  const matchingKey = Object.keys(pageHints)
    .filter((key) => path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]; // Get the most specific match

  if (matchingKey) {
    return pageHints[matchingKey];
  }

  return defaultHints;
}

/**
 * Get a proactive tip based on user's flywheel status
 */
export function getFlywheelTip(status: {
  brandSetup: boolean;
  socialConnected: boolean;
  contentCreated: boolean;
  autoPublishing: boolean;
}): string | null {
  if (!status.brandSetup) {
    return "Tip: Set up your Brand Brain first to enable AI content generation that matches your brand voice.";
  }
  if (!status.socialConnected) {
    return "Tip: Connect your social accounts to unlock platform-specific content variations and publishing.";
  }
  if (!status.contentCreated) {
    return "Tip: You're ready to generate content! Try Quick Generate to create 3 posts instantly.";
  }
  if (!status.autoPublishing) {
    return "Tip: Enable auto-publishing in settings to complete your content flywheel and automate your social media.";
  }
  return "Your flywheel is active! Content is being generated and published automatically.";
}

/**
 * Get action suggestions based on the current page and context
 */
export function getActionSuggestions(
  path: string,
  context?: {
    hasContent?: boolean;
    hasAccounts?: boolean;
    hasBrand?: boolean;
  }
): string[] {
  const hints = getContextualHints(path);
  const suggestions = [...hints.suggestions];

  // Add contextual suggestions based on what's missing
  if (path === "/dashboard/content" && !context?.hasContent) {
    suggestions.unshift("Click 'Quick Generate' to create your first posts!");
  }

  if (path === "/dashboard" && !context?.hasAccounts) {
    suggestions.unshift("Connect your social accounts to start publishing");
  }

  return suggestions.slice(0, 3); // Return top 3
}
