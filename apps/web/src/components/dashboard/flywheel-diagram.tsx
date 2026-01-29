"use client";

/**
 * Flywheel Diagram - Visual representation of the self-improving AI marketing cycle
 *
 * Brand Brain → Content Factory → Publishing → Analytics → Learning Loop
 *      ↑                                                        │
 *      └──────────────────── AI Improvements ───────────────────┘
 */

import { useState } from "react";
import { Card, CardBody, Tooltip } from "@heroui/react";
import {
  Brain,
  Sparkles,
  Share2,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Zap,
} from "lucide-react";

interface FlywheelStage {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  href: string;
}

const FLYWHEEL_STAGES: FlywheelStage[] = [
  {
    id: "brand-brain",
    name: "Brand Brain",
    shortName: "Brain",
    description: "AI learns your voice, audience & content strategy",
    icon: <Brain className="w-5 h-5" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    href: "/dashboard/brand",
  },
  {
    id: "content-factory",
    name: "Content Factory",
    shortName: "Create",
    description: "Generate platform-optimized content using your brand voice",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "/dashboard/content",
  },
  {
    id: "publishing",
    name: "Publishing",
    shortName: "Publish",
    description: "Auto-schedule & publish to all your social platforms",
    icon: <Share2 className="w-5 h-5" />,
    color: "text-success",
    bgColor: "bg-success/10",
    href: "/dashboard/publishing",
  },
  {
    id: "analytics",
    name: "Analytics",
    shortName: "Analyze",
    description: "Track engagement, reach & conversions across platforms",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-warning",
    bgColor: "bg-warning/10",
    href: "/dashboard/analytics",
  },
  {
    id: "learning",
    name: "Learning Loop",
    shortName: "Learn",
    description: "AI discovers what works & improves your Brand Brain",
    icon: <RefreshCw className="w-5 h-5" />,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    href: "/dashboard/brand",
  },
];

interface FlywheelDiagramProps {
  /**
   * Compact horizontal view for dashboard cards
   */
  compact?: boolean;
  /**
   * Highlight specific stages as active/completed
   */
  activeStages?: string[];
  /**
   * Current stage index for animation
   */
  currentStage?: number;
  /**
   * Show animated pulse on active elements
   */
  animated?: boolean;
  /**
   * Click handler for stages
   */
  onStageClick?: (stage: FlywheelStage) => void;
}

export function FlywheelDiagram({
  compact = false,
  activeStages = [],
  currentStage,
  animated = true,
  onStageClick,
}: FlywheelDiagramProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/5 via-primary/5 to-success/5 rounded-lg overflow-x-auto">
        {FLYWHEEL_STAGES.map((stage, index) => {
          const isActive = activeStages.includes(stage.id);
          const isCurrent = currentStage === index;

          return (
            <div key={stage.id} className="flex items-center">
              <Tooltip content={stage.description}>
                <button
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    onStageClick ? "cursor-pointer hover:bg-default-100" : ""
                  } ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
                  onClick={() => onStageClick?.(stage)}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div
                    className={`relative p-2 rounded-full ${stage.bgColor} ${stage.color}`}
                  >
                    {stage.icon}
                    {animated && isActive && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isActive || isCurrent
                        ? "text-default-900"
                        : "text-default-500"
                    }`}
                  >
                    {stage.shortName}
                  </span>
                </button>
              </Tooltip>
              {index < FLYWHEEL_STAGES.length - 1 && (
                <ArrowRight className="w-3 h-3 text-default-300 mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
        {/* Loop back arrow */}
        <div className="flex items-center ml-1">
          <Zap className="w-3 h-3 text-warning" />
        </div>
      </div>
    );
  }

  // Full circular diagram view
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-6">
        <div className="relative w-full aspect-square max-w-md mx-auto">
          {/* Central hub */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-purple-500 flex items-center justify-center shadow-lg">
              <div className="text-center text-white">
                <RefreshCw
                  className={`w-8 h-8 mx-auto ${animated ? "animate-spin-slow" : ""}`}
                />
                <span className="text-xs font-semibold">Flywheel</span>
              </div>
            </div>
          </div>

          {/* Orbit ring */}
          <div className="absolute inset-8 rounded-full border-2 border-dashed border-default-200" />

          {/* Stage nodes positioned in a circle */}
          {FLYWHEEL_STAGES.map((stage, index) => {
            const isActive = activeStages.includes(stage.id);
            const isCurrent = currentStage === index;
            const angle = (index / FLYWHEEL_STAGES.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 42; // percentage from center

            const style = {
              position: "absolute" as const,
              left: `${50 + radius * Math.cos(angle)}%`,
              top: `${50 + radius * Math.sin(angle)}%`,
              transform: "translate(-50%, -50%)",
            };

            return (
              <Tooltip key={stage.id} content={stage.description}>
                <button
                  className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    onStageClick ? "cursor-pointer" : ""
                  } ${
                    hoveredStage === stage.id
                      ? "scale-110 bg-default-100"
                      : ""
                  } ${isCurrent ? "ring-2 ring-primary shadow-lg" : ""}`}
                  style={style}
                  onClick={() => onStageClick?.(stage)}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div
                    className={`relative p-3 rounded-full ${stage.bgColor} ${stage.color} transition-all group-hover:scale-110`}
                  >
                    {stage.icon}
                    {animated && isActive && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isActive || isCurrent || hoveredStage === stage.id
                        ? "text-default-900"
                        : "text-default-500"
                    }`}
                  >
                    {stage.name}
                  </span>
                </button>
              </Tooltip>
            );
          })}

          {/* Connection arrows between nodes */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 6 3, 0 6"
                  fill="currentColor"
                  className="text-default-300"
                />
              </marker>
            </defs>
            {/* Curved arrows connecting stages */}
            {FLYWHEEL_STAGES.map((_, index) => {
              const nextIndex = (index + 1) % FLYWHEEL_STAGES.length;
              const angle1 = (index / FLYWHEEL_STAGES.length) * 2 * Math.PI - Math.PI / 2;
              const angle2 = (nextIndex / FLYWHEEL_STAGES.length) * 2 * Math.PI - Math.PI / 2;
              const r = 35;

              const x1 = 50 + r * Math.cos(angle1);
              const y1 = 50 + r * Math.sin(angle1);
              const x2 = 50 + r * Math.cos(angle2);
              const y2 = 50 + r * Math.sin(angle2);

              // Control point for curved arrow
              const midAngle = (angle1 + angle2) / 2;
              const cx = 50 + (r - 5) * Math.cos(midAngle);
              const cy = 50 + (r - 5) * Math.sin(midAngle);

              return (
                <path
                  key={index}
                  d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-default-200"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-default-500">
            Each stage feeds the next. The more you use it, the smarter it gets.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

// Add custom animation to tailwind
// In globals.css or tailwind config:
// .animate-spin-slow { animation: spin 8s linear infinite; }

export { FLYWHEEL_STAGES };
export type { FlywheelStage };
