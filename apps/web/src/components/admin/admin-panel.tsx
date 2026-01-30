"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Radio,
} from "lucide-react";
import { LiveKitPanel } from "./livekit/livekit-panel";

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
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          <CardContent className="flex flex-row items-center gap-2 py-2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-danger" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className={error ? "text-danger" : "text-success"}>
              {error || successMessage}
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="livekit">LiveKit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="mt-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                
                onClick={refreshStats}
                disabled={statsLoading}
              ><RefreshCw className="w-4 h-4" /> 
                Refresh Stats
              </Button>
              {configs.length === 0 && (
                <Button
                  size="sm"
                  
                  onClick={() => setIsOpen(true)}
                ><Settings className="w-4 h-4" /> 
                  Initialize Defaults
                </Button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Platform Stats */}
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Organizations</p>
                      <p className="text-2xl font-bold">
                        {stats?.platform?.totalOrganizations || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Users</p>
                      <p className="text-2xl font-bold">
                        {stats?.platform?.totalUsers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <PhoneCall className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Calls</p>
                      <p className="text-2xl font-bold">
                        {stats?.voice?.totalCalls || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Minutes</p>
                      <p className="text-2xl font-bold">
                        {stats?.voice?.totalMinutes || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Status */}
            <Card>
              <CardHeader className="flex gap-3">
                <Activity className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Service Status</p>
                  <p className="text-sm text-muted-foreground">
                    Connection status for external services
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* LiveKit Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span>LiveKit</span>
                    </div>
                    <Badge
                      
                      color={stats?.livekit?.connected ? "success" : "danger"}
                      variant="secondary"
                    >
                      {stats?.livekit?.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>

                  {/* Magnus Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Voice Service</span>
                    </div>
                    <Badge
                      
                      color={stats?.magnus?.connected ? "success" : "danger"}
                      variant="secondary"
                    >
                      {stats?.magnus?.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>

                  {/* Database Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>Database</span>
                    </div>
                    <Badge variant="secondary">
                      Connected
                    </Badge>
                  </div>
                </div>

                {/* LiveKit Details */}
                {stats?.livekit?.connected && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
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
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
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
              </CardContent>
            </Card>

            {/* Voice Stats */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneCall className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Voice Statistics</p>
                  <p className="text-sm text-muted-foreground">
                    Voice agent and call statistics
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Active Agents</p>
                    <p className="text-xl font-bold">
                      {stats?.voice?.activeAgents || 0} / {stats?.voice?.totalAgents || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Calls Today</p>
                    <p className="text-xl font-bold">{stats?.voice?.callsToday || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Calls This Week</p>
                    <p className="text-xl font-bold">{stats?.voice?.callsThisWeek || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                    <p className="text-xl font-bold">{stats?.voice?.avgCallDuration || 0}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="mt-4 space-y-6">
            {/* Initialize Button */}
            {configs.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No configurations found</p>
                  <p className="text-muted-foreground mb-4">
                    Initialize default configurations to get started
                  </p>
                  <Button onClick={() => setIsOpen(true)}>
                    Initialize Defaults
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Config Categories */}
            {Object.entries(configsByCategory).map(([category, categoryConfigs]) => (
              <Card key={category}>
                <CardHeader className="flex gap-3">
                  {categoryLabels[category]?.icon || <Settings className="w-5 h-5" />}
                  <div className="flex flex-col">
                    <p className="text-base font-semibold">
                      {categoryLabels[category]?.label || category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {categoryConfigs.length} setting(s)
                    </p>
                  </div>
                </CardHeader>
                <div className="border-t my-4" />
                <CardContent>
                  <div className="space-y-4">
                    {categoryConfigs.map((config) => (
                      <div key={config.key} className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-sm font-medium">{config.key}</label>
                          {config.description && (
                            <p className="text-xs text-muted-foreground mb-1">
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
                                size="sm"
                                variant="secondary"
                                disabled={revealingKey === config.key}
                                onClick={() => toggleRevealValue(config.key)}
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
                          disabled={editValues[config.key] === undefined || saving === config.key}
                          onClick={() => saveConfig(config.key)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="livekit">
          <div className="mt-4">
            <LiveKitPanel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Initialize Defaults Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Initialize Default Configurations</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>
              This will create default configuration entries for all platform settings.
              Existing configurations will not be overwritten.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Settings will be populated with values from environment variables where
              available.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={initializingDefaults}
              onClick={initializeDefaults}
            >
              Initialize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
