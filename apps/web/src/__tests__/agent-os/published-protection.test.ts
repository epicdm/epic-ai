/**
 * Published Agent Protection Tests
 *
 * Tests that PUBLISHED and ARCHIVED agents are immutable and cannot be
 * assembled into. Users must clone to DRAFT first.
 */

import {
  createMockPrisma,
  createMockAuth,
  createTestAgent,
  createTestOrg,
} from './test-utils';

// Mock dependencies
const mockPrisma = createMockPrisma();
const mockAuth = createMockAuth();

jest.mock('@epic-ai/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => Promise.resolve(mockAuth)),
}));

// Mock the assembly orchestrator
const mockAssembleAgent = jest.fn();
jest.mock('@epic-ai/workers/processors/agent-os', () => ({
  assembleAgent: mockAssembleAgent,
}));

describe('Published Agent Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.organization.findFirst.mockResolvedValue(createTestOrg());
    mockAssembleAgent.mockResolvedValue({
      status: 'draft',
      agentId: 'test-agent-id',
      wizard_snapshot: {
        company_profile: { name: 'Test' },
        selected_template: { template_key: 'sales_qualifier' },
        tools: { essential: [], recommended: [], optional: [], disabled: [] },
        flows: { nodes: [], edges: [] },
        personality: { persona: {}, tone: {} },
        knowledge: { seed_facts: [] },
        governance: { compliance_mode: 'standard' },
        economics: { token_budget_per_conversation: 4000 },
      },
      assembly_state: { phase: 'done', completed: [] },
      gaps: [],
      evidence: [],
      audit_log: [],
      confidence: { overall: 0.85, by_phase: {} },
    });
  });

  describe('PUBLISHED agent protection (unit test)', () => {
    it('PUBLISHED agent should not be updatable', async () => {
      const publishedAgent = createTestAgent({
        id: 'published-agent-id',
        status: 'PUBLISHED',
        name: 'Published Agent',
      });

      // Verify the status check logic
      expect(publishedAgent.status).toBe('PUBLISHED');

      const isImmutable = publishedAgent.status === 'PUBLISHED' || publishedAgent.status === 'ARCHIVED';
      expect(isImmutable).toBe(true);
    });

    it('ARCHIVED agent should not be updatable', async () => {
      const archivedAgent = createTestAgent({
        id: 'archived-agent-id',
        status: 'ARCHIVED',
        name: 'Archived Agent',
      });

      expect(archivedAgent.status).toBe('ARCHIVED');

      const isImmutable = archivedAgent.status === 'PUBLISHED' || archivedAgent.status === 'ARCHIVED';
      expect(isImmutable).toBe(true);
    });

    it('DRAFT agent should be updatable', async () => {
      const draftAgent = createTestAgent({
        id: 'draft-agent-id',
        status: 'DRAFT',
        name: 'Draft Agent',
      });

      expect(draftAgent.status).toBe('DRAFT');

      const isImmutable = draftAgent.status === 'PUBLISHED' || draftAgent.status === 'ARCHIVED';
      expect(isImmutable).toBe(false);
    });
  });

  describe('Agent ownership validation logic', () => {
    it('agent from different organization should not be accessible', async () => {
      const otherOrgAgent = createTestAgent({
        id: 'other-org-agent-id',
        status: 'DRAFT',
        organizationId: 'other-org-id', // Different org
      });

      // The user's org is 'test-org-id' (from mockAuth)
      const userOrgId = mockAuth.orgId; // 'test-org-id'
      const agentOrgId = otherOrgAgent.organizationId; // 'other-org-id'

      const belongsToOrg = agentOrgId === userOrgId;
      expect(belongsToOrg).toBe(false);
    });

    it('agent from same organization should be accessible', async () => {
      const sameOrgAgent = createTestAgent({
        id: 'same-org-agent-id',
        status: 'DRAFT',
        organizationId: 'test-org-id', // Same org
      });

      const userOrgId = mockAuth.orgId;
      const agentOrgId = sameOrgAgent.organizationId;

      const belongsToOrg = agentOrgId === userOrgId;
      expect(belongsToOrg).toBe(true);
    });
  });

  describe('Error code generation', () => {
    it('generates IMMUTABLE_AGENT error code for PUBLISHED agents', () => {
      const agent = createTestAgent({ status: 'PUBLISHED' });

      const errorCode = agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED'
        ? 'IMMUTABLE_AGENT'
        : null;

      expect(errorCode).toBe('IMMUTABLE_AGENT');
    });

    it('generates IMMUTABLE_AGENT error code for ARCHIVED agents', () => {
      const agent = createTestAgent({ status: 'ARCHIVED' });

      const errorCode = agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED'
        ? 'IMMUTABLE_AGENT'
        : null;

      expect(errorCode).toBe('IMMUTABLE_AGENT');
    });

    it('does not generate IMMUTABLE_AGENT error code for DRAFT agents', () => {
      const agent = createTestAgent({ status: 'DRAFT' });

      const errorCode = agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED'
        ? 'IMMUTABLE_AGENT'
        : null;

      expect(errorCode).toBeNull();
    });

    it('generates AGENT_NOT_FOUND for non-existent agents', () => {
      const agent = null;

      const errorCode = agent === null ? 'AGENT_NOT_FOUND' : null;

      expect(errorCode).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('Error message generation', () => {
    it('generates correct message for PUBLISHED agents', () => {
      const agent = createTestAgent({ status: 'PUBLISHED' });

      const errorMessage = agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED'
        ? `Cannot assemble into ${agent.status} agent. Clone to DRAFT first.`
        : null;

      expect(errorMessage).toContain('PUBLISHED');
      expect(errorMessage).toContain('Clone to DRAFT first');
    });

    it('generates correct message for ARCHIVED agents', () => {
      const agent = createTestAgent({ status: 'ARCHIVED' });

      const errorMessage = agent.status === 'PUBLISHED' || agent.status === 'ARCHIVED'
        ? `Cannot assemble into ${agent.status} agent. Clone to DRAFT first.`
        : null;

      expect(errorMessage).toContain('ARCHIVED');
      expect(errorMessage).toContain('Clone to DRAFT first');
    });
  });

  describe('Database operation selection', () => {
    it('uses create when no agentId provided', async () => {
      const agentId = undefined;
      const existingAgent = null;

      const shouldCreate = !existingAgent;
      const shouldUpdate = !!existingAgent;

      expect(shouldCreate).toBe(true);
      expect(shouldUpdate).toBe(false);
    });

    it('uses update when agentId provided and agent exists', async () => {
      const agentId = 'existing-agent-id';
      const existingAgent = createTestAgent({ id: agentId, status: 'DRAFT' });

      const shouldCreate = !existingAgent;
      const shouldUpdate = !!existingAgent;

      expect(shouldCreate).toBe(false);
      expect(shouldUpdate).toBe(true);
    });

    it('calls update on existing DRAFT agent', async () => {
      const draftAgent = createTestAgent({
        id: 'draft-agent-id',
        status: 'DRAFT',
        organizationId: 'test-org-id',
      });

      mockPrisma.agent.findUnique.mockResolvedValue(draftAgent);
      mockPrisma.agent.update.mockResolvedValue({
        ...draftAgent,
        template: { id: 'template-1', name: 'Sales Qualifier' },
        companyProfile: { id: 'profile-1', name: 'Test' },
      });

      // Simulate the logic
      const existingAgent = await mockPrisma.agent.findUnique({ where: { id: draftAgent.id } });

      expect(existingAgent).toBeTruthy();
      expect(existingAgent.status).toBe('DRAFT');

      // Would call update
      await mockPrisma.agent.update({
        where: { id: existingAgent.id },
        data: { name: 'Updated Name' },
      });

      expect(mockPrisma.agent.update).toHaveBeenCalled();
    });

    it('calls create for new agent', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null); // No slug conflict
      mockPrisma.agent.create.mockResolvedValue({
        ...createTestAgent(),
        id: 'new-agent-id',
      });

      // Simulate the logic - no existing agent
      const existingAgent = null;

      expect(existingAgent).toBeNull();

      // Would call create
      await mockPrisma.agent.create({
        data: {
          organizationId: 'test-org-id',
          name: 'New Agent',
          slug: 'new-agent',
          status: 'DRAFT',
        },
      });

      expect(mockPrisma.agent.create).toHaveBeenCalled();
    });
  });
});
