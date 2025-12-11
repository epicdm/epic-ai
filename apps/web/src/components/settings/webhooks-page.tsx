"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Tabs,
  Tab,
  Code,
  Tooltip,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Webhook,
  Copy,
  Check,
  Play,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Platform icons as simple components
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

interface WebhookConfig {
  id: string;
  platform: string;
  verifyToken: string;
  secretKey: string;
  enabled: boolean;
  autoTriggerVoiceAI: boolean;
  leadsReceived: number;
  lastReceivedAt: string | null;
  lastError: string | null;
  webhookUrl: string;
}

interface WebhookLog {
  id: string;
  platform: string;
  status: string;
  leadId: string | null;
  error: string | null;
  receivedAt: string;
}

const PLATFORMS = [
  { value: "META", label: "Meta (Facebook/Instagram)", Icon: FacebookIcon, color: "bg-blue-500" },
  { value: "GOOGLE", label: "Google Ads", Icon: GoogleIcon, color: "bg-red-500" },
  { value: "LINKEDIN", label: "LinkedIn", Icon: LinkedinIcon, color: "bg-blue-700" },
  { value: "GENERIC", label: "Generic/Zapier", Icon: ZapIcon, color: "bg-orange-500" },
];

const STATUS_ICONS: Record<string, any> = {
  SUCCESS: CheckCircle,
  FAILED: XCircle,
  DUPLICATE: AlertCircle,
  PROCESSING: Clock,
};

const STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "default"> = {
  SUCCESS: "success",
  FAILED: "danger",
  DUPLICATE: "warning",
  PROCESSING: "default",
};

export function WebhooksPage() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logCounts, setLogCounts] = useState({ total: 0, success: 0, failed: 0, duplicate: 0 });
  const [activeTab, setActiveTab] = useState("config");

  // Setup modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Test modal
  const {
    isOpen: isTestOpen,
    onOpen: onTestOpen,
    onClose: onTestClose,
  } = useDisclosure();
  const [testPlatform, setTestPlatform] = useState<string | null>(null);
  const [testData, setTestData] = useState({ email: "", name: "", phone: "", company: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Copied state
  const [copied, setCopied] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [configsRes, logsRes] = await Promise.all([
          fetch("/api/webhooks/config"),
          fetch("/api/webhooks/logs?limit=20"),
        ]);

        if (configsRes.ok) {
          const data = await configsRes.json();
          setConfigs(data.configs || []);
        }

        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs || []);
          setLogCounts(data.counts || { total: 0, success: 0, failed: 0, duplicate: 0 });
        }
      } catch (error) {
        console.error("Error loading webhooks:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Copy to clipboard
  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  // Create/update webhook config
  async function saveConfig(platform: string, enabled: boolean, autoTriggerVoiceAI: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/webhooks/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, enabled, autoTriggerVoiceAI }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfigs((prev) => {
          const existing = prev.findIndex((c) => c.platform === platform);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.config;
            return updated;
          }
          return [...prev, data.config];
        });
        onClose();
      }
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setSaving(false);
    }
  }

  // Toggle webhook
  async function toggleWebhook(platform: string, enabled: boolean) {
    try {
      await fetch(`/api/webhooks/config/${platform.toLowerCase()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      setConfigs((prev) =>
        prev.map((c) => (c.platform === platform ? { ...c, enabled } : c))
      );
    } catch (error) {
      console.error("Error toggling webhook:", error);
    }
  }

  // Test webhook
  async function runTest() {
    if (!testPlatform) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: testPlatform, testData }),
      });

      const data = await res.json();
      setTestResult(data);

      // Refresh logs
      const logsRes = await fetch("/api/webhooks/logs?limit=20");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error("Test error:", error);
      setTestResult({ success: false, error: "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Receive leads automatically from ad platforms."
      />

      <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)}>
        <Tab key="config" title="Configuration" />
        <Tab key="logs" title={`Logs (${logCounts.total})`} />
      </Tabs>

      {activeTab === "config" && (
        <>
          {/* Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const config = configs.find((c) => c.platform === platform.value);
              const Icon = platform.Icon;

              return (
                <Card key={platform.value}>
                  <CardBody className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{platform.label}</p>
                          {config && (
                            <p className="text-xs text-default-500">
                              {config.leadsReceived} leads received
                            </p>
                          )}
                        </div>
                      </div>
                      {config ? (
                        <Switch
                          isSelected={config.enabled}
                          onValueChange={(v) => toggleWebhook(platform.value, v)}
                        />
                      ) : (
                        <Button
                          size="sm"
                          color="primary"
                          onClick={() => {
                            setSelectedPlatform(platform.value);
                            onOpen();
                          }}
                        >
                          Setup
                        </Button>
                      )}
                    </div>

                    {config && (
                      <>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-default-500 mb-1">Webhook URL</p>
                            <div className="flex gap-2">
                              <Code className="flex-1 text-xs break-all">
                                {config.webhookUrl}
                              </Code>
                              <Tooltip content={copied === `url-${config.id}` ? "Copied!" : "Copy"}>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onClick={() => copyToClipboard(config.webhookUrl, `url-${config.id}`)}
                                >
                                  {copied === `url-${config.id}` ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </Tooltip>
                            </div>
                          </div>

                          {platform.value === "META" && (
                            <div>
                              <p className="text-xs text-default-500 mb-1">Verify Token</p>
                              <div className="flex gap-2">
                                <Code className="flex-1 text-xs">{config.verifyToken}</Code>
                                <Tooltip content={copied === `verify-${config.id}` ? "Copied!" : "Copy"}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onClick={() => copyToClipboard(config.verifyToken, `verify-${config.id}`)}
                                  >
                                    {copied === `verify-${config.id}` ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-default-100">
                          <div className="flex items-center gap-2">
                            <Switch
                              size="sm"
                              isSelected={config.autoTriggerVoiceAI}
                              onValueChange={async (v) => {
                                await fetch(`/api/webhooks/config/${platform.value.toLowerCase()}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ autoTriggerVoiceAI: v }),
                                });
                                setConfigs((prev) =>
                                  prev.map((c) =>
                                    c.platform === platform.value
                                      ? { ...c, autoTriggerVoiceAI: v }
                                      : c
                                  )
                                );
                              }}
                            />
                            <span className="text-sm">Auto-trigger Voice AI</span>
                          </div>
                          <Button
                            size="sm"
                            variant="bordered"
                            startContent={<Play className="w-3 h-3" />}
                            onClick={() => {
                              setTestPlatform(platform.value);
                              setTestResult(null);
                              onTestOpen();
                            }}
                          >
                            Test
                          </Button>
                        </div>

                        {config.lastError && (
                          <div className="p-2 bg-danger/10 rounded-lg">
                            <p className="text-xs text-danger">{config.lastError}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Setup Instructions</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Meta (Facebook/Instagram)</h3>
                <ol className="list-decimal list-inside text-sm text-default-600 space-y-1">
                  <li>Go to Meta Business Settings → Integrations → Leads Access</li>
                  <li>Click &quot;Assign CRMs&quot; and choose &quot;Connect a new CRM&quot;</li>
                  <li>Select &quot;Other CRM&quot; and paste your webhook URL</li>
                  <li>Enter the Verify Token shown above</li>
                  <li>Subscribe to your Lead Ad forms</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium mb-2">Google Ads</h3>
                <ol className="list-decimal list-inside text-sm text-default-600 space-y-1">
                  <li>Go to Google Ads → Tools → Data Manager → Linked Accounts</li>
                  <li>Click &quot;Link&quot; next to &quot;Webhook integration&quot;</li>
                  <li>Paste your webhook URL</li>
                  <li>Select the lead forms to connect</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium mb-2">LinkedIn</h3>
                <ol className="list-decimal list-inside text-sm text-default-600 space-y-1">
                  <li>Go to LinkedIn Campaign Manager → Account Assets → Lead Gen Forms</li>
                  <li>Click on your form → Integration Settings</li>
                  <li>Add a webhook endpoint with your URL</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium mb-2">Generic (Zapier, etc.)</h3>
                <ol className="list-decimal list-inside text-sm text-default-600 space-y-1">
                  <li>Use the Generic webhook URL in any service that sends leads</li>
                  <li>Send JSON with: email, first_name, last_name, phone, company</li>
                  <li>Optionally sign requests with x-webhook-signature header</li>
                </ol>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Webhook Activity</h2>
            <div className="flex gap-2">
              <Chip size="sm" color="success" variant="flat">
                {logCounts.success} Success
              </Chip>
              <Chip size="sm" color="danger" variant="flat">
                {logCounts.failed} Failed
              </Chip>
              <Chip size="sm" color="warning" variant="flat">
                {logCounts.duplicate} Duplicate
              </Chip>
            </div>
          </CardHeader>
          <CardBody>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Webhook className="w-12 h-12 text-default-300 mx-auto mb-4" />
                <p className="text-default-500">No webhook activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.status] || Clock;
                  const platform = PLATFORMS.find((p) => p.value === log.platform);
                  const PlatformIcon = platform?.Icon || Webhook;

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-default-50"
                    >
                      <div className={`w-8 h-8 ${platform?.color || "bg-default-300"} rounded flex items-center justify-center`}>
                        <PlatformIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Chip
                            size="sm"
                            color={STATUS_COLORS[log.status]}
                            variant="flat"
                            startContent={<StatusIcon className="w-3 h-3" />}
                          >
                            {log.status}
                          </Chip>
                          {log.leadId && (
                            <span className="text-xs text-default-500">
                              Lead: {log.leadId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        {log.error && (
                          <p className="text-xs text-danger mt-1">{log.error}</p>
                        )}
                      </div>
                      <span className="text-xs text-default-400">
                        {new Date(log.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Setup Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>
            Setup {PLATFORMS.find((p) => p.value === selectedPlatform)?.label} Webhook
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500">
              This will generate a unique webhook URL and verification token for receiving leads
              from {selectedPlatform?.toLowerCase()}.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={() => selectedPlatform && saveConfig(selectedPlatform, true, true)}
              isLoading={saving}
            >
              Generate Webhook
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Test Modal */}
      <Modal isOpen={isTestOpen} onClose={onTestClose} size="lg">
        <ModalContent>
          <ModalHeader>Test Webhook</ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm text-default-500">
              Send a test lead to verify your webhook is working correctly.
            </p>

            <Input
              label="Email"
              placeholder="test@example.com"
              value={testData.email}
              onChange={(e) => setTestData({ ...testData, email: e.target.value })}
            />
            <Input
              label="Name"
              placeholder="Test Lead"
              value={testData.name}
              onChange={(e) => setTestData({ ...testData, name: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="+1234567890"
              value={testData.phone}
              onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
            />
            <Input
              label="Company"
              placeholder="Test Company"
              value={testData.company}
              onChange={(e) => setTestData({ ...testData, company: e.target.value })}
            />

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? "bg-success/10" : "bg-danger/10"}`}>
                {testResult.success ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-5 h-5" />
                    <span>Test successful! Lead ID: {testResult.leadId}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-danger">
                    <XCircle className="w-5 h-5" />
                    <span>Test failed: {testResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onClick={onTestClose}>
              Close
            </Button>
            <Button
              color="primary"
              onClick={runTest}
              isLoading={testing}
              startContent={<Play className="w-4 h-4" />}
            >
              Send Test
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
