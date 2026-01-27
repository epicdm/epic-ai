import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });
const writeFile = (p, content) => {
  mkdirp(path.dirname(p));
  if (!fs.existsSync(p)) fs.writeFileSync(p, content, "utf8");
};

const dirs = [
  // Docs anchor for the build pack
  "docs/build-pack/prompts",
  "docs/build-pack/schemas",
  "docs/build-pack/tests",

  // Shared types + zod schemas + prompt keys
  "packages/shared/src/agent-os",
  "packages/shared/src/agent-os/prompts",
  "packages/shared/src/agent-os/schemas",
  "packages/shared/src/agent-os/types",
  "packages/shared/src/agent-os/validators",
  "packages/shared/src/agent-os/__tests__",

  // Workers: queues + processors + llm utils
  "apps/workers/src/queues/agent-os",
  "apps/workers/src/processors/agent-os",
  "apps/workers/src/lib/agent-os",
  "apps/workers/src/lib/agent-os/llm",
  "apps/workers/src/lib/agent-os/risk",
  "apps/workers/src/__tests__/agent-os",

  // Web: API routes for agent-os (App Router convention)
  "apps/web/src/app/api/agent-os/companies",
  "apps/web/src/app/api/agent-os/templates",
  "apps/web/src/app/api/agent-os/agents",
  "apps/web/src/app/api/agent-os/jobs",
];

const files = [
  // shared exports
  [
    "packages/shared/src/agent-os/index.ts",
    `export * from "./types";
export * from "./validators";
export * from "./schemas";
export * from "./prompts";
`,
  ],
  [
    "packages/shared/src/agent-os/types/index.ts",
    `// Agent OS shared types (expand in Sprint 1)
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
`,
  ],
  [
    "packages/shared/src/agent-os/prompts/index.ts",
    `// Prompt keys registry (v1)
export const PROMPT_KEYS = {
  COMPANY_ENRICHMENT_V1: "company_enrichment_v1",
  BRAND_VOICE_V1: "brand_voice_v1",
  TEMPLATE_RECO_V1: "template_recommendation_v1",
  AGENT_BRAIN_V1: "agent_brain_policies_v1",
  KNOWLEDGE_FAQ_V1: "knowledge_extraction_faq_v1",
  EPISODIC_MEMORY_V1: "episodic_memory_summary_v1",
  LEARNING_SAFE_V1: "learning_proposals_safe_v1",
  RISK_DETECTION_V1: "risk_detection_v1",
  EXPLAINABILITY_V1: "explainability_trace_v1",
  ECONOMICS_V1: "economics_estimator_v1",
} as const;

export type PromptKey = typeof PROMPT_KEYS[keyof typeof PROMPT_KEYS];
`,
  ],
  [
    "packages/shared/src/agent-os/schemas/index.ts",
    `// Zod schemas go here in Sprint 1 (envelopes + prompt outputs)
export {};
`,
  ],
  [
    "packages/shared/src/agent-os/validators/index.ts",
    `// Validation helpers (Zod) in Sprint 1
export {};
`,
  ],

  // workers stubs
  [
    "apps/workers/src/queues/agent-os/index.ts",
    `// Agent OS queues registration (BullMQ)
export {};
`,
  ],
  [
    "apps/workers/src/processors/agent-os/company-enrichment.processor.ts",
    `// Company enrichment job processor (Sprint 2)
export async function processCompanyEnrichmentJob(_payload: unknown) {
  // TODO: scrape -> prompt run -> schema validate -> persist
  return { status: "stub" as const };
}
`,
  ],
  [
    "apps/workers/src/processors/agent-os/index.ts",
    `export * from "./company-enrichment.processor";
`,
  ],
  [
    "apps/workers/src/lib/agent-os/llm/prompt-runner.ts",
    `// Prompt runner stub: loads prompt + calls provider + validates output
export async function runPrompt(_args: {
  promptKey: string;
  promptVersion?: number;
  input: unknown;
}) {
  // TODO Sprint 2: implement LLM call + JSON repair retry + zod validation
  return { status: "stub" as const };
}
`,
  ],
  [
    "apps/workers/src/lib/agent-os/risk/risk-detect.ts",
    `// Risk detection stub (Sprint 6)
export async function detectRisk(_transcript: string) {
  return { overall_severity: "low" as const, flags: [] as any[] };
}
`,
  ],

  // web route stubs (App Router)
  [
    "apps/web/src/app/api/agent-os/companies/route.ts",
    `import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ data: null, error: { message: "Not implemented" } }, { status: 501 });
}
`,
  ],
  [
    "apps/web/src/app/api/agent-os/templates/route.ts",
    `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: [], error: null });
}
`,
  ],
  [
    "apps/web/src/app/api/agent-os/agents/route.ts",
    `import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ data: null, error: { message: "Not implemented" } }, { status: 501 });
}
`,
  ],
  [
    "apps/web/src/app/api/agent-os/jobs/route.ts",
    `import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ data: null, error: { message: "Not implemented" } }, { status: 501 });
}
`,
  ],

  // Tests stubs
  [
    "apps/workers/src/__tests__/agent-os/test_missing_pricing_gap.test.ts",
    `test("missing pricing creates a gap (stub)", () => {
  expect(true).toBe(true);
});
`,
  ],
];

function main() {
  // Create dirs
  for (const d of dirs) mkdirp(path.join(ROOT, d));

  // Create files if missing
  for (const [p, content] of files) writeFile(path.join(ROOT, p), content);

  console.log("✅ Agent OS scaffolding created.");
  console.log("Next: add docs/build-pack files + wire routes/queues in Sprint 1.");
}

main();
