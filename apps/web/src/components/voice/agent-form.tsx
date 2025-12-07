"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Slider,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
}

interface AgentFormProps {
  brands: Brand[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    brandId: string;
    systemPrompt: string | null;
    greeting: string | null;
    llmProvider: string;
    llmModel: string;
    ttsProvider: string;
    sttProvider: string;
    voiceSettings: { voiceId?: string; temperature?: number };
    transferNumber: string | null;
    isActive: boolean;
  };
}

const LLM_PROVIDERS = [
  { key: "openai", label: "OpenAI" },
  { key: "anthropic", label: "Anthropic" },
];

const LLM_MODELS = {
  openai: [
    { key: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { key: "gpt-4o", label: "GPT-4o" },
    { key: "gpt-4o-mini", label: "GPT-4o Mini" },
    { key: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { key: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    { key: "claude-3-opus", label: "Claude 3 Opus" },
  ],
};

const TTS_PROVIDERS = [
  { key: "openai", label: "OpenAI TTS" },
  { key: "elevenlabs", label: "ElevenLabs" },
  { key: "cartesia", label: "Cartesia" },
  { key: "deepgram", label: "Deepgram" },
];

const OPENAI_VOICES = [
  { key: "alloy", label: "Alloy" },
  { key: "echo", label: "Echo" },
  { key: "fable", label: "Fable" },
  { key: "onyx", label: "Onyx" },
  { key: "nova", label: "Nova" },
  { key: "shimmer", label: "Shimmer" },
];

export function AgentForm({ brands, initialData }: AgentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    brandId: initialData?.brandId || brands[0]?.id || "",
    llmProvider: initialData?.llmProvider || "openai",
    llmModel: initialData?.llmModel || "gpt-4o-mini",
    ttsProvider: initialData?.ttsProvider || "openai",
    sttProvider: initialData?.sttProvider || "deepgram",
    voiceId: initialData?.voiceSettings?.voiceId || "nova",
    systemPrompt: initialData?.systemPrompt ||
      "You are a helpful AI assistant for our company. Be friendly, professional, and concise. Help callers with their questions and guide them to the right resources.",
    greeting: initialData?.greeting || "Hello! Thanks for calling. How can I help you today?",
    temperature: initialData?.voiceSettings?.temperature || 0.7,
    transferNumber: initialData?.transferNumber || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData
        ? `/api/voice/agents/${initialData.id}`
        : "/api/voice/agents";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          voiceSettings: {
            voiceId: formData.voiceId,
            temperature: formData.temperature,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save agent");
      }

      router.push("/dashboard/voice");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const currentModels = LLM_MODELS[formData.llmProvider as keyof typeof LLM_MODELS] || LLM_MODELS.openai;

  return (
    <div className="space-y-8">
      <PageHeader
        title={initialData ? "Edit Agent" : "Create Voice Agent"}
        description="Configure your AI voice agent's personality and behavior."
        actions={
          <Button
            as={Link}
            href="/dashboard/voice"
            variant="bordered"
            startContent={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardBody className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardBody>
          </Card>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Agent Name"
              placeholder="e.g., Sales Assistant, Support Bot"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              isRequired
            />

            <Textarea
              label="Description"
              placeholder="Brief description of what this agent does"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Select
              label="Brand"
              selectedKeys={formData.brandId ? [formData.brandId] : []}
              onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              isRequired
            >
              {brands.map((brand) => (
                <SelectItem key={brand.id}>{brand.name}</SelectItem>
              ))}
            </Select>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Active
                </p>
                <p className="text-sm text-gray-500">
                  Enable this agent to receive calls
                </p>
              </div>
              <Switch
                isSelected={formData.isActive}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">AI Configuration</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="LLM Provider"
                selectedKeys={[formData.llmProvider]}
                onChange={(e) => setFormData({
                  ...formData,
                  llmProvider: e.target.value,
                  llmModel: LLM_MODELS[e.target.value as keyof typeof LLM_MODELS]?.[0]?.key || "gpt-4o-mini"
                })}
              >
                {LLM_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.key}>{provider.label}</SelectItem>
                ))}
              </Select>

              <Select
                label="Model"
                selectedKeys={[formData.llmModel]}
                onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
              >
                {currentModels.map((model) => (
                  <SelectItem key={model.key}>{model.label}</SelectItem>
                ))}
              </Select>
            </div>

            <Textarea
              label="System Prompt"
              placeholder="Instructions for how the AI should behave..."
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              minRows={4}
              isRequired
            />

            <Textarea
              label="Greeting Message"
              placeholder="What the agent says when answering a call"
              value={formData.greeting}
              onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
              minRows={2}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature: {formData.temperature}
              </label>
              <Slider
                step={0.1}
                minValue={0}
                maxValue={1}
                value={formData.temperature}
                onChange={(value) =>
                  setFormData({ ...formData, temperature: value as number })
                }
                className="max-w-md"
              />
              <p className="text-xs text-gray-500">
                Lower = more focused, Higher = more creative
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Voice Settings</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Text-to-Speech Provider"
              selectedKeys={[formData.ttsProvider]}
              onChange={(e) => setFormData({ ...formData, ttsProvider: e.target.value })}
            >
              {TTS_PROVIDERS.map((provider) => (
                <SelectItem key={provider.key}>{provider.label}</SelectItem>
              ))}
            </Select>

            {formData.ttsProvider === "openai" && (
              <Select
                label="Voice"
                selectedKeys={formData.voiceId ? [formData.voiceId] : []}
                onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
              >
                {OPENAI_VOICES.map((voice) => (
                  <SelectItem key={voice.key}>{voice.label}</SelectItem>
                ))}
              </Select>
            )}

            {formData.ttsProvider !== "openai" && (
              <Input
                label="Voice ID"
                placeholder="Provider-specific voice ID"
                value={formData.voiceId}
                onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
              />
            )}
          </CardBody>
        </Card>

        {/* Call Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Call Settings</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Transfer Number"
              placeholder="+1234567890"
              value={formData.transferNumber}
              onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
              description="Number to transfer calls to when requested or escalation needed"
            />
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            as={Link}
            href="/dashboard/voice"
            variant="bordered"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={loading}
            startContent={!loading && <Save className="w-4 h-4" />}
          >
            {initialData ? "Save Changes" : "Create Agent"}
          </Button>
        </div>
      </form>
    </div>
  );
}
