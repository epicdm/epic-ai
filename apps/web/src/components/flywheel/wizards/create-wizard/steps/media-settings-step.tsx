"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Switch,
  Input,
  Button,
  Chip,
} from "@heroui/react";
import { Image, Palette, Plus, X, Sparkles } from "lucide-react";
import type { CreateWizardData } from "@/lib/flywheel/types";

interface MediaSettingsStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
}

const IMAGE_STYLE_OPTIONS = [
  { id: "realistic", label: "Realistic", description: "Photo-realistic images" },
  { id: "artistic", label: "Artistic", description: "Creative and stylized" },
  { id: "minimalist", label: "Minimalist", description: "Clean and simple" },
  { id: "corporate", label: "Corporate", description: "Professional business style" },
  { id: "vibrant", label: "Vibrant", description: "Bold colors and energy" },
  { id: "custom", label: "Custom", description: "Define your own style" },
];

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export function MediaSettingsStep({ data, updateData }: MediaSettingsStepProps) {
  const [newColor, setNewColor] = useState("");

  const imageGeneration = data.imageGeneration ?? true;
  const imageStyle = data.imageStyle || "realistic";
  const brandColors = data.brandColors || [];

  const addColor = (color: string) => {
    if (color && !brandColors.includes(color.toUpperCase())) {
      updateData({
        brandColors: [...brandColors, color.toUpperCase()],
      });
    }
    setNewColor("");
  };

  const removeColor = (color: string) => {
    updateData({
      brandColors: brandColors.filter((c) => c !== color),
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Configure how AI generates images for your content. Brand colors help
        maintain visual consistency.
      </p>

      {/* AI Image Generation Toggle */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  AI Image Generation
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically create images for your posts using DALL-E
                </p>
              </div>
            </div>
            <Switch
              isSelected={imageGeneration}
              onValueChange={(value) => updateData({ imageGeneration: value })}
              size="lg"
            />
          </div>
        </CardBody>
      </Card>

      {/* Image Style Selection */}
      {imageGeneration && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="w-4 h-4" />
            Image Style
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {IMAGE_STYLE_OPTIONS.map((style) => (
              <Card
                key={style.id}
                className={`border cursor-pointer transition-all ${
                  imageStyle === style.id
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
                isPressable
                onPress={() => updateData({ imageStyle: style.id })}
              >
                <CardBody className="p-3 text-center">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {style.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {style.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Brand Colors */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Brand Colors
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add your brand colors for AI to use in generated images.
        </p>

        {/* Preset Colors */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => addColor(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                brandColors.includes(color)
                  ? "border-gray-900 dark:border-white scale-110"
                  : "border-transparent hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
              title={`Add ${color}`}
            />
          ))}
        </div>

        {/* Custom Color Input */}
        <div className="flex gap-2">
          <Input
            placeholder="#FF5733 or rgb(255, 87, 51)"
            value={newColor}
            onValueChange={setNewColor}
            startContent={
              <div
                className="w-4 h-4 rounded border"
                style={{
                  backgroundColor: newColor || "#ccc",
                }}
              />
            }
            classNames={{
              input: "text-sm",
            }}
          />
          <Button
            isIconOnly
            color="primary"
            variant="flat"
            onPress={() => addColor(newColor)}
            isDisabled={!newColor.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected Colors */}
        {brandColors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {brandColors.map((color) => (
              <Chip
                key={color}
                variant="flat"
                onClose={() => removeColor(color)}
                startContent={
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                }
                classNames={{
                  closeButton: "text-gray-500 hover:text-gray-700",
                }}
              >
                {color}
              </Chip>
            ))}
          </div>
        )}

        {brandColors.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No brand colors added yet. Click preset colors or add custom ones.
          </p>
        )}
      </div>

      {/* Preview Section */}
      {imageGeneration && brandColors.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Color Preview
            </h5>
            <div className="h-12 rounded-lg flex overflow-hidden">
              {brandColors.map((color, i) => (
                <div
                  key={color}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
