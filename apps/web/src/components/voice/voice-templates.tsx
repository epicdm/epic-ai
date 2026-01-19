"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Input,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  voiceAgentTemplates,
  type VoiceAgentTemplate,
} from "@/lib/voice/templates";
import {
  MagnifyingGlassIcon,
  ClockIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
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

const difficultyColors: Record<
  VoiceAgentTemplate["difficulty"],
  "success" | "warning" | "danger"
> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

const agentTypeIcons: Record<VoiceAgentTemplate["agentType"], React.ReactNode> = {
  INBOUND: <PhoneArrowDownLeftIcon className="w-4 h-4" />,
  OUTBOUND: <PhoneArrowUpRightIcon className="w-4 h-4" />,
  HYBRID: <ArrowsRightLeftIcon className="w-4 h-4" />,
};

export function VoiceTemplates() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    onOpen();
  };

  const handleUseTemplate = (template: VoiceAgentTemplate) => {
    // Navigate to create agent page with template ID
    router.push(`/dashboard/voice/agents/new?template=${template.id}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voice Agent Templates"
        description="Start with a pre-configured template to quickly deploy your AI voice agent."
        actions={
          <Button
            as={Link}
            href="/dashboard/voice"
            variant="flat"
            startContent={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Voice AI
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
          className="sm:max-w-xs"
        />
        <Tabs
          selectedKey={selectedCategory}
          onSelectionChange={(key) => setSelectedCategory(key as string)}
          variant="solid"
          size="sm"
        >
          <Tab key="all" title="All" />
          <Tab key="sales" title="Sales" />
          <Tab key="support" title="Support" />
          <Tab key="booking" title="Booking" />
          <Tab key="survey" title="Survey" />
          <Tab key="general" title="General" />
        </Tabs>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <p className="text-gray-500">
              No templates found matching your search.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardBody className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex gap-2">
                    <Chip
                      size="sm"
                      color={difficultyColors[template.difficulty]}
                      variant="flat"
                    >
                      {template.difficulty}
                    </Chip>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
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
                  <Chip size="sm" variant="flat">
                    {categoryLabels[template.category]}
                  </Chip>
                </div>

                {/* Features Preview */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.features.slice(0, 3).map((feature) => (
                    <Chip key={feature} size="sm" variant="bordered" className="text-xs">
                      {feature}
                    </Chip>
                  ))}
                  {template.features.length > 3 && (
                    <Chip size="sm" variant="bordered" className="text-xs">
                      +{template.features.length - 3} more
                    </Chip>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="flat"
                    size="sm"
                    className="flex-1"
                    onPress={() => handlePreview(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    color="primary"
                    size="sm"
                    className="flex-1"
                    startContent={<Sparkles className="w-4 h-4" />}
                    onPress={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {selectedTemplate && (
            <>
              <ModalHeader className="flex items-center gap-3">
                <span className="text-3xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-500 font-normal">
                    {selectedTemplate.description}
                  </p>
                </div>
              </ModalHeader>
              <ModalBody className="space-y-6">
                {/* Overview */}
                <div className="flex flex-wrap gap-3">
                  <Chip
                    color={difficultyColors[selectedTemplate.difficulty]}
                    variant="flat"
                  >
                    {selectedTemplate.difficulty} level
                  </Chip>
                  <Chip variant="flat" startContent={agentTypeIcons[selectedTemplate.agentType]}>
                    {selectedTemplate.agentType}
                  </Chip>
                  <Chip variant="flat" startContent={<ClockIcon className="w-4 h-4" />}>
                    {selectedTemplate.estimatedSetupTime} setup
                  </Chip>
                  <Chip variant="flat">
                    {categoryLabels[selectedTemplate.category]}
                  </Chip>
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
                    <CardBody className="p-4">
                      <p className="text-sm italic text-gray-600 dark:text-gray-300">
                        &ldquo;{selectedTemplate.greetingMessage}&rdquo;
                      </p>
                    </CardBody>
                  </Card>
                </div>

                {/* System Prompt Preview */}
                <div>
                  <h4 className="font-medium mb-2">System Prompt</h4>
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <CardBody className="p-4 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {selectedTemplate.systemPrompt}
                      </pre>
                    </CardBody>
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
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  startContent={<Sparkles className="w-4 h-4" />}
                  onPress={() => {
                    onClose();
                    handleUseTemplate(selectedTemplate);
                  }}
                >
                  Use This Template
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
