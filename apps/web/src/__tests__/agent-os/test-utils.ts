/**
 * Agent OS Golden Test Utilities
 *
 * Shared utilities for testing Agent OS API endpoints and services.
 * These tests enforce traceability contracts.
 */

/**
 * Mock request options for testing API routes
 */
export interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Create a mock request object for testing
 * Note: This returns a plain object, not NextRequest, to avoid Web API dependencies
 */
export function createMockRequest(options: MockRequestOptions): {
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  json: () => Promise<unknown>;
} {
  const { method = "GET", url = "http://localhost:3000/api/test", body, headers = {} } = options;

  return {
    method,
    url,
    body,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    json: async () => body,
  };
}

/**
 * Mock Prisma client for testing
 * Returns a mock that can be configured per-test
 */
export function createMockPrisma() {
  return {
    agent: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    agentJob: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adminAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    companyProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(function(this: unknown, fn: (client: unknown) => unknown) { return fn(this); }),
  };
}

/**
 * Mock auth context for testing
 */
export function createMockAuth(options?: { userId?: string; orgId?: string }) {
  return {
    userId: options?.userId ?? "test-user-id",
    orgId: options?.orgId ?? "test-org-id",
  };
}

/**
 * Standard test agent fixture
 */
export function createTestAgent(overrides?: Record<string, unknown>) {
  return {
    id: "test-agent-id",
    organizationId: "test-org-id",
    templateId: null,
    name: "Test Agent",
    slug: "test-agent",
    status: "DRAFT",
    roleCard: {},
    brainConfig: {},
    personalityConfig: {},
    toolConfig: {},
    knowledgeConfig: {},
    memoryConfig: {},
    learningConfig: {},
    governanceConfig: {},
    economicsConfig: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Standard test organization fixture
 */
export function createTestOrg(overrides?: Record<string, unknown>) {
  return {
    id: "test-org-id",
    name: "Test Organization",
    slug: "test-org",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Standard test job fixture
 */
export function createTestJob(overrides?: Record<string, unknown>) {
  return {
    id: "test-job-id",
    organizationId: "test-org-id",
    agentId: "test-agent-id",
    jobType: "PROCESS_KNOWLEDGE",
    status: "PENDING",
    priority: 0,
    progress: 0,
    attempts: 0,
    maxAttempts: 3,
    payload: {},
    result: null,
    error: null,
    scheduledFor: null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Assert response follows ApiResponse envelope
 */
export function assertApiResponse(response: {
  data: unknown;
  confidence?: Record<string, number>;
  gaps?: unknown[];
  warnings?: unknown[];
  error?: { code: string; message: string };
}) {
  // data must be present (even if null)
  expect(response).toHaveProperty("data");

  // If error, check structure
  if (response.error) {
    expect(response.error).toHaveProperty("code");
    expect(response.error).toHaveProperty("message");
    expect(typeof response.error.code).toBe("string");
    expect(typeof response.error.message).toBe("string");
  }

  // If confidence, all values must be 0-1
  if (response.confidence) {
    Object.values(response.confidence).forEach((value) => {
      expect(typeof value).toBe("number");
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  }

  // If gaps, check array structure
  if (response.gaps) {
    expect(Array.isArray(response.gaps)).toBe(true);
  }

  // If warnings, check array structure
  if (response.warnings) {
    expect(Array.isArray(response.warnings)).toBe(true);
  }
}

/**
 * Assert gap item follows GapItem schema
 */
export function assertGapItem(gap: {
  gap_type: string;
  field_path: string;
  severity: string;
  impact: string;
  recommended_fix: string;
}) {
  expect(gap).toHaveProperty("gap_type");
  expect(gap).toHaveProperty("field_path");
  expect(gap).toHaveProperty("severity");
  expect(gap).toHaveProperty("impact");
  expect(gap).toHaveProperty("recommended_fix");

  expect(["missing_required", "missing_recommended", "missing_config", "missing_data", "missing_profile", "incomplete", "invalid", "missing_pricing"]).toContain(
    gap.gap_type
  );
  expect(["low", "medium", "high"]).toContain(gap.severity);
}

/**
 * Assert warning item follows WarningItem schema
 */
export function assertWarningItem(warning: {
  code: string;
  message: string;
  severity: string;
}) {
  expect(warning).toHaveProperty("code");
  expect(warning).toHaveProperty("message");
  expect(warning).toHaveProperty("severity");

  expect(["info", "warning", "error"]).toContain(warning.severity);
}
