"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIConfidence } from "@/components/ui/ai-confidence";

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

// Helper function to determine recommended voice agent templates
function getRecommendedVoiceTemplates(): {
  templateId: string;
  confidence: number;
  reason: string;
}[] {
  return [
    { templateId: "sales-assistant", confidence: 95, reason: "Most popular for sales outreach and lead qualification" },
    { templateId: "customer-support", confidence: 93, reason: "Most popular for customer service and FAQ handling" },
    { templateId: "appointment-booking", confidence: 90, reason: "Versatile HYBRID agent for scheduling across industries" },
    { templateId: "receptionist", confidence: 88, reason: "Great all-purpose front desk agent for general inquiries" },
    { templateId: "survey-feedback", confidence: 85, reason: "Quick to set up for collecting customer feedback" },
  ];
}

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? "solid" : "flat"}
              color={categoryLabels[cat]?.color as "primary" | "success" | "warning" | "secondary" | "default"}
              onClick={() => setCategoryFilter(cat)}
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
            className="cursor-pointer"
            
            className={cn(
              "transition-all",
              selectedId === template.id && "ring-2 ring-primary border-primary"
            )}
            onClick={() => onSelect(template)}
          >
            <CardContent className="gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {/* Add confidence dots inline */}
                      {(() => {
                        const recommendations = getRecommendedVoiceTemplates();
                        const recommendation = recommendations.find(r => r.templateId === template.id);
                        return recommendation ? (
                          <AIConfidence
                            score={recommendation.confidence}
                            variant="dots"
                          />
                        ) : null;
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.estimatedSetupTime} setup
                    </p>
                  </div>
                </div>
                {selectedId === template.id && (
                  <Badge   >
                    Selected
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{template.description}</p>

              {/* AI Recommendation Badge */}
              {(() => {
                const recommendations = getRecommendedVoiceTemplates();
                const recommendation = recommendations.find(r => r.templateId === template.id);
                return recommendation ? (
                  <div className="mb-4 flex justify-start">
                    <AIBadge
                      type="recommended"
                      reason={recommendation.reason}
                      confidence={recommendation.confidence}
                      size="sm"
                    />
                  </div>
                ) : null;
              })()}

              <div className="flex flex-wrap gap-1">
                <Badge
                  
                  variant="secondary"
                  color={categoryLabels[template.category]?.color as "primary" | "success" | "warning" | "secondary" | "default"}
                >
                  {categoryLabels[template.category]?.label}
                </Badge>
                <Badge  variant="secondary">
                  {agentTypeLabels[template.agentType]}
                </Badge>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border pt-3">
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 3).map((feature) => (
                  <Badge key={feature}  variant="outline" >
                    {feature}
                  </Badge>
                ))}
                {template.features.length > 3 && (
                  <Badge  variant="secondary" >
                    +{template.features.length - 3} more
                  </Badge>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
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
              : "border-border"
          )}
        >
          <span className="text-4xl">{template.icon}</span>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="font-medium text-sm text-center">{template.name}</span>
            {/* Add confidence dots inline */}
            {(() => {
              const recommendations = getRecommendedVoiceTemplates();
              const recommendation = recommendations.find(r => r.templateId === template.id);
              return recommendation ? (
                <AIConfidence
                  score={recommendation.confidence}
                  variant="dots"
                />
              ) : null;
            })()}
          </div>
          {/* AI Recommendation Badge */}
          {(() => {
            const recommendations = getRecommendedVoiceTemplates();
            const recommendation = recommendations.find(r => r.templateId === template.id);
            return recommendation ? (
              <AIBadge
                type="recommended"
                reason={recommendation.reason}
                confidence={recommendation.confidence}
                size="sm"
              />
            ) : null;
          })()}
          <span className="text-xs text-muted-foreground">{template.estimatedSetupTime}</span>
        </button>
      ))}
    </div>
  );
}
