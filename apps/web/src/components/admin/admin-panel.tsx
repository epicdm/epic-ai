"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Spinner,
  Chip,
  Divider,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Settings,
  Server,
  Phone,
  Key,
  Activity,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Users,
  Building2,
  PhoneCall,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  isEncrypted: boolean;
  isActive: boolean;
  hasValue: boolean;
}

interface Stats {
  livekit: {
    connected: boolean;
    activeRooms: number;
    totalParticipants: number;
    rooms: Array<{ name: string; numParticipants: number }>;
    error?: string;
  };
  magnus: {
    connected: boolean;
    totalDIDs: number;
    activeTrunks: { inbound: number; outbound: number };
    recentCalls: number;
    error?: string;
  };
  voice: {
    totalAgents: number;
    activeAgents: number;
    totalCalls: number;
    callsToday: number;
    callsThisWeek: number;
    totalMinutes: number;
    avgCallDuration: number;
  };
  platform: {
    totalOrganizations: number;
    totalUsers: number;
    totalBrands: number;
    totalLeads: number;
  };
}

export function AdminPanel() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [initializingDefaults, setInitializingDefaults] = useState(false);

  // Fetch configs and stats
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [configsRes, statsRes] = await Promise.all([
        fetch("/api/admin/config"),
        fetch("/api/admin/stats"),
      ]);

      if (configsRes.ok) {
        const data = await configsRes.json();
        setConfigs(data.configs || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("[Admin] Error fetching data:", err);
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("[Admin] Error refreshing stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function initializeDefaults() {
    setInitializingDefaults(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initialize_defaults" }),
      });

      if (res.ok) {
        setSuccessMessage("Default configurations initialized");
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to initialize defaults");
      }
    } catch (err) {
      setError("Failed to initialize defaults");
    } finally {
      setInitializingDefaults(false);
      onClose();
    }
  }

  async function saveConfig(key: string) {
    const value = editValues[key];
    if (value === undefined) return;

    setSaving(key);
    try {
      const res = await fetch(`/api/admin/config/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (res.ok) {
        setSuccessMessage(`Configuration '${key}' updated`);
        // Clear edit value and refresh
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save configuration");
    } finally {
      setSaving(null);
    }
  }

  async function toggleRevealValue(key: string) {
    // If already showing, just hide it
    if (showValues[key]) {
      setShowValues((prev) => ({ ...prev, [key]: false }));
      return;
    }

    // If we already fetched the revealed value, just show it
    if (revealedValues[key]) {
      setShowValues((prev) => ({ ...prev, [key]: true }));
      return;
    }

    // Fetch the actual value from API
    setRevealingKey(key);
    try {
      const res = await fetch(`/api/admin/config/${key}?reveal=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.config?.value) {
          setRevealedValues((prev) => ({ ...prev, [key]: data.config.value }));
          setShowValues((prev) => ({ ...prev, [key]: true }));
        }
      } else {
        setError("Failed to reveal value");
      }
    } catch (err) {
      console.error("[Admin] Error revealing value:", err);
      setError("Failed to reveal value");
    } finally {
      setRevealingKey(null);
    }
  }

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const configsByCategory = configs.reduce(
    (acc, config) => {
      if (!acc[config.category]) acc[config.category] = [];
      acc[config.category].push(config);
      return acc;
    },
    {} as Record<string, SystemConfig[]>
  );

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    livekit: { label: "LiveKit", icon: <Server className="w-4 h-4" /> },
    magnus: { label: "MagnusBilling / Asterisk", icon: <Phone className="w-4 h-4" /> },
    sip: { label: "SIP Settings", icon: <PhoneCall className="w-4 h-4" /> },
    api_keys: { label: "API Keys", icon: <Key className="w-4 h-4" /> },
    general: { label: "General", icon: <Settings className="w-4 h-4" /> },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        description="Platform-wide settings and statistics"
      />

      {/* Alert Messages */}
      {(successMessage || error) && (
        <Card className={error ? "bg-danger-50" : "bg-success-50"}>
          <CardBody className="flex flex-row items-center gap-2 py-2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-danger" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className={error ? "text-danger" : "text-success"}>
              {error || successMessage}
            </span>
          </CardBody>
        </Card>
      )}

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        aria-label="Admin sections"
      >
        <Tab key="overview" title="Overview">
          <div className="mt-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={refreshStats}
                isLoading={statsLoading}
              >
                Refresh Stats
              </Button>
              {configs.length === 0 && (
                <Button
                  size="sm"
                  color="primary"
                  startContent={<Settings className="w-4 h-4" />}
                  onPress={onOpen}
                >
                  Initialize Defaults
                </Button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Platform Stats */}
              <Card>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Organizations</p>
                      <p className="text-2xl font-bold">
                        {stats?.platform?.totalOrganizations || 0}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Users</p>
                      <p className="text-2xl font-bold">
                        {stats?.platform?.totalUsers || 0}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <PhoneCall className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Total Calls</p>
                      <p className="text-2xl font-bold">
                        {stats?.voice?.totalCalls || 0}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-default-500">Total Minutes</p>
                      <p className="text-2xl font-bold">
                        {stats?.voice?.totalMinutes || 0}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Service Status */}
            <Card>
              <CardHeader className="flex gap-3">
                <Activity className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Service Status</p>
                  <p className="text-small text-default-500">
                    Connection status for external services
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* LiveKit Status */}
                  <div className="flex items-center justify-between p-3 bg-default-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span>LiveKit</span>
                    </div>
                    <Chip
                      size="sm"
                      color={stats?.livekit?.connected ? "success" : "danger"}
                      variant="flat"
                    >
                      {stats?.livekit?.connected ? "Connected" : "Disconnected"}
                    </Chip>
                  </div>

                  {/* Magnus Status */}
                  <div className="flex items-center justify-between p-3 bg-default-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Voice Service</span>
                    </div>
                    <Chip
                      size="sm"
                      color={stats?.magnus?.connected ? "success" : "danger"}
                      variant="flat"
                    >
                      {stats?.magnus?.connected ? "Connected" : "Disconnected"}
                    </Chip>
                  </div>

                  {/* Database Status */}
                  <div className="flex items-center justify-between p-3 bg-default-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>Database</span>
                    </div>
                    <Chip size="sm" color="success" variant="flat">
                      Connected
                    </Chip>
                  </div>
                </div>

                {/* LiveKit Details */}
                {stats?.livekit?.connected && (
                  <div className="mt-4 p-3 bg-default-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">LiveKit Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        Active Rooms: <strong>{stats.livekit.activeRooms}</strong>
                      </div>
                      <div>
                        Participants: <strong>{stats.livekit.totalParticipants}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Magnus Details */}
                {stats?.magnus?.connected && (
                  <div className="mt-4 p-3 bg-default-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Telephony Details</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        DIDs: <strong>{stats.magnus.totalDIDs}</strong>
                      </div>
                      <div>
                        Inbound Trunks: <strong>{stats.magnus.activeTrunks.inbound}</strong>
                      </div>
                      <div>
                        Outbound Trunks: <strong>{stats.magnus.activeTrunks.outbound}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Voice Stats */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneCall className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Voice Statistics</p>
                  <p className="text-small text-default-500">
                    Voice agent and call statistics
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500">Active Agents</p>
                    <p className="text-xl font-bold">
                      {stats?.voice?.activeAgents || 0} / {stats?.voice?.totalAgents || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500">Calls Today</p>
                    <p className="text-xl font-bold">{stats?.voice?.callsToday || 0}</p>
                  </div>
                  <div className="p-3 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500">Calls This Week</p>
                    <p className="text-xl font-bold">{stats?.voice?.callsThisWeek || 0}</p>
                  </div>
                  <div className="p-3 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500">Avg Duration</p>
                    <p className="text-xl font-bold">{stats?.voice?.avgCallDuration || 0}s</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="settings" title="Settings">
          <div className="mt-4 space-y-6">
            {/* Initialize Button */}
            {configs.length === 0 && (
              <Card>
                <CardBody className="text-center py-8">
                  <Settings className="w-12 h-12 mx-auto text-default-400 mb-4" />
                  <p className="text-lg font-medium mb-2">No configurations found</p>
                  <p className="text-default-500 mb-4">
                    Initialize default configurations to get started
                  </p>
                  <Button color="primary" onPress={onOpen}>
                    Initialize Defaults
                  </Button>
                </CardBody>
              </Card>
            )}

            {/* Config Categories */}
            {Object.entries(configsByCategory).map(([category, categoryConfigs]) => (
              <Card key={category}>
                <CardHeader className="flex gap-3">
                  {categoryLabels[category]?.icon || <Settings className="w-5 h-5" />}
                  <div className="flex flex-col">
                    <p className="text-md font-semibold">
                      {categoryLabels[category]?.label || category}
                    </p>
                    <p className="text-small text-default-500">
                      {categoryConfigs.length} setting(s)
                    </p>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div className="space-y-4">
                    {categoryConfigs.map((config) => (
                      <div key={config.key} className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-sm font-medium">{config.key}</label>
                          {config.description && (
                            <p className="text-xs text-default-500 mb-1">
                              {config.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              type={
                                config.isEncrypted && !showValues[config.key]
                                  ? "password"
                                  : "text"
                              }
                              value={
                                editValues[config.key] !== undefined
                                  ? editValues[config.key]
                                  : showValues[config.key] && revealedValues[config.key]
                                    ? revealedValues[config.key]
                                    : config.hasValue
                                      ? config.value
                                      : ""
                              }
                              placeholder={config.hasValue ? "••••••••" : "Not set"}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [config.key]: e.target.value,
                                }))
                              }
                              classNames={{ input: "font-mono text-sm" }}
                            />
                            {config.isEncrypted && (
                              <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isLoading={revealingKey === config.key}
                                onPress={() => toggleRevealValue(config.key)}
                              >
                                {showValues[config.key] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          color="primary"
                          isDisabled={editValues[config.key] === undefined}
                          isLoading={saving === config.key}
                          startContent={<Save className="w-4 h-4" />}
                          onPress={() => saveConfig(config.key)}
                        >
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Tab>
      </Tabs>

      {/* Initialize Defaults Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Initialize Default Configurations</ModalHeader>
          <ModalBody>
            <p>
              This will create default configuration entries for all platform settings.
              Existing configurations will not be overwritten.
            </p>
            <p className="text-sm text-default-500 mt-2">
              Settings will be populated with values from environment variables where
              available.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={initializingDefaults}
              onPress={initializeDefaults}
            >
              Initialize
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
