"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Checkbox, Chip } from "@heroui/react";
import { FileText, Image, Layers, Video, Clock, MessageSquare } from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface ContentTypesStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

type ContentType = "text" | "image" | "carousel" | "video" | "story" | "poll";

interface ContentTypeOption {
  id: ContentType;
  label: string;
  description: string;
  icon: React.ElementType;
  recommended: boolean;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    id: "text",
    label: "Text Posts",
    description: "Short-form written content",
    icon: FileText,
    recommended: true,
  },
  {
    id: "image",
    label: "Images",
    description: "Visual posts with captions",
    icon: Image,
    recommended: true,
  },
  {
    id: "carousel",
    label: "Carousels",
    description: "Multi-image swipeable posts",
    icon: Layers,
    recommended: false,
  },
  {
    id: "video",
    label: "Videos",
    description: "Short-form video content",
    icon: Video,
    recommended: false,
  },
  {
    id: "story",
    label: "Stories",
    description: "24-hour ephemeral content",
    icon: Clock,
    recommended: false,
  },
  {
    id: "poll",
    label: "Polls",
    description: "Interactive questions for engagement",
    icon: MessageSquare,
    recommended: false,
  },
];

export function ContentTypesStep({ data, updateData }: ContentTypesStepProps) {
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(
    (data.enabledContentTypes as ContentType[]) || ["text", "image"]
  );

  useEffect(() => {
    updateData({ enabledContentTypes: selectedTypes });
  }, [selectedTypes, updateData]);

  const handleToggle = (typeId: ContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const isValid = selectedTypes.length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Select Content Types
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose the formats you want to create. You can change this anytime.
        </p>
      </div>

      <div className="space-y-3">
        {CONTENT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedTypes.includes(type.id);

          return (
            <Card
              key={type.id}
              isPressable
              className={`transition-all ${
                isSelected
                  ? "border-2 border-primary bg-primary/5"
                  : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              }`}
              onPress={() => handleToggle(type.id)}
            >
              <CardBody className="flex flex-row items-center gap-4 py-4">
                <Checkbox
                  isSelected={isSelected}
                  onValueChange={() => handleToggle(type.id)}
                  size="lg"
                />
                <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </p>
                    {type.recommended && (
                      <Chip size="sm" color="primary" variant="flat">
                        Recommended
                      </Chip>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {selectedTypes.length} type{selectedTypes.length !== 1 ? "s" : ""} selected
        </span>
        {!isValid && (
          <span className="text-sm text-danger">
            Select at least one content type
          </span>
        )}
      </div>
    </div>
  );
}
