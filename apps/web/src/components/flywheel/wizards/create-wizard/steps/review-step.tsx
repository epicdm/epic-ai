"use client";

import {
  Card,
  CardBody,
  Chip,
  Checkbox,
} from "@heroui/react";
import {
  FileText,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Hash,
  Check,
  AlertCircle,
} from "lucide-react";
import type { CreateWizardData } from "@/lib/flywheel/types";

interface CreateReviewStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
}

export function CreateReviewStep({ data, updateData }: CreateReviewStepProps) {
  const templates = data.templates || [];
  const generatedContent = data.generatedContent || [];
  const enabledTypes = data.enabledTypes || [];
  const brandColors = data.brandColors || [];
  const savedHashtags = data.savedHashtags || [];

  const approvedContent = generatedContent.filter((c) => c.status === "approved");

  // Check completion status of each section
  const sections = [
    {
      title: "Content Templates",
      icon: FileText,
      complete: templates.length >= 1,
      summary: `${templates.length} template${templates.length !== 1 ? "s" : ""} configured`,
      details: templates.slice(0, 3).map((t) => t.name),
    },
    {
      title: "Generated Content",
      icon: Sparkles,
      complete: generatedContent.length >= 1,
      summary: `${approvedContent.length}/${generatedContent.length} approved`,
      details: generatedContent.slice(0, 3).map((c) => c.topic),
    },
    {
      title: "Content Types",
      icon: Layers,
      complete: enabledTypes.length >= 1,
      summary: `${enabledTypes.length} type${enabledTypes.length !== 1 ? "s" : ""} enabled`,
      details: enabledTypes,
    },
    {
      title: "Media Settings",
      icon: ImageIcon,
      complete: true, // Optional step
      summary: data.imageGeneration ? "AI images enabled" : "AI images disabled",
      details: brandColors.length > 0 ? [`${brandColors.length} brand color${brandColors.length !== 1 ? "s" : ""}`] : [],
    },
    {
      title: "Hashtag Strategy",
      icon: Hash,
      complete: data.hashtagStrategy !== undefined,
      summary: data.hashtagStrategy
        ? data.hashtagStrategy.charAt(0).toUpperCase() + data.hashtagStrategy.slice(1)
        : "Not set",
      details: savedHashtags.slice(0, 5),
    },
  ];

  const allComplete = sections.every((s) => s.complete);

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Review your Content Factory settings. You can go back to modify any
        section before proceeding.
      </p>

      {/* Summary Cards */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className={`border ${
                section.complete
                  ? "border-green-200 dark:border-green-800"
                  : "border-amber-200 dark:border-amber-800"
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      section.complete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-amber-100 dark:bg-amber-900"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        section.complete
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {section.title}
                      </h4>
                      {section.complete ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {section.summary}
                    </p>

                    {section.details.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {section.details.map((detail, i) => (
                          <Chip
                            key={i}
                            size="sm"
                            variant="flat"
                            className="text-xs"
                          >
                            {detail}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Content Preview */}
      {generatedContent.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Content Preview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generatedContent.slice(0, 4).map((content) => (
              <Card
                key={content.id}
                className="border border-gray-200 dark:border-gray-700"
              >
                <CardBody className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Chip size="sm" variant="flat" color="secondary">
                      {content.platform}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={content.status === "approved" ? "success" : "warning"}
                    >
                      {content.status}
                    </Chip>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {content.content}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* What Happens Next */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardBody className="p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            What happens next?
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Your Content Factory settings will be saved</li>
            <li>• AI will use your templates and brand voice to generate content</li>
            <li>• You can always modify these settings later</li>
            <li>• Next: Connect your social accounts in the Distribute phase</li>
          </ul>
        </CardBody>
      </Card>

      {/* Confirmation */}
      <div className="flex items-center justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <Checkbox
          isSelected={data.confirmed || false}
          onValueChange={(checked) => updateData({ confirmed: checked })}
          size="lg"
        >
          <span className="text-gray-700 dark:text-gray-300">
            I've reviewed my Content Factory settings and I'm ready to proceed
          </span>
        </Checkbox>
      </div>

      {!allComplete && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
          Some sections are incomplete. Please review and fill in the required
          fields.
        </p>
      )}
    </div>
  );
}
