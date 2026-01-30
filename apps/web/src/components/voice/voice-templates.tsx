"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  voiceAgentTemplates,
  type VoiceAgentTemplate,
} from "@/lib/voice/templates";
import {
  Search as MagnifyingGlassIcon,
  Clock as ClockIcon,
  PhoneIncoming as PhoneArrowDownLeftIcon,
  PhoneOutgoing as PhoneArrowUpRightIcon,
  ArrowLeftRight as ArrowsRightLeftIcon,
} from "lucide-react";
import { ArrowLeft, Sparkles, CheckCircle } from "lucide-react";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIConfidence } from "@/components/ui/ai-confidence";

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

const categoryLabels: Record<VoiceAgentTemplate["category"], string> = {
  sales: "Sales",
  support: "Support",
  booking: "Booking",
  survey: "Survey",
  general: "General",
};

const difficultyBadgeClass: Record<VoiceAgentTemplate["difficulty"], string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const agentTypeIcons: Record<VoiceAgentTemplate["agentType"], React.ReactNode> = {
  INBOUND: <PhoneArrowDownLeftIcon className="w-4 h-4" />,
  OUTBOUND: <PhoneArrowUpRightIcon className="w-4 h-4" />,
  HYBRID: <ArrowsRightLeftIcon className="w-4 h-4" />,
};

export function VoiceTemplates() {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<VoiceAgentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTemplates = voiceAgentTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePreview = (template: VoiceAgentTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = (template: VoiceAgentTemplate) => {
    router.push(`/dashboard/voice/agents/new?template=${template.id}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voice Agent Templates"
        description="Start with a pre-configured template to quickly deploy your AI voice agent."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/dashboard/voice">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Voice AI
            </Link>
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative sm:max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="booking">Booking</TabsTrigger>
            <TabsTrigger value="survey">Survey</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              No templates found matching your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex gap-2">
                    <Badge className={difficultyBadgeClass[template.difficulty]}>
                      {template.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
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
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {template.description}
                </p>

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

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    {agentTypeIcons[template.agentType]}
                    <span>{template.agentType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{template.estimatedSetupTime}</span>
                  </div>
                  <Badge variant="secondary">
                    {categoryLabels[template.category]}
                  </Badge>
                </div>

                {/* Features Preview */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.features.slice(0, 3).map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {template.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.features.length - 3} more
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTemplate.icon}</span>
                  <div>
                    <div className="text-xl font-semibold">{selectedTemplate.name}</div>
                    <p className="text-sm text-gray-500 font-normal">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Overview */}
                <div className="flex flex-wrap gap-3">
                  <Badge className={difficultyBadgeClass[selectedTemplate.difficulty]}>
                    {selectedTemplate.difficulty} level
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {agentTypeIcons[selectedTemplate.agentType]}
                    {selectedTemplate.agentType}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {selectedTemplate.estimatedSetupTime} setup
                  </Badge>
                  <Badge variant="secondary">
                    {categoryLabels[selectedTemplate.category]}
                  </Badge>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-medium mb-3">Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Greeting Message */}
                <div>
                  <h4 className="font-medium mb-2">Greeting Message</h4>
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <CardContent className="p-4">
                      <p className="text-sm italic text-gray-600 dark:text-gray-300">
                        &ldquo;{selectedTemplate.greetingMessage}&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* System Prompt Preview */}
                <div>
                  <h4 className="font-medium mb-2">System Prompt</h4>
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <CardContent className="p-4 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {selectedTemplate.systemPrompt}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {/* Configuration */}
                <div>
                  <h4 className="font-medium mb-3">Default Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Voice:</span>
                      <span className="ml-2 font-medium capitalize">
                        {selectedTemplate.suggestedVoice}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Model:</span>
                      <span className="ml-2 font-medium">
                        {selectedTemplate.suggestedModel}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Temperature:</span>
                      <span className="ml-2 font-medium">
                        {selectedTemplate.temperature}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Instructions */}
                {selectedTemplate.customInstructions && (
                  <div>
                    <h4 className="font-medium mb-2">Tips</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedTemplate.customInstructions}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleUseTemplate(selectedTemplate);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use This Template
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
