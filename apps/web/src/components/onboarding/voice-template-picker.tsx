"use client";

import { useState } from "react";
import { Card, CardBody, CardFooter, Button, Chip, Spinner } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface VoiceTemplate {
  id: string;
  name: string;
  description: string;
  category: "sales" | "support" | "booking" | "survey" | "general";
  icon: string;
  agentType: "INBOUND" | "OUTBOUND" | "HYBRID";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedSetupTime: string;
  features: string[];
}

interface VoiceTemplatePickerProps {
  templates: VoiceTemplate[];
  selectedId?: string;
  onSelect: (template: VoiceTemplate) => void;
  isLoading?: boolean;
  showFilters?: boolean;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  sales: { label: "Sales", color: "primary" },
  support: { label: "Support", color: "success" },
  booking: { label: "Booking", color: "warning" },
  survey: { label: "Survey", color: "secondary" },
  general: { label: "General", color: "default" },
};

const agentTypeLabels: Record<string, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
  HYBRID: "Hybrid",
};

export function VoiceTemplatePicker({
  templates,
  selectedId,
  onSelect,
  isLoading = false,
  showFilters = true,
}: VoiceTemplatePickerProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = [...new Set(templates.map((t) => t.category))];

  const filteredTemplates = categoryFilter
    ? templates.filter((t) => t.category === categoryFilter)
    : templates;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label="Loading templates..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={categoryFilter === null ? "solid" : "flat"}
            color="primary"
            onPress={() => setCategoryFilter(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? "solid" : "flat"}
              color={categoryLabels[cat]?.color as "primary" | "success" | "warning" | "secondary" | "default"}
              onPress={() => setCategoryFilter(cat)}
            >
              {categoryLabels[cat]?.label || cat}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            isPressable
            isHoverable
            className={cn(
              "transition-all",
              selectedId === template.id && "ring-2 ring-primary border-primary"
            )}
            onPress={() => onSelect(template)}
          >
            <CardBody className="gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-default-500">
                      {template.estimatedSetupTime} setup
                    </p>
                  </div>
                </div>
                {selectedId === template.id && (
                  <Chip color="primary" size="sm" variant="solid">
                    Selected
                  </Chip>
                )}
              </div>

              <p className="text-sm text-default-600">{template.description}</p>

              <div className="flex flex-wrap gap-1">
                <Chip
                  size="sm"
                  variant="flat"
                  color={categoryLabels[template.category]?.color as "primary" | "success" | "warning" | "secondary" | "default"}
                >
                  {categoryLabels[template.category]?.label}
                </Chip>
                <Chip size="sm" variant="flat">
                  {agentTypeLabels[template.agentType]}
                </Chip>
              </div>
            </CardBody>

            <CardFooter className="border-t border-divider pt-3">
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 3).map((feature) => (
                  <Chip key={feature} size="sm" variant="dot" color="default">
                    {feature}
                  </Chip>
                ))}
                {template.features.length > 3 && (
                  <Chip size="sm" variant="flat" color="default">
                    +{template.features.length - 3} more
                  </Chip>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-default-500">
          No templates found for this category.
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for quick selection in wizards
 */
interface QuickTemplatePickerProps {
  templates: VoiceTemplate[];
  selectedId?: string;
  onSelect: (template: VoiceTemplate) => void;
}

export function QuickTemplatePicker({
  templates,
  selectedId,
  onSelect,
}: QuickTemplatePickerProps) {
  // Show only beginner templates for quick selection
  const quickTemplates = templates.filter((t) => t.difficulty === "beginner").slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-3">
      {quickTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
            "hover:border-primary hover:bg-primary/5",
            selectedId === template.id
              ? "border-primary bg-primary/10"
              : "border-default-200"
          )}
        >
          <span className="text-4xl">{template.icon}</span>
          <span className="font-medium text-sm text-center">{template.name}</span>
          <span className="text-xs text-default-500">{template.estimatedSetupTime}</span>
        </button>
      ))}
    </div>
  );
}
