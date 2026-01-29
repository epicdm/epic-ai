import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAgentAccess, isErrorResponse } from "../_helpers";
import { prisma } from "@epic-ai/database";

// Strict schemas for validation
import { StrictConfigSchemas } from "@epic-ai/shared";

// ============================================================================
// Request Schema
// ============================================================================

const AnswerItemSchema = z.object({
  field_path: z.string().min(1),
  value: z.unknown(),
});

const AnswerToPatchRequestSchema = z
  .object({
    // accepts array of answers from UI
    answers: z.array(AnswerItemSchema).min(1),

    // optional: force a module (rare; mostly we infer)
    forceModule: z
      .enum([
        "roleCard",
        "brainConfig",
        "personalityConfig",
        "toolConfig",
        "knowledgeConfig",
        "memoryConfig",
        "learningConfig",
        "governanceConfig",
        "economicsConfig",
        "flowConfig",
      ])
      .optional(),

    // optional: if true, does not write; just returns patch plan
    dryRun: z.boolean().default(false),
  })
  .strict();

type ModuleKey = keyof typeof StrictConfigSchemas;

// ============================================================================
// Module <-> DB JSONB field mapping
// ============================================================================

const MODULE_DB_FIELDS: Record<ModuleKey, string> = {
  roleCard: "roleCard",
  brainConfig: "brainConfig",
  personalityConfig: "personalityConfig",
  toolConfig: "toolConfig",
  knowledgeConfig: "knowledgeConfig",
  memoryConfig: "memoryConfig",
  learningConfig: "learningConfig",
  governanceConfig: "governanceConfig",
  economicsConfig: "economicsConfig",
  flowConfig: "flowConfig",
};

// ============================================================================
// Helpers: dot-path set
// Supports "knowledge_config.quick_answers[0].answer" too
// ============================================================================

function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = [];
  const re = /([^.[]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    if (m[1]) parts.push(m[1]);
    else if (m[2]) parts.push(Number(m[2]));
  }
  return parts;
}

function deepClone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function setAtPath(
  obj: Record<string, unknown>,
  pathTokens: Array<string | number>,
  value: unknown
) {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < pathTokens.length; i++) {
    const key = pathTokens[i];
    const isLast = i === pathTokens.length - 1;

    if (isLast) {
      cur[key as string] = value;
      return;
    }

    const nextKey = pathTokens[i + 1];
    const shouldBeArray = typeof nextKey === "number";

    if (cur[key as string] === undefined || cur[key as string] === null) {
      cur[key as string] = shouldBeArray ? [] : {};
    }

    cur = cur[key as string] as Record<string, unknown>;
  }
}

function ensureObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

// ============================================================================
// Infer module from field_path
// v1: prefix-based + fallback heuristics
// ============================================================================

function inferModuleFromFieldPath(fieldPath: string): {
  module: ModuleKey | null;
  relativePath: string;
} {
  const p = fieldPath.trim();

  // Allow either dot prefixes or snake prefixes from evidence/gaps
  const prefixMap: Array<[RegExp, ModuleKey]> = [
    [/^(role_card|roleCard)\./, "roleCard"],
    [/^(brain_config|brainConfig)\./, "brainConfig"],
    [/^(personality_config|personalityConfig)\./, "personalityConfig"],
    [/^(tool_config|toolConfig|tools)\./, "toolConfig"],
    [/^(knowledge_config|knowledgeConfig|knowledge)\./, "knowledgeConfig"],
    [/^(memory_config|memoryConfig|memory)\./, "memoryConfig"],
    [/^(learning_config|learningConfig|learning)\./, "learningConfig"],
    [/^(governance_config|governanceConfig|governance)\./, "governanceConfig"],
    [/^(economics_config|economicsConfig|economics)\./, "economicsConfig"],
    [/^(flow_config|flowConfig|flow)\./, "flowConfig"],
  ];

  for (const [re, mod] of prefixMap) {
    if (re.test(p)) {
      // remove the prefix up to first dot
      const relative = p.replace(/^[^.]+\./, "");
      return { module: mod, relativePath: relative };
    }
  }

  // Fallback heuristics: if gaps use field paths like "pricing_model" or "hours_of_operation"
  // treat them as knowledge defaults (v1) because those live in knowledge_config typically.
  const knowledgeish = [
    "pricing",
    "hours",
    "service_area",
    "faq",
    "quick_answers",
    "sources",
    "products",
    "services",
  ];
  if (knowledgeish.some((k) => p.toLowerCase().includes(k))) {
    return { module: "knowledgeConfig", relativePath: p };
  }

  return { module: null, relativePath: p };
}

// ============================================================================
// Apply patch to one module blob with strict validation
// ============================================================================

function patchModuleBlobStrict(
  moduleKey: ModuleKey,
  currentBlob: unknown,
  patches: Array<{ relativePath: string; value: unknown }>
): Record<string, unknown> {
  const working = deepClone(ensureObject(currentBlob));

  for (const p of patches) {
    const tokens = parsePath(p.relativePath);
    if (tokens.length === 0) continue;
    setAtPath(working, tokens, p.value);
  }

  // Strict validation (reject unknown keys)
  const schema = StrictConfigSchemas[moduleKey];
  const parsed = schema.parse(working);
  return parsed as Record<string, unknown>;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await ctx.params;

    // Must be editable (draft protection)
    const accessResult = await validateAgentAccess(agentId, { requireEditable: true });
    if (isErrorResponse(accessResult)) {
      return accessResult;
    }

    const body = await req.json();
    const input = AnswerToPatchRequestSchema.parse(body);

    // Load agent current config blobs
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        status: true,
        roleCard: true,
        brainConfig: true,
        personalityConfig: true,
        toolConfig: true,
        knowledgeConfig: true,
        memoryConfig: true,
        learningConfig: true,
        governanceConfig: true,
        economicsConfig: true,
        flowConfig: true,
      },
    });

    if (!agent) {
      return NextResponse.json({
        data: null,
        gaps: [],
        warnings: [
          { code: "NOT_FOUND", message: "Agent not found", severity: "error" },
        ],
      });
    }

    // Group answers -> module
    const grouped: Record<
      ModuleKey,
      Array<{ relativePath: string; value: unknown; field_path: string }>
    > = {
      roleCard: [],
      brainConfig: [],
      personalityConfig: [],
      toolConfig: [],
      knowledgeConfig: [],
      memoryConfig: [],
      learningConfig: [],
      governanceConfig: [],
      economicsConfig: [],
      flowConfig: [],
    };

    const warnings: Array<{
      code: string;
      message: string;
      severity: string;
      field_path?: string;
    }> = [];

    for (const ans of input.answers) {
      const inferred = input.forceModule
        ? {
            module: input.forceModule as ModuleKey,
            relativePath: ans.field_path.replace(/^[^.]+\./, ""),
          }
        : inferModuleFromFieldPath(ans.field_path);

      if (!inferred.module) {
        warnings.push({
          code: "UNMAPPED_FIELD_PATH",
          message: `Could not infer module for field_path: ${ans.field_path}`,
          severity: "warning",
          field_path: ans.field_path,
        });
        continue;
      }

      grouped[inferred.module].push({
        relativePath: inferred.relativePath,
        value: ans.value,
        field_path: ans.field_path,
      });
    }

    // Build patch plan
    const plan = Object.entries(grouped)
      .filter(([, list]) => list.length > 0)
      .map(([moduleKey, list]) => ({
        module: moduleKey,
        updates: list.map((x) => ({
          field_path: x.field_path,
          relativePath: x.relativePath,
        })),
      }));

    if (input.dryRun) {
      return NextResponse.json({
        data: { agentId, dryRun: true, plan },
        confidence: { answer_to_patch: 0.95 },
        gaps: [],
        warnings,
      });
    }

    // Apply module patches with strict schema validation
    const updates: Record<string, unknown> = {};
    const patchedModules: Array<{ module: ModuleKey; count: number }> = [];

    for (const [moduleKey, list] of Object.entries(grouped) as Array<
      [ModuleKey, Array<{ relativePath: string; value: unknown }>]
    >) {
      if (!list.length) continue;

      const dbField = MODULE_DB_FIELDS[moduleKey];
      const currentBlob = (agent as Record<string, unknown>)[dbField];

      const nextBlob = patchModuleBlobStrict(
        moduleKey,
        currentBlob,
        list.map((x) => ({ relativePath: x.relativePath, value: x.value }))
      );

      updates[dbField] = nextBlob;
      patchedModules.push({ module: moduleKey, count: list.length });
    }

    // Save updated blobs
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: updates,
      select: { id: true },
    });

    return NextResponse.json({
      data: {
        agentId: updated.id,
        patchedModules,
        plan,
      },
      confidence: { answer_to_patch: 0.9 },
      gaps: [],
      warnings,
    });
  } catch (e) {
    console.error("[answer-to-patch] Error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    );
  }
}
