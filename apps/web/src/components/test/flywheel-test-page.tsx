"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
  Progress,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  CheckCircle,
  XCircle,
  Circle,
  Play,
  RefreshCw,
  Share2,
  Phone,
  Users,
  Zap,
} from "lucide-react";

interface TestStep {
  id: string;
  name: string;
  description: string;
  module: "social" | "voice" | "leads" | "automations";
  status: "pending" | "running" | "passed" | "failed";
  error?: string;
}

const INITIAL_TESTS: TestStep[] = [
  // Leads Module
  {
    id: "leads-create",
    name: "Create Lead",
    description: "Create a new lead via API",
    module: "leads",
    status: "pending",
  },
  {
    id: "leads-list",
    name: "List Leads",
    description: "Fetch leads with search and filters",
    module: "leads",
    status: "pending",
  },
  {
    id: "leads-update",
    name: "Update Lead Status",
    description: "Change lead status from NEW to CONTACTED",
    module: "leads",
    status: "pending",
  },
  {
    id: "leads-activity",
    name: "Add Activity",
    description: "Add a note activity to the lead",
    module: "leads",
    status: "pending",
  },
  {
    id: "leads-stats",
    name: "Get Stats",
    description: "Fetch lead statistics",
    module: "leads",
    status: "pending",
  },

  // Voice Module
  {
    id: "voice-agents",
    name: "List Agents",
    description: "Fetch voice agents",
    module: "voice",
    status: "pending",
  },
  {
    id: "voice-tts",
    name: "Text-to-Speech",
    description: "Generate audio from text",
    module: "voice",
    status: "pending",
  },

  // Automations Module
  {
    id: "auto-list",
    name: "List Automations",
    description: "Fetch all automations",
    module: "automations",
    status: "pending",
  },
  {
    id: "auto-templates",
    name: "List Templates",
    description: "Fetch automation templates",
    module: "automations",
    status: "pending",
  },

  // Social Module
  {
    id: "social-status",
    name: "Postiz Status",
    description: "Check Postiz connection status",
    module: "social",
    status: "pending",
  },
];

const MODULE_ICONS = {
  social: Share2,
  voice: Phone,
  leads: Users,
  automations: Zap,
};

const MODULE_COLORS: Record<string, "primary" | "secondary" | "success" | "warning"> = {
  social: "primary",
  voice: "secondary",
  leads: "success",
  automations: "warning",
};

export function FlywheelTestPage() {
  const [tests, setTests] = useState<TestStep[]>(INITIAL_TESTS);
  const [isRunning, setIsRunning] = useState(false);
  const [testLeadId, setTestLeadId] = useState<string | null>(null);
  const testLeadIdRef = useRef<string | null>(null);

  const passedCount = tests.filter((t) => t.status === "passed").length;
  const failedCount = tests.filter((t) => t.status === "failed").length;
  const progress = ((passedCount + failedCount) / tests.length) * 100;

  function updateTest(id: string, updates: Partial<TestStep>) {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }

  async function runTest(test: TestStep): Promise<boolean> {
    updateTest(test.id, { status: "running" });

    try {
      switch (test.id) {
        case "leads-create": {
          const res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: "Test",
              lastName: "Flywheel",
              email: `test-${Date.now()}@flywheel.test`,
              source: "MANUAL",
              sourceDetails: "Flywheel Test",
            }),
          });
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const lead = await res.json();
          testLeadIdRef.current = lead.id;
          setTestLeadId(lead.id);
          return true;
        }

        case "leads-list": {
          const res = await fetch("/api/leads");
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "leads-update": {
          const leadId = testLeadIdRef.current;
          if (!leadId) throw new Error("No test lead created");
          const res = await fetch(`/api/leads/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONTACTED" }),
          });
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "leads-activity": {
          const leadId = testLeadIdRef.current;
          if (!leadId) throw new Error("No test lead created");
          const res = await fetch(`/api/leads/${leadId}/activities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "NOTE",
              title: "Flywheel Test Note",
              description: "Created by integration test",
            }),
          });
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "leads-stats": {
          const res = await fetch("/api/leads/stats");
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "voice-agents": {
          const res = await fetch("/api/voice/agents");
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "voice-tts": {
          const res = await fetch("/api/voice/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "This is a flywheel test",
              voice: "nova",
              returnBase64: true,
            }),
          });
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "auto-list": {
          const res = await fetch("/api/automations");
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "auto-templates": {
          const res = await fetch("/api/automations/templates");
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return true;
        }

        case "social-status": {
          const res = await fetch("/api/social/status");
          // Postiz might not be configured, which is ok
          return res.ok || res.status === 503;
        }

        default:
          throw new Error("Unknown test");
      }
    } catch (error) {
      updateTest(test.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async function runAllTests() {
    setIsRunning(true);
    setTests(INITIAL_TESTS); // Reset
    setTestLeadId(null);
    testLeadIdRef.current = null;

    for (const test of INITIAL_TESTS) {
      const passed = await runTest(test);
      updateTest(test.id, { status: passed ? "passed" : "failed" });
      await new Promise((r) => setTimeout(r, 300)); // Brief pause between tests
    }

    setIsRunning(false);
  }

  function resetTests() {
    setTests(INITIAL_TESTS);
    setTestLeadId(null);
    testLeadIdRef.current = null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Flywheel Integration Tests"
        description="Test all modules and their integrations"
        actions={
          <div className="flex gap-2">
            <Button
              variant="bordered"
              startContent={<RefreshCw className="w-4 h-4" />}
              onPress={resetTests}
              isDisabled={isRunning}
            >
              Reset
            </Button>
            <Button
              color="primary"
              startContent={<Play className="w-4 h-4" />}
              onPress={runAllTests}
              isLoading={isRunning}
            >
              Run All Tests
            </Button>
          </div>
        }
      />

      {/* Progress */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Test Progress</span>
            <span className="text-sm font-medium">
              {passedCount + failedCount} / {tests.length}
            </span>
          </div>
          <Progress value={progress} color="primary" className="mb-4" />
          <div className="flex gap-4">
            <Chip color="success" variant="flat">
              {passedCount} Passed
            </Chip>
            <Chip color="danger" variant="flat">
              {failedCount} Failed
            </Chip>
            <Chip color="default" variant="flat">
              {tests.length - passedCount - failedCount} Pending
            </Chip>
          </div>
        </CardBody>
      </Card>

      {/* Tests by Module */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(["leads", "voice", "automations", "social"] as const).map((module) => {
          const moduleTests = tests.filter((t) => t.module === module);
          const Icon = MODULE_ICONS[module];
          const color = MODULE_COLORS[module];

          return (
            <Card key={module}>
              <CardHeader className="flex gap-3">
                <div
                  className={`w-10 h-10 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <h3 className="font-semibold capitalize">{module} Module</h3>
                  <p className="text-sm text-gray-500">
                    {moduleTests.filter((t) => t.status === "passed").length} /{" "}
                    {moduleTests.length} passed
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-3">
                {moduleTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {test.status === "passed" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {test.status === "failed" && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {test.status === "pending" && (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      {test.status === "running" && (
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{test.name}</p>
                        <p className="text-xs text-gray-500">
                          {test.error || test.description}
                        </p>
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        test.status === "passed"
                          ? "success"
                          : test.status === "failed"
                          ? "danger"
                          : test.status === "running"
                          ? "primary"
                          : "default"
                      }
                    >
                      {test.status}
                    </Chip>
                  </div>
                ))}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <Card>
        <CardBody className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Flywheel Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <Share2 className="w-8 h-8 mx-auto mb-2 text-primary-600" />
              <p className="font-medium">Social</p>
              <p className="text-xs text-gray-500">Generate content & leads</p>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg">
              <Phone className="w-8 h-8 mx-auto mb-2 text-secondary-600" />
              <p className="font-medium">Voice AI</p>
              <p className="text-xs text-gray-500">Qualify & engage leads</p>
            </div>
            <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-success-600" />
              <p className="font-medium">Leads CRM</p>
              <p className="text-xs text-gray-500">Track & convert</p>
            </div>
            <div className="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <Zap className="w-8 h-8 mx-auto mb-2 text-warning-600" />
              <p className="font-medium">Automations</p>
              <p className="text-xs text-gray-500">Connect everything</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
