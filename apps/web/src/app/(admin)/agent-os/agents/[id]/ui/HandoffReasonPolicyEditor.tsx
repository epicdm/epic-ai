"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Switch,
  Chip,
  Spinner,
} from "@heroui/react";
import { AlertCircle, Plus, Trash2, ChevronDown } from "lucide-react";

interface HandoffReasonRule {
  reason: string;
  target_id: string;
  when?: {
    channel?: ("VOICE" | "CHAT" | "SMS" | "EMAIL")[];
    tags_any?: string[];
    tags_all?: string[];
    min_severity?: "low" | "medium" | "high" | "critical";
  };
  priority: number;
  enabled: boolean;
}

interface HandoffPolicy {
  enabled: boolean;
  reason_rules: HandoffReasonRule[];
  fallback_target_id?: string;
}

interface HandoffTarget {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  tags: string[];
}

interface GovernanceConfig {
  handoff?: {
    enabled: boolean;
    handoff_targets: HandoffTarget[];
    default_handoff_target_id?: string;
    policy?: HandoffPolicy;
  };
}

const COMMON_REASONS = [
  "customer_requested_human",
  "high_risk_topic",
  "billing_issue",
  "technical_issue",
  "sales_escalation",
  "lead_qualified_needs_rep",
  "policy_block",
  "tool_failure",
];

const CHANNELS = ["VOICE", "CHAT", "SMS", "EMAIL"] as const;
const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;

interface HandoffReasonPolicyEditorProps {
  agentId: string;
}

export function HandoffReasonPolicyEditor({ agentId }: HandoffReasonPolicyEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<HandoffPolicy>({
    enabled: true,
    reason_rules: [],
    fallback_target_id: undefined,
  });
  const [targets, setTargets] = useState<HandoffTarget[]>([]);
  const [expandedRuleId, setExpandedRuleId] = useState<number | null>(null);

  // Load governance config
  const loadPolicy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agent-os/agents/${agentId}/governance`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load governance config");
      }

      const governance: GovernanceConfig = await response.json();
      const handoff = governance.handoff;

      if (handoff) {
        setTargets(handoff.handoff_targets || []);
        setPolicy(
          handoff.policy || {
            enabled: true,
            reason_rules: [],
            fallback_target_id: handoff.default_handoff_target_id,
          }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policy");
      console.error("Error loading policy:", err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Save policy
  const savePolicy = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/agent-os/agents/${agentId}/governance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoff: {
            ...{
              enabled: true,
              handoff_targets: targets,
              default_handoff_target_id: policy.fallback_target_id,
            },
            policy,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save policy");
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
      console.error("Error saving policy:", err);
    } finally {
      setSaving(false);
    }
  }, [agentId, policy, targets]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const addRule = () => {
    setPolicy({
      ...policy,
      reason_rules: [
        ...policy.reason_rules,
        {
          reason: "",
          target_id: "",
          priority: 50,
          enabled: true,
        },
      ],
    });
  };

  const removeRule = (index: number) => {
    setPolicy({
      ...policy,
      reason_rules: policy.reason_rules.filter((_, i) => i !== index),
    });
  };

  const updateRule = (index: number, updates: Partial<HandoffReasonRule>) => {
    const newRules = [...policy.reason_rules];
    newRules[index] = { ...newRules[index], ...updates };
    setPolicy({ ...policy, reason_rules: newRules });
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-8">
          <Spinner size="sm" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex gap-3 justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">Reason → Target Routing Policy</p>
          <p className="text-sm text-default-500">
            Define routing rules that automatically select handoff targets based on escalation reason
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Policy Enabled</span>
          <Switch
            checked={policy.enabled}
            onValueChange={(enabled) => setPolicy({ ...policy, enabled })}
          />
        </div>
      </CardHeader>

      <CardBody className="gap-6">
        {error && (
          <div className="rounded-lg bg-danger-50 border border-danger-200 p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-danger">{error}</p>
            </div>
          </div>
        )}

        {/* Fallback Target */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Policy Fallback Target</label>
          <Select
            selectedKeys={policy.fallback_target_id ? [policy.fallback_target_id] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              setPolicy({
                ...policy,
                fallback_target_id: key ? String(key) : undefined,
              });
            }}
            className="max-w-xs"
            label="Select fallback target..."
          >
            {targets.map((target) => (
              <SelectItem key={target.id} value={target.id}>
                {target.label}
                {target.description ? ` - ${target.description}` : ""}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Rules List Header */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm font-medium">Reason-Based Rules</p>
          <Button
            onClick={addRule}
            size="sm"
            color="primary"
            isDisabled={!policy.enabled}
            startContent={<Plus className="h-4 w-4" />}
          >
            Add Rule
          </Button>
        </div>

        {/* Rules List */}
        {policy.reason_rules.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-default-300 p-8 text-center">
            <p className="text-sm text-default-500">No rules configured. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {policy.reason_rules.map((rule, index) => (
              <Card key={index} className="bg-default-50">
                <CardBody className="gap-3 py-3">
                  {/* Header Row */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onValueChange={(enabled) =>
                        updateRule(index, { enabled })
                      }
                      size="sm"
                    />
                    <input
                      list={`reasons-${index}`}
                      type="text"
                      placeholder="Reason code (e.g., billing_issue)"
                      value={rule.reason}
                      onChange={(e) =>
                        updateRule(index, { reason: e.target.value })
                      }
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-default-300 bg-white"
                    />
                    <datalist id={`reasons-${index}`}>
                      {COMMON_REASONS.map((reason) => (
                        <option key={reason} value={reason} />
                      ))}
                    </datalist>

                    <Select
                      selectedKeys={rule.target_id ? [rule.target_id] : []}
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0];
                        updateRule(index, { target_id: key ? String(key) : "" });
                      }}
                      className="max-w-xs"
                      size="sm"
                    >
                      {targets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </Select>

                    <div className="flex items-center gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() =>
                          setExpandedRuleId(expandedRuleId === index ? null : index)
                        }
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedRuleId === index ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Priority Slider */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs w-16">Priority</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rule.priority}
                      onChange={(e) =>
                        updateRule(index, { priority: parseInt(e.target.value) })
                      }
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">{rule.priority}</span>
                  </div>

                  {/* Expanded Details */}
                  {expandedRuleId === index && (
                    <div className="space-y-3 pt-3 border-t border-default-300">
                      {/* Channel Filter */}
                      <div>
                        <p className="text-xs font-medium mb-1">Channel Filter</p>
                        <div className="flex gap-2">
                          {CHANNELS.map((channel) => (
                            <label
                              key={channel}
                              className="flex items-center gap-1 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={rule.when?.channel?.includes(channel) || false}
                                onChange={(e) => {
                                  const channels = rule.when?.channel || [];
                                  const newChannels = e.target.checked
                                    ? [...channels, channel]
                                    : channels.filter((c) => c !== channel);
                                  updateRule(index, {
                                    when: {
                                      ...rule.when,
                                      channel: newChannels.length > 0 ? newChannels : undefined,
                                    },
                                  });
                                }}
                                className="h-4 w-4"
                              />
                              {channel}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Severity Filter */}
                      <div>
                        <p className="text-xs font-medium mb-1">Min Severity</p>
                        <Select
                          selectedKeys={rule.when?.min_severity ? [rule.when.min_severity] : []}
                          onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0];
                            updateRule(index, {
                              when: {
                                ...rule.when,
                                min_severity: key ? (String(key) as any) : undefined,
                              },
                            });
                          }}
                          size="sm"
                          className="max-w-xs"
                        >
                          {SEVERITY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      {/* Tags */}
                      <div>
                        <p className="text-xs font-medium mb-1">Tags (Any Match)</p>
                        <div className="flex flex-wrap gap-1 p-2 border border-default-300 rounded-lg min-h-8 bg-white">
                          {rule.when?.tags_any?.map((tag, i) => (
                            <Chip
                              key={i}
                              onClose={() => {
                                const newTags = rule.when?.tags_any?.filter(
                                  (_, idx) => idx !== i
                                );
                                updateRule(index, {
                                  when: {
                                    ...rule.when,
                                    tags_any: newTags && newTags.length > 0 ? newTags : undefined,
                                  },
                                });
                              }}
                              size="sm"
                            >
                              {tag}
                            </Chip>
                          ))}
                          <input
                            type="text"
                            placeholder="Add tag"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value) {
                                const tag = e.currentTarget.value;
                                updateRule(index, {
                                  when: {
                                    ...rule.when,
                                    tags_any: [
                                      ...(rule.when?.tags_any || []),
                                      tag,
                                    ],
                                  },
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="flex-1 min-w-20 border-0 bg-transparent text-xs placeholder:text-default-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Tags All */}
                      <div>
                        <p className="text-xs font-medium mb-1">Tags (All Must Match)</p>
                        <div className="flex flex-wrap gap-1 p-2 border border-default-300 rounded-lg min-h-8 bg-white">
                          {rule.when?.tags_all?.map((tag, i) => (
                            <Chip
                              key={i}
                              onClose={() => {
                                const newTags = rule.when?.tags_all?.filter(
                                  (_, idx) => idx !== i
                                );
                                updateRule(index, {
                                  when: {
                                    ...rule.when,
                                    tags_all: newTags && newTags.length > 0 ? newTags : undefined,
                                  },
                                });
                              }}
                              size="sm"
                            >
                              {tag}
                            </Chip>
                          ))}
                          <input
                            type="text"
                            placeholder="Add tag"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value) {
                                const tag = e.currentTarget.value;
                                updateRule(index, {
                                  when: {
                                    ...rule.when,
                                    tags_all: [
                                      ...(rule.when?.tags_all || []),
                                      tag,
                                    ],
                                  },
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="flex-1 min-w-20 border-0 bg-transparent text-xs placeholder:text-default-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={savePolicy}
            isLoading={saving}
            color="primary"
          >
            Save Policy
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
