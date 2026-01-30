"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Sparkles, Wand2 } from "lucide-react";
import { brandTemplates, type BrandTemplate } from "@/lib/brand-brain/templates";

interface TemplatePickerProps {
  brandId: string;
  onTemplateApplied?: () => void;
}

export function TemplatePickerButton({ brandId, onTemplateApplied }: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BrandTemplate | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || selectedTemplate.id === "custom") return;

    setApplying(true);
    try {
      const response = await fetch("/api/brand-brain/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          templateId: selectedTemplate.id,
          templateData: {
            voiceTone: selectedTemplate.voiceTone,
            writingStyle: selectedTemplate.writingStyle,
            emojiStyle: selectedTemplate.emojiStyle,
            ctaStyle: selectedTemplate.ctaStyle,
            contentPillars: selectedTemplate.contentPillars,
            targetAudience: selectedTemplate.targetAudience,
            suggestedHashtags: selectedTemplate.suggestedHashtags,
            sampleValues: selectedTemplate.sampleValues,
          },
          replaceExisting,
        }),
      });

      if (response.ok) {
        onClose();
        // Call callback instead of full page reload
        if (onTemplateApplied) {
          onTemplateApplied();
        } else {
          // Fallback to reload if no callback provided
          window.location.reload();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to apply template");
      }
    } catch (error) {
      console.error("Error applying template:", error);
      alert("Failed to apply template");
    } finally {
      setApplying(false);
    }
  };

  // Filter out "custom" template for applying to existing brands
  const templates = brandTemplates.filter((t) => t.id !== "custom");

  return (
    <>
      <Button
        variant="secondary"
        onClick={onOpen}
      >
        Apply Template
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent>
          <DialogHeader className="flex flex-col gap-1"><DialogTitle>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Apply Brand Template</span>
            </div>
            <p className="text-sm font-normal text-gray-500">
              Choose a business type to pre-fill your Brand Brain settings
            </p>
          </DialogTitle></DialogHeader>

          <div className="py-4">
            <div style={{overflowY:"auto"}} className="max-h-[400px]">
              <div className="grid grid-cols-3 gap-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                   
                   
                    className={`transition-all ${
                      selectedTemplate?.id === template.id
                        ? "border-2 border-primary bg-primary/5"
                        : "border-2 border-transparent"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-3 text-center">
                      <span className="text-2xl mb-1 block">{template.icon}</span>
                      <p className="font-semibold text-xs text-gray-900 dark:text-white">
                        {template.name}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  <div>
                    <p className="font-semibold">{selectedTemplate.name}</p>
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Voice:</span>{" "}
                    <span className="font-medium capitalize">{selectedTemplate.voiceTone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Style:</span>{" "}
                    <span className="font-medium capitalize">{selectedTemplate.writingStyle}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Emojis:</span>{" "}
                    <span className="font-medium capitalize">{selectedTemplate.emojiStyle}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">CTA:</span>{" "}
                    <span className="font-medium capitalize">{selectedTemplate.ctaStyle}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Content Pillars:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.contentPillars.map((pillar) => (
                      <span
                        key={pillar}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {pillar}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">Replace existing settings?</p>
                    <p className="text-xs text-gray-500">
                      If off, template data will be merged with existing
                    </p>
                  </div>
                  <Switch
                    size="sm"
                    checked={replaceExisting}
                    onCheckedChange={setReplaceExisting}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!selectedTemplate || applying}
              onClick={handleApplyTemplate}
            >
              {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
