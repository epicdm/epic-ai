"use client";

/**
 * Learning Loop Card - Shows AI discoveries from the Flywheel
 *
 * Makes visible: Analytics → AI Analysis → Brand Brain Improvements → Better Content
 * This is the "magic" of the flywheel - showing users their AI is actually learning.
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Progress,
} from "@heroui/react";
import {
  Brain,
  TrendingUp,
  Clock,
  Hash,
  Target,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Zap,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Learning {
  id: string;
  type: string;
  insight: string;
  confidence: number;
  createdAt: string;
}

interface LearningLoopData {
  learnings: Learning[];
  totalLearnings: number;
  lastAnalyzed: string | null;
  bestPostingTimes: {
    dayOfWeek: number;
    hourOfDay: number;
  } | null;
}

const LEARNING_TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  BEST_TIME: { icon: Clock, color: "primary", label: "Best Time" },
  BEST_HASHTAG: { icon: Hash, color: "secondary", label: "Hashtags" },
  BEST_TOPIC: { icon: Target, color: "success", label: "Topic" },
  BEST_FORMAT: { icon: MessageSquare, color: "warning", label: "Format" },
  AUDIENCE_INSIGHT: { icon: TrendingUp, color: "primary", label: "Audience" },
  TONE_ADJUSTMENT: { icon: Sparkles, color: "secondary", label: "Tone" },
  AVOID: { icon: AlertTriangle, color: "danger", label: "Avoid" },
  PLATFORM_SPECIFIC: { icon: Zap, color: "success", label: "Platform" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface LearningLoopCardProps {
  brandId?: string;
  compact?: boolean;
}

export function LearningLoopCard({ brandId, compact = false }: LearningLoopCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<LearningLoopData | null>(null);

  const loadLearnings = async () => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/analytics/learnings?brandId=${brandId}`);
      if (res.ok) {
        const learningsData = await res.json();
        setData(learningsData);
      }
    } catch (error) {
      console.error("Error loading learnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewLearnings = async () => {
    if (!brandId) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/analytics/learnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });

      if (res.ok) {
        await loadLearnings();
      }
    } catch (error) {
      console.error("Error generating learnings:", error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadLearnings();
  }, [brandId]);

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  // No brand or no learnings yet - show the flywheel concept
  if (!brandId || !data || data.totalLearnings === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/5 via-primary/5 to-success/5 border border-primary/20">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-purple-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Learning Loop</h3>
              <p className="text-xs text-default-500">Your AI is getting smarter</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Visual Flow Diagram */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs mt-1 text-default-500">Analytics</span>
            </div>
            <ArrowRight className="w-4 h-4 text-default-300" />
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-xs mt-1 text-default-500">AI Analysis</span>
            </div>
            <ArrowRight className="w-4 h-4 text-default-300" />
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-success" />
              </div>
              <span className="text-xs mt-1 text-default-500">Brand Brain</span>
            </div>
          </div>

          <p className="text-sm text-center text-default-500 mb-4">
            Publish content to start the learning loop. Your AI will analyze performance
            and automatically improve future content.
          </p>

          <Button
            color="primary"
            className="w-full"
            onPress={() => router.push("/dashboard/content")}
          >
            Create Your First Post
          </Button>
        </CardBody>
      </Card>
    );
  }

  const recentLearnings = data.learnings.slice(0, compact ? 2 : 4);
  const formatTime = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${h}${ampm}`;
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-success/5 to-primary/5 border border-success/20">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                  </span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">AI Learning Active</p>
                <p className="text-xs text-default-500">
                  {data.totalLearnings} insights discovered
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="flat"
              color="success"
              onPress={() => router.push("/dashboard/brand")}
            >
              View All
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-primary via-secondary to-success rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {data.totalLearnings > 0 && (
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                </span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Learning Loop
              <Chip size="sm" color="success" variant="flat">
                Active
              </Chip>
            </h3>
            <p className="text-xs text-default-500">
              Your AI has discovered {data.totalLearnings} insights
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="bordered"
          isLoading={generating}
          onPress={generateNewLearnings}
          startContent={!generating && <RefreshCw className="w-4 h-4" />}
        >
          Analyze Now
        </Button>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Visual Flywheel Flow */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 via-secondary/5 to-success/5 rounded-lg">
          <div className="flex items-center gap-1 text-xs">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Analytics</span>
          </div>
          <ArrowRight className="w-3 h-3 text-default-300" />
          <div className="flex items-center gap-1 text-xs">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>AI Analysis</span>
          </div>
          <ArrowRight className="w-3 h-3 text-default-300" />
          <div className="flex items-center gap-1 text-xs">
            <Brain className="w-4 h-4 text-success" />
            <span>Brand Brain</span>
          </div>
          <ArrowRight className="w-3 h-3 text-default-300" />
          <div className="flex items-center gap-1 text-xs">
            <Zap className="w-4 h-4 text-warning" />
            <span>Better Content</span>
          </div>
        </div>

        {/* Best Posting Time (if available) */}
        {data.bestPostingTimes && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Optimal Posting Time</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {DAY_NAMES[data.bestPostingTimes.dayOfWeek]}s at{" "}
              {formatTime(data.bestPostingTimes.hourOfDay)}
            </p>
            <p className="text-xs text-default-500">
              Based on your audience engagement patterns
            </p>
          </div>
        )}

        {/* Recent Learnings */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            Recent Discoveries
          </h4>
          <div className="space-y-2">
            {recentLearnings.map((learning) => {
              const config = LEARNING_TYPE_CONFIG[learning.type] || {
                icon: Sparkles,
                color: "default",
                label: learning.type,
              };
              const Icon = config.icon;

              return (
                <div
                  key={learning.id}
                  className="p-3 bg-default-50 rounded-lg border border-default-100"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 bg-${config.color}/10 rounded-md`}>
                      <Icon className={`w-4 h-4 text-${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip size="sm" variant="flat" color={config.color as any}>
                          {config.label}
                        </Chip>
                        <span className="text-xs text-default-400">
                          {Math.round(learning.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm">{learning.insight}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View All Link */}
        <Button
          variant="light"
          className="w-full"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={() => router.push("/dashboard/brand")}
        >
          View All {data.totalLearnings} Learnings in Brand Brain
        </Button>
      </CardBody>
    </Card>
  );
}
