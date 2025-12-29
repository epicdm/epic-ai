"use client";

import { Card, CardBody, Checkbox, CheckboxGroup } from "@heroui/react";
import {
  Type,
  Image,
  Layers,
  Video,
  Clock,
  BarChart2,
  LucideIcon,
} from "lucide-react";
import type { CreateWizardData, ContentType } from "@/lib/flywheel/types";

interface ContentTypesStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
}

const CONTENT_TYPE_OPTIONS: {
  id: ContentType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "text",
    label: "Text Posts",
    description: "Standard text-only updates for quick thoughts and insights",
    icon: Type,
  },
  {
    id: "image",
    label: "Image Posts",
    description: "Single image with caption for visual storytelling",
    icon: Image,
  },
  {
    id: "carousel",
    label: "Carousels",
    description: "Multi-image slideshows for step-by-step content",
    icon: Layers,
  },
  {
    id: "video",
    label: "Videos",
    description: "Video content for higher engagement",
    icon: Video,
  },
  {
    id: "story",
    label: "Stories",
    description: "24-hour ephemeral content for behind-the-scenes",
    icon: Clock,
  },
  {
    id: "poll",
    label: "Polls",
    description: "Interactive voting posts to engage your audience",
    icon: BarChart2,
  },
];

export function ContentTypesStep({ data, updateData }: ContentTypesStepProps) {
  const enabledTypes = data.enabledTypes || ["text"];

  const handleChange = (values: string[]) => {
    updateData({ enabledTypes: values as ContentType[] });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Select the types of content you want AI to create. You can enable or
        disable these at any time.
      </p>

      <CheckboxGroup
        value={enabledTypes}
        onValueChange={handleChange}
        classNames={{
          wrapper: "gap-4",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTENT_TYPE_OPTIONS.map((type) => {
            const Icon = type.icon;
            const isSelected = enabledTypes.includes(type.id);

            return (
              <Card
                key={type.id}
                className={`border transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                isPressable
                onPress={() => {
                  if (isSelected) {
                    handleChange(enabledTypes.filter((t) => t !== type.id));
                  } else {
                    handleChange([...enabledTypes, type.id]);
                  }
                }}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-blue-100 dark:bg-blue-800"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </h4>
                        <Checkbox value={type.id} isSelected={isSelected} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </CheckboxGroup>

      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> Start with Text and Image posts, then expand as
          you get comfortable. AI will adapt content to each format.
        </p>
      </div>

      {enabledTypes.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
          Please select at least one content type to continue.
        </p>
      )}
    </div>
  );
}
