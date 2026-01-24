// Agent OS shared types (expand in Sprint 1)
export type ConfidenceMap = Record<string, number>;

export type EvidenceItem = {
  field_path: string;
  source_id: string;
  source_type: "website" | "social" | "manual";
  source_url?: string;
  quote: string;
  notes?: string;
};

export type GapItem = {
  gap_type: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
};

export type PromptEnvelope<T> = {
  result: T;
  confidence: ConfidenceMap;
  evidence: EvidenceItem[];
  gaps: GapItem[];
  warnings?: string[];
};
