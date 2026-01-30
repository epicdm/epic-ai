"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText, Sparkles, X } from "lucide-react";
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
    structure: "Hook \u2192 Insight \u2192 Examples \u2192 Call-to-action",
    contentType: "text",
    platforms: ["linkedin", "twitter"],
  },
  {
    name: "Tips & How-To",
    structure: "Problem \u2192 3-5 Tips \u2192 Summary",
    contentType: "text",
    platforms: ["twitter", "linkedin", "instagram"],
  },
  {
    name: "Story/Case Study",
    structure: "Challenge \u2192 Action \u2192 Result \u2192 Lesson",
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

  const togglePlatform = (platformId: string) => {
    const current = newTemplate.platforms || [];
    const updated = current.includes(platformId)
      ? current.filter((p) => p !== platformId)
      : [...current, platformId];
    setNewTemplate((prev) => ({ ...prev, platforms: updated }));
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
          <Button onClick={addDefaultTemplates}>
            <Sparkles className="w-4 h-4 mr-2" />
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
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.structure}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">
                      {template.contentType}
                    </Badge>
                    {template.platforms.map((p) => (
                      <Badge key={p} variant="outline">
                        {PLATFORM_OPTIONS.find((opt) => opt.id === p)?.label || p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTemplate(template.id!)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdding ? (
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Product Announcement"
                value={newTemplate.name || ""}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="template-structure">Structure</Label>
              <Textarea
                id="template-structure"
                placeholder="e.g., Hook \u2192 Problem \u2192 Solution \u2192 CTA"
                value={newTemplate.structure || ""}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, structure: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Content Type</p>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPE_OPTIONS.map((type) => (
                    <Badge
                      key={type.id}
                      variant={
                        newTemplate.contentType === type.id ? "default" : "outline"
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
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`platform-${p.id}`}
                        checked={(newTemplate.platforms || []).includes(p.id)}
                        onCheckedChange={() => togglePlatform(p.id)}
                      />
                      <Label htmlFor={`platform-${p.id}`} className="text-sm cursor-pointer">
                        {p.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                onClick={addTemplate}
                disabled={!newTemplate.name || !newTemplate.structure}
              >
                Add Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        templates.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Template
          </Button>
        )
      )}
    </div>
  );
}
