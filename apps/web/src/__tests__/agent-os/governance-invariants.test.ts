/**
 * Agent OS Golden Test: Draft vs Published Governance Invariants
 *
 * TRACEABILITY TEST: Verifies deployment governance rules
 *
 * Contract:
 * - DRAFT agents can be patched freely
 * - PUBLISHED agents: PATCH returns 409 with AGENT_PUBLISHED error
 * - Clone-draft creates an editable copy of any non-archived agent
 * - ARCHIVED agents cannot be modified or cloned
 */

// Mock NextResponse before any imports that use it
class MockNextResponse {
  private body: unknown;
  readonly status: number;

  constructor(body: unknown, options?: { status?: number }) {
    this.body = body;
    this.status = options?.status || 200;
  }

  async json() {
    return this.body;
  }

  static json(body: unknown, options?: { status?: number }) {
    return new MockNextResponse(body, options);
  }
}

jest.mock("next/server", () => ({
  NextResponse: MockNextResponse,
  NextRequest: jest.fn(),
}));

// Mock prisma
jest.mock("@epic-ai/database", () => ({
  prisma: {
    agent: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  getAuthWithBypass: jest.fn(),
}));

// Mock sync-user
jest.mock("@/lib/sync-user", () => ({
  getUserOrganization: jest.fn(),
}));

// Import after mocks
import { validateAgentAccess, isErrorResponse } from "../../app/api/agent-os/agents/[id]/_helpers";
import { prisma } from "@epic-ai/database";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuth = getAuthWithBypass as jest.Mock;
const mockGetUserOrg = getUserOrganization as jest.Mock;

describe("Agent OS Governance Invariants - Golden Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth setup
    mockGetAuth.mockResolvedValue({ userId: "test-user-id" });
    mockGetUserOrg.mockResolvedValue({ id: "test-org-id", name: "Test Org" });
  });

  // ============================================
  // TEST 1: DRAFT agents can be modified
  // ============================================
  describe("DRAFT Agent Access", () => {
    it("allows PATCH on DRAFT agents with requireEditable=true", async () => {
      const draftAgent = {
        id: "agent-1",
        organizationId: "test-org-id",
        status: "DRAFT",
        name: "Test Agent",
        roleCard: {},
        brainConfig: {},
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(draftAgent);

      const result = await validateAgentAccess("agent-1", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result.agent.status).toBe("DRAFT");
      }
    });

    it("allows PATCH on TESTING agents with requireEditable=true", async () => {
      const testingAgent = {
        id: "agent-2",
        organizationId: "test-org-id",
        status: "TESTING",
        name: "Test Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(testingAgent);

      const result = await validateAgentAccess("agent-2", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(false);
    });

    it("allows PATCH on PENDING_REVIEW agents with requireEditable=true", async () => {
      const pendingAgent = {
        id: "agent-3",
        organizationId: "test-org-id",
        status: "PENDING_REVIEW",
        name: "Test Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(pendingAgent);

      const result = await validateAgentAccess("agent-3", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(false);
    });
  });

  // ============================================
  // TEST 2: PUBLISHED agents cannot be modified
  // ============================================
  describe("PUBLISHED Agent Protection", () => {
    it("blocks PATCH on PUBLISHED agents with requireEditable=true", async () => {
      const publishedAgent = {
        id: "agent-published",
        organizationId: "test-org-id",
        status: "PUBLISHED",
        name: "Published Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(publishedAgent);

      const result = await validateAgentAccess("agent-published", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const json = await result.json();
        expect(json.error.code).toBe("AGENT_PUBLISHED");
        expect(json.error.message).toBe("Agent is published; create a new draft version to edit.");
        expect(json.error.details).toHaveProperty("hint");
        expect(json.error.details.hint).toContain("clone-draft");
        expect(result.status).toBe(409);
      }
    });

    it("allows GET on PUBLISHED agents (no requireEditable)", async () => {
      const publishedAgent = {
        id: "agent-published",
        organizationId: "test-org-id",
        status: "PUBLISHED",
        name: "Published Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(publishedAgent);

      // GET routes don't pass requireEditable
      const result = await validateAgentAccess("agent-published");

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result.agent.status).toBe("PUBLISHED");
      }
    });
  });

  // ============================================
  // TEST 3: ARCHIVED agents cannot be modified
  // ============================================
  describe("ARCHIVED Agent Protection", () => {
    it("blocks all access to ARCHIVED agents", async () => {
      const archivedAgent = {
        id: "agent-archived",
        organizationId: "test-org-id",
        status: "ARCHIVED",
        name: "Archived Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(archivedAgent);

      const result = await validateAgentAccess("agent-archived", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const json = await result.json();
        expect(json.error.code).toBe("AGENT_ARCHIVED");
        expect(result.status).toBe(400);
      }
    });

    it("blocks ARCHIVED agents even without requireEditable", async () => {
      const archivedAgent = {
        id: "agent-archived",
        organizationId: "test-org-id",
        status: "ARCHIVED",
        name: "Archived Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(archivedAgent);

      // Even GET routes should be blocked for archived agents
      const result = await validateAgentAccess("agent-archived");

      expect(isErrorResponse(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 4: PAUSED agents can be modified
  // ============================================
  describe("PAUSED Agent Access", () => {
    it("allows PATCH on PAUSED agents with requireEditable=true", async () => {
      const pausedAgent = {
        id: "agent-paused",
        organizationId: "test-org-id",
        status: "PAUSED",
        name: "Paused Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(pausedAgent);

      const result = await validateAgentAccess("agent-paused", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(false);
    });
  });

  // ============================================
  // TEST 5: Error Response Structure
  // ============================================
  describe("Governance Error Response Structure", () => {
    it("returns structured error with code, message, and details for published agents", async () => {
      const publishedAgent = {
        id: "agent-published",
        organizationId: "test-org-id",
        status: "PUBLISHED",
        name: "Published Agent",
      };

      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(publishedAgent);

      const result = await validateAgentAccess("agent-published", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const json = await result.json();

        // Check error structure
        expect(json).toHaveProperty("data", null);
        expect(json).toHaveProperty("error");
        expect(json.error).toHaveProperty("code");
        expect(json.error).toHaveProperty("message");
        expect(json.error).toHaveProperty("details");

        // Check details contain helpful info
        expect(json.error.details).toHaveProperty("agentId", "agent-published");
        expect(json.error.details).toHaveProperty("currentStatus", "PUBLISHED");
        expect(json.error.details).toHaveProperty("hint");
      }
    });
  });

  // ============================================
  // TEST 6: Auth and ownership checks still work
  // ============================================
  describe("Auth and Ownership Checks", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetAuth.mockResolvedValue({ userId: null });

      const result = await validateAgentAccess("agent-1", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        expect(result.status).toBe(401);
      }
    });

    it("returns 404 when no organization", async () => {
      mockGetUserOrg.mockResolvedValue(null);

      const result = await validateAgentAccess("agent-1", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        expect(result.status).toBe(404);
      }
    });

    it("returns 404 when agent not found", async () => {
      (mockPrisma.agent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateAgentAccess("nonexistent", { requireEditable: true });

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const json = await result.json();
        expect(json.error.code).toBe("NOT_FOUND");
        expect(result.status).toBe(404);
      }
    });
  });
});
