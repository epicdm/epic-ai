"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Chip,
} from "@heroui/react";
import { Plus, Trash2, FileText, Sparkles } from "lucide-react";
import type { CreateWizardData, ContentTemplateData, ContentType } from "@/lib/flywheel/types";

interface TemplatesStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
}

const PLATFORM_OPTIONS = [
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
];

const CONTENT_TYPE_OPTIONS: { id: ContentType; label: string }[] = [
  { id: "text", label: "Text Post" },
  { id: "image", label: "Image Post" },
  { id: "carousel", label: "Carousel" },
];

const DEFAULT_TEMPLATES: Omit<ContentTemplateData, "id">[] = [
  {
    name: "Thought Leadership",
    structure: "Hook → Insight → Examples → Call-to-action",
    contentType: "text",
    platforms: ["linkedin", "twitter"],
  },
  {
    name: "Tips & How-To",
    structure: "Problem → 3-5 Tips → Summary",
    contentType: "text",
    platforms: ["twitter", "linkedin", "instagram"],
  },
  {
    name: "Story/Case Study",
    structure: "Challenge → Action → Result → Lesson",
    contentType: "text",
    platforms: ["linkedin", "facebook"],
  },
];

export function TemplatesStep({ data, updateData }: TemplatesStepProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ContentTemplateData>>({
    platforms: [],
    contentType: "text",
  });

  const templates = data.templates || [];

  const addDefaultTemplates = () => {
    const newTemplates = DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `template-${Date.now()}-${i}`,
    }));
    updateData({ templates: [...templates, ...newTemplates] });
  };

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.structure) return;

    const template: ContentTemplateData = {
      id: `template-${Date.now()}`,
      name: newTemplate.name,
      structure: newTemplate.structure,
      contentType: newTemplate.contentType || "text",
      platforms: newTemplate.platforms || [],
    };

    updateData({ templates: [...templates, template] });
    setNewTemplate({ platforms: [], contentType: "text" });
    setIsAdding(false);
  };

  const removeTemplate = (id: string) => {
    updateData({
      templates: templates.filter((t) => t.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Content templates define the structure of your posts. Choose from
        defaults or create your own.
      </p>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No templates yet. Start with our recommended templates.
          </p>
          <Button
            color="primary"
            startContent={<Sparkles className="w-4 h-4" />}
            onPress={addDefaultTemplates}
          >
            Add Recommended Templates
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="border border-gray-200 dark:border-gray-700"
          >
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.structure}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Chip size="sm" variant="flat" color="primary">
                      {template.contentType}
                    </Chip>
                    {template.platforms.map((p) => (
                      <Chip key={p} size="sm" variant="bordered">
                        {PLATFORM_OPTIONS.find((opt) => opt.id === p)?.label || p}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => removeTemplate(template.id!)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {isAdding ? (
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardBody className="p-4 space-y-4">
            <Input
              label="Template Name"
              placeholder="e.g., Product Announcement"
              value={newTemplate.name || ""}
              onValueChange={(value) =>
                setNewTemplate((prev) => ({ ...prev, name: value }))
              }
            />

            <Textarea
              label="Structure"
              placeholder="e.g., Hook → Problem → Solution → CTA"
              value={newTemplate.structure || ""}
              onValueChange={(value) =>
                setNewTemplate((prev) => ({ ...prev, structure: value }))
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Content Type</p>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPE_OPTIONS.map((type) => (
                    <Chip
                      key={type.id}
                      variant={
                        newTemplate.contentType === type.id ? "solid" : "bordered"
                      }
                      color={
                        newTemplate.contentType === type.id ? "primary" : "default"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setNewTemplate((prev) => ({
                          ...prev,
                          contentType: type.id,
                        }))
                      }
                    >
                      {type.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Platforms</p>
                <CheckboxGroup
                  value={newTemplate.platforms || []}
                  onValueChange={(value) =>
                    setNewTemplate((prev) => ({ ...prev, platforms: value }))
                  }
                  orientation="horizontal"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <Checkbox key={p.id} value={p.id} size="sm">
                      {p.label}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="light" onPress={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={addTemplate}
                isDisabled={!newTemplate.name || !newTemplate.structure}
              >
                Add Template
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        templates.length > 0 && (
          <Button
            variant="bordered"
            className="w-full"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => setIsAdding(true)}
          >
            Create Custom Template
          </Button>
        )
      )}
    </div>
  );
}
