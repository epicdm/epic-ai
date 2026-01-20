import { voiceAgentTemplates, type VoiceAgentTemplate } from "@/lib/voice/templates";

export type AgentTypeId =
  | "sales"
  | "receptionist"
  | "dental_intake"
  | "survey";

export interface AgentTypeConfig {
  id: AgentTypeId;
  title: string;
  description: string;
  templateId: string;
  requiredTools: string[];
  requiredChannels: string[];
  template?: VoiceAgentTemplate;
}

const AGENT_TYPES: AgentTypeConfig[] = [
  {
    id: "sales",
    title: "AI Sales Voice Agent",
    description: "Qualify leads and book demos automatically.",
    templateId: "sales-assistant",
    requiredTools: ["voice", "calendar", "leads"],
    requiredChannels: ["voice"],
  },
  {
    id: "receptionist",
    title: "AI Receptionist",
    description: "Answer calls, route inquiries, and schedule appointments.",
    templateId: "receptionist",
    requiredTools: ["voice", "calendar"],
    requiredChannels: ["voice"],
  },
  {
    id: "dental_intake",
    title: "AI Dental Intake",
    description: "Collect patient intake details and schedule visits.",
    templateId: "healthcare-intake",
    requiredTools: ["voice", "calendar"],
    requiredChannels: ["voice"],
  },
  {
    id: "survey",
    title: "AI Survey Agent",
    description: "Run surveys and capture feedback at scale.",
    templateId: "survey-feedback",
    requiredTools: ["voice", "analytics"],
    requiredChannels: ["voice"],
  },
];

export const agentTypeConfigs = AGENT_TYPES.map((config) => {
  const template = voiceAgentTemplates.find((t) => t.id === config.templateId);
  return {
    ...config,
    template,
  };
});

export function getAgentTypeConfig(id: AgentTypeId): AgentTypeConfig | undefined {
  return AGENT_TYPES.find((config) => config.id === id);
}

export function getAgentTypeTemplate(id: AgentTypeId) {
  return voiceAgentTemplates.find((t) => t.id === getAgentTypeConfig(id)?.templateId);
}
