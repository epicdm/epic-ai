import { create } from "zustand";

/** Wizard step identifiers */
export type WizardStep =
  | "company"
  | "template"
  | "configure"
  | "auto-fill"
  | "review";

interface AgentState {
  /** Currently active agent ID (in detail view or wizard) */
  activeAgentId: string | null;
  /** Current wizard step */
  wizardStep: WizardStep;
  /** Selected company ID in wizard */
  selectedCompanyId: string | null;
  /** Selected template slug in wizard */
  selectedTemplateSlug: string | null;
  /** Whether auto-fill is currently running */
  autoFillRunning: boolean;
  /** Auto-fill progress (0-100) */
  autoFillProgress: number;

  /** Actions */
  setActiveAgent: (id: string | null) => void;
  setWizardStep: (step: WizardStep) => void;
  setSelectedCompany: (id: string | null) => void;
  setSelectedTemplate: (slug: string | null) => void;
  setAutoFillRunning: (running: boolean) => void;
  setAutoFillProgress: (progress: number) => void;
  resetWizard: () => void;
}

const initialWizardState = {
  activeAgentId: null,
  wizardStep: "company" as WizardStep,
  selectedCompanyId: null,
  selectedTemplateSlug: null,
  autoFillRunning: false,
  autoFillProgress: 0,
};

export const useAgentStore = create<AgentState>()((set) => ({
  ...initialWizardState,

  setActiveAgent: (id) => set({ activeAgentId: id }),
  setWizardStep: (step) => set({ wizardStep: step }),
  setSelectedCompany: (id) => set({ selectedCompanyId: id }),
  setSelectedTemplate: (slug) => set({ selectedTemplateSlug: slug }),
  setAutoFillRunning: (running) => set({ autoFillRunning: running }),
  setAutoFillProgress: (progress) => set({ autoFillProgress: progress }),
  resetWizard: () => set(initialWizardState),
}));
