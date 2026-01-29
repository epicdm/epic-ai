"use client";

import { useState } from "react";
import { Card, CardBody, Button, Chip, Input } from "@heroui/react";
import { Target, Plus, X, TrendingUp, Zap } from "lucide-react";
import type { LearnWizardData, OptimizationGoal, MetricType } from "@/lib/flywheel/types";

interface GoalsStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const METRIC_OPTIONS: { id: MetricType; label: string }[] = [
  { id: "engagement", label: "Engagement Rate" },
  { id: "reach", label: "Reach" },
  { id: "followers", label: "Follower Growth" },
  { id: "clicks", label: "Link Clicks" },
  { id: "leads", label: "Lead Generation" },
  { id: "conversions", label: "Conversions" },
];

const PRESET_GOALS: OptimizationGoal[] = [
  { metric: "engagement", priority: "high" },
  { metric: "reach", priority: "medium" },
  { metric: "followers", priority: "medium" },
];

export function GoalsStep({ data, updateData }: GoalsStepProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [targetValue, setTargetValue] = useState<string>("");

  const goals = data.optimizationGoals || [];

  const addGoal = (metric: MetricType, target?: number, priority: "high" | "medium" | "low" = "medium") => {
    if (goals.some((g) => g.metric === metric)) return;

    const newGoal: OptimizationGoal = {
      metric,
      target,
      priority,
    };

    updateData({
      optimizationGoals: [...goals, newGoal],
    });

    setSelectedMetric(null);
    setTargetValue("");
  };

  const removeGoal = (metric: MetricType) => {
    updateData({
      optimizationGoals: goals.filter((g) => g.metric !== metric),
    });
  };

  const updateGoalPriority = (metric: MetricType, priority: "high" | "medium" | "low") => {
    updateData({
      optimizationGoals: goals.map((g) =>
        g.metric === metric ? { ...g, priority } : g
      ),
    });
  };

  const applyPresets = () => {
    updateData({ optimizationGoals: PRESET_GOALS });
  };

  const availableMetrics = METRIC_OPTIONS.filter(
    (m) => !goals.some((g) => g.metric === m.id)
  );

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Tell the AI what to optimize for. These goals help prioritize which
        insights and recommendations you receive.
      </p>

      {/* Quick Presets */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Quick Start
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Use recommended goals for most businesses
                </p>
              </div>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={applyPresets}
            >
              Apply Presets
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Current Goals */}
      {goals.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Your Learning Goals
            </h4>
            <div className="space-y-3">
              {goals.map((goal) => {
                const metricLabel = METRIC_OPTIONS.find(
                  (m) => m.id === goal.metric
                )?.label;

                return (
                  <div
                    key={goal.metric}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {metricLabel}
                        </p>
                        {goal.target && (
                          <p className="text-sm text-gray-500">
                            Target: {goal.target}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={goal.priority}
                        onChange={(e) =>
                          updateGoalPriority(
                            goal.metric,
                            e.target.value as "high" | "medium" | "low"
                          )
                        }
                        className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
                      >
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => removeGoal(goal.metric)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Add New Goal */}
      {availableMetrics.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Add a Goal
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableMetrics.map((metric) => (
                <Button
                  key={metric.id}
                  size="sm"
                  variant={selectedMetric === metric.id ? "solid" : "bordered"}
                  color={selectedMetric === metric.id ? "secondary" : "default"}
                  onPress={() => setSelectedMetric(metric.id)}
                >
                  {metric.label}
                </Button>
              ))}
            </div>

            {selectedMetric && (
              <div className="flex items-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <Input
                    type="number"
                    label="Target (optional)"
                    placeholder="e.g., 1000"
                    value={targetValue}
                    onValueChange={setTargetValue}
                    size="sm"
                  />
                </div>
                <Button
                  color="primary"
                  size="sm"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={() =>
                    addGoal(
                      selectedMetric,
                      targetValue ? parseInt(targetValue, 10) : undefined
                    )
                  }
                >
                  Add Goal
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Goals Summary */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="text-gray-500 dark:text-gray-400">Active goals:</div>
        <Chip
          color={goals.length >= 1 ? "success" : "warning"}
          variant="flat"
          startContent={<Target className="w-3 h-3" />}
        >
          {goals.length} goal{goals.length !== 1 ? "s" : ""}
        </Chip>
      </div>

      {/* Info */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How Goals Work
          </h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The AI uses your goals to prioritize insights and recommendations.
            High-priority goals get more attention in your reports and influence
            content suggestions more heavily.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
