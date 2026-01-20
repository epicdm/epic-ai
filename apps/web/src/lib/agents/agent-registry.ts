import { voiceAgentTemplates, type VoiceAgentTemplate } from "@/lib/voice/templates";

export type AgentCategory = "voice" | "social" | "sales" | "support";

export type AgentTypeId =
  | "sales"
  | "receptionist"
  | "dental_intake"
  | "survey";

export type WizardStepId =
  | "brand_kit"
  | "agent_type"
  | "agent_setup"
  | "channels"
  | "path"
  | "ready";

export interface AgentWizardStep {
  id: WizardStepId;
  title: string;
  description: string;
}

export interface AgentTypeConfig {
  id: AgentTypeId;
  name: string;
  description: string;
  category: AgentCategory;
  templateId: string;
  requiredTools: string[];
  requiredChannels: string[];
  template?: VoiceAgentTemplate;
}

export const AGENT_WIZARD_STEPS: AgentWizardStep[] = [
  { id: "brand_kit", title: "Brand Kit", description: "Capture your brand" },
  { id: "agent_type", title: "Agent Type", description: "Top 3 recommendations" },
  { id: "agent_setup", title: "Agent Setup", description: "AI defaults + tools" },
  { id: "channels", title: "Channels", description: "Enable your channels" },
  { id: "path", title: "Setup Path", description: "Choose your journey" },
  { id: "ready", title: "Ready", description: "Let's go!" },
];

const AGENT_TYPES: AgentTypeConfig[] = [
  {
    id: "sales",
    name: "AI Sales Voice Agent",
    description: "Qualify leads and book demos automatically.",
    category: "sales",
    templateId: "sales-assistant",
    requiredTools: ["voice", "calendar", "leads"],
    requiredChannels: ["voice"],
  },
  {
    id: "receptionist",
    name: "AI Receptionist",
    description: "Answer calls, route inquiries, and schedule appointments.",
    category: "support",
    templateId: "receptionist",
    requiredTools: ["voice", "calendar"],
    requiredChannels: ["voice"],
  },
  {
    id: "dental_intake",
    name: "AI Dental Intake",
    description: "Collect patient intake details and schedule visits.",
    category: "support",
    templateId: "healthcare-intake",
    requiredTools: ["voice", "calendar"],
    requiredChannels: ["voice"],
  },
  {
    id: "survey",
    name: "AI Survey Agent",
    description: "Run surveys and capture feedback at scale.",
    category: "voice",
    templateId: "survey-feedback",
    requiredTools: ["voice", "analytics"],
    requiredChannels: ["voice"],
  },
];

export const agentTypeRegistry = AGENT_TYPES.map((config) => ({
  ...config,
  template: voiceAgentTemplates.find((t) => t.id === config.templateId),
}));

export function getAgentTypeConfig(id: AgentTypeId) {
  return agentTypeRegistry.find((config) => config.id === id);
}
