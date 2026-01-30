"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Save, DollarSign, Info, Phone, Trash2, Plus, AlertTriangle, Wand2, Sparkles } from "lucide-react";
import Link from "next/link";
import { PRICING } from "@/components/ui/cost-estimator";
import { trackEvent } from "@/lib/analytics";
import { AgentToolsEditor } from "@/components/voice/agent-tools-editor";
import { AgentKnowledgeBasesEditor } from "@/components/voice/agent-knowledge-bases-editor";

interface Brand {
  id: string;
  name: string;
}

interface PhoneNumber {
  id: string;
  number: string;
  isActive: boolean;
  status: string | null;
}

interface AgentFormProps {
  brands: Brand[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    brandId: string | null;
    systemPrompt: string | null;
    greeting: string | null;
    llmProvider: string;
    llmModel: string;
    ttsProvider: string;
    sttProvider: string;
    voiceSettings: { voiceId?: string; temperature?: number };
    transferNumber: string | null;
    isActive: boolean;
    phoneNumbers?: PhoneNumber[];
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

// ElevenLabs premium voices - ultra-low 75ms latency
const ELEVENLABS_VOICES = [
  { key: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (American Female)", description: "Warm, professional" },
  { key: "29vD33N1CtxCmqQRPOHJ", label: "Drew (American Male)", description: "Confident, articulate" },
  { key: "2EiwWnXFnvU5JabPnv8n", label: "Clyde (American Male)", description: "Deep, authoritative" },
  { key: "5Q0t7uMcjvnagumLfvZi", label: "Paul (American Male)", description: "Calm, reassuring" },
  { key: "AZnzlk1XvdvUeBnXmlld", label: "Domi (American Female)", description: "Energetic, friendly" },
  { key: "CYw3kZ02Hs0563khs1Fj", label: "Dave (British Male)", description: "Conversational, warm" },
  { key: "D38z5RcWu1voky8WS1ja", label: "Fin (Irish Male)", description: "Approachable, clear" },
  { key: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (American Female)", description: "Soft, expressive" },
  { key: "ErXwobaYiN019PkySvjV", label: "Antoni (American Male)", description: "Crisp, well-paced" },
  { key: "GBv7mTt0atIp3Br8iCZE", label: "Thomas (American Male)", description: "Calm, meditative" },
  { key: "IKne3meq5aSn9XLyUdCD", label: "Charlie (Australian Male)", description: "Casual, natural" },
  { key: "JBFqnCBsd6RMkjVDRZzb", label: "George (British Male)", description: "Warm, storytelling" },
  { key: "MF3mGyEYCl7XYWbV9V6O", label: "Emily (American Female)", description: "Young, cheerful" },
  { key: "N2lVS1w4EtoT3dr4eOWO", label: "Callum (Transatlantic Male)", description: "Intense, authoritative" },
  { key: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (American Male)", description: "Articulate, neutral" },
  { key: "XB0fDUnXU5powFXDhCwa", label: "Charlotte (Swedish Female)", description: "Seductive, calm" },
  { key: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice (British Female)", description: "Confident, middle-aged" },
  { key: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (American Female)", description: "Warm, friendly" },
  { key: "ZQe5CZNOzWyzPSCn5a3c", label: "James (Australian Male)", description: "Calm, authoritative" },
  { key: "bVMeCyTHy58xNoL34h3p", label: "Jeremy (American Male)", description: "Excited, narrative" },
  { key: "cgSgspJ2msm6clMCkdW9", label: "Jessica (American Female)", description: "Expressive, upbeat" },
  { key: "cjVigY5qzO86Huf0OWal", label: "Eric (American Male)", description: "Friendly, approachable" },
  { key: "iP95p4xoKVk53GoZ742B", label: "Chris (American Male)", description: "Casual, conversational" },
  { key: "jBpfuIE2acCO8z3wKNLl", label: "Gigi (American Female)", description: "Childlike, animated" },
  { key: "jsCqWAovK2LkecY7zXl4", label: "Freya (American Female)", description: "Expressive, overly-American" },
  { key: "nPczCjzI2devNBz1zQrb", label: "Brian (American Male)", description: "Deep, narrator" },
  { key: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (British Male)", description: "Deep, authoritative" },
  { key: "pFZP5JQG7iQjIQuC4Bku", label: "Lily (British Female)", description: "Warm, narrator" },
  { key: "pMsXgVXv3BLzUgSXRplE", label: "Serena (American Female)", description: "Pleasant, soft" },
  { key: "pNInz6obpgDQGcFmaJgB", label: "Adam (American Male)", description: "Deep, narrator" },
  { key: "piTKgcLEGmPE4e6mEKli", label: "Nicole (American Female)", description: "Whisper, ASMR" },
  { key: "t0jbNlBVZ17f02VDIeMI", label: "Jessie (American Male)", description: "Raspy, conversational" },
  { key: "yoZ06aMxZJJ28mfd3POQ", label: "Sam (American Male)", description: "Raspy, young" },
  { key: "z9fAnlkpzviPz146aGWa", label: "Glinda (American Female)", description: "Witch, narrative" },
  { key: "zrHiDhphv9ZnVXBqCLjz", label: "Mimi (Swedish Female)", description: "Childlike, animated" },
];

// Cartesia voices
const CARTESIA_VOICES = [
  { key: "a0e99841-438c-4a64-b679-ae501e7d6091", label: "Barbershop Man" },
  { key: "156fb8d2-335b-4950-9cb3-a2d33f2c5454", label: "Confident British Man" },
  { key: "248be419-c632-4f23-adf1-5324ed7dbf1d", label: "Helpful Woman" },
  { key: "69267136-1bdc-412f-ad78-0caad210fb40", label: "Friendly Sidekick" },
  { key: "79a125e8-cd45-4c13-8a67-188112f4dd22", label: "British Lady" },
  { key: "87748186-23bb-4c5e-a1ff-e6b0b899adf8", label: "Sweet Lady" },
  { key: "95856005-0332-41b0-935f-352e296aa0df", label: "Classy British Man" },
  { key: "a167e0f3-df7e-4d52-a9c3-f949145f1366", label: "Newsman" },
  { key: "c45bc5ec-dc68-4feb-8829-6e6b2748095d", label: "Midwestern Woman" },
  { key: "d46abd1d-2e55-43f6-9acb-e6b6d098c4d2", label: "British Narrator Lady" },
  { key: "e3827ec5-697a-4b7c-9704-1a8eb0f9b99b", label: "Sportscaster Man" },
];

// Deepgram voices
const DEEPGRAM_VOICES = [
  { key: "aura-asteria-en", label: "Asteria (Female)" },
  { key: "aura-luna-en", label: "Luna (Female)" },
  { key: "aura-stella-en", label: "Stella (Female)" },
  { key: "aura-athena-en", label: "Athena (Female)" },
  { key: "aura-hera-en", label: "Hera (Female)" },
  { key: "aura-orion-en", label: "Orion (Male)" },
  { key: "aura-arcas-en", label: "Arcas (Male)" },
  { key: "aura-perseus-en", label: "Perseus (Male)" },
  { key: "aura-angus-en", label: "Angus (Male, Irish)" },
  { key: "aura-orpheus-en", label: "Orpheus (Male)" },
  { key: "aura-helios-en", label: "Helios (Male, British)" },
  { key: "aura-zeus-en", label: "Zeus (Male)" },
];

export function AgentForm({ brands, initialData }: AgentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState(initialData?.phoneNumbers || []);
  const [deletePhoneOption, setDeletePhoneOption] = useState<"pool" | "release">("pool");
  const [useBrandVoice, setUseBrandVoice] = useState(false);
  const [loadingBrandVoice, setLoadingBrandVoice] = useState(false);
  const [brandVoiceApplied, setBrandVoiceApplied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
          // Map voiceId to ttsVoiceId for the new TTS provider system
          ttsVoiceId: formData.voiceId,
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

      const responseData = await response.json();

      // Track analytics event
      if (initialData) {
        trackEvent("voice_agent_edited", { agent_id: initialData.id });
      } else {
        const agentId = responseData.id || responseData.agent?.id || "unknown";
        const phoneNumber = responseData.phoneNumbers?.[0]?.number;
        const provisioningError = responseData.provisioningError;

        trackEvent("voice_agent_created", {
          agent_id: agentId,
          llm_provider: formData.llmProvider,
          tts_provider: formData.ttsProvider,
          phone_provisioned: !!phoneNumber,
          provisioning_error: provisioningError || undefined,
        });

        // Log provisioning result
        if (phoneNumber) {
          console.log(`Agent created with phone number: ${phoneNumber}`);
        } else if (provisioningError) {
          console.warn(`Agent created but phone provisioning failed: ${provisioningError}`);
        }
      }

      router.push("/dashboard/voice");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!initialData) return;

    setDeleting(true);
    setError(null);

    try {
      const deletePhoneNumbers = deletePhoneOption === "release";
      const url = `/api/voice/agents/${initialData.id}?deletePhoneNumbers=${deletePhoneNumbers}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete agent");
      }

      trackEvent("voice_agent_deleted", {
        agent_id: initialData.id,
        phone_numbers_released: deletePhoneNumbers,
        numbers_count: phoneNumbers.length,
      });

      // Log results
      if (data.phoneNumbersReleased?.length > 0) {
        console.log(`Released phone numbers: ${data.phoneNumbersReleased.join(", ")}`);
      }
      if (data.phoneNumbersPooled?.length > 0) {
        console.log(`Returned to pool: ${data.phoneNumbersPooled.join(", ")}`);
      }
      if (data.cleanupErrors?.length > 0) {
        console.warn("Cleanup errors:", data.cleanupErrors);
      }

      setIsDeleteModalOpen(false);
      router.push("/dashboard/voice");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  const handleProvisionPhone = async () => {
    if (!initialData) return;

    setProvisioning(true);
    setError(null);

    try {
      const response = await fetch(`/api/voice/agents/${initialData.id}/provision-phone`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to provision phone number");
      }

      const data = await response.json();

      if (data.phoneNumber) {
        setPhoneNumbers([{
          id: data.phoneNumber.id,
          number: data.phoneNumber.number,
          isActive: true,
          status: "active",
        }]);
        trackEvent("voice_phone_provisioned", {
          agent_id: initialData.id,
          phone_number: data.phoneNumber.number,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision phone number");
    } finally {
      setProvisioning(false);
    }
  };

  const currentModels = LLM_MODELS[formData.llmProvider as keyof typeof LLM_MODELS] || LLM_MODELS.openai;

  // Fetch and apply Brand Voice configuration
  const handleApplyBrandVoice = async () => {
    if (!formData.brandId) {
      setError("Please select a brand first");
      return;
    }

    setLoadingBrandVoice(true);
    setError(null);

    try {
      const response = await fetch(`/api/voice/agents/auto-config?brandId=${formData.brandId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to fetch brand voice config");
      }

      const data = await response.json();
      const { config } = data;

      // Apply the auto-generated configuration
      setFormData((prev) => ({
        ...prev,
        systemPrompt: config.systemPrompt,
        greeting: config.greeting,
        temperature: config.temperature,
        ttsProvider: config.suggestedVoice.provider,
        voiceId: config.suggestedVoice.voiceId,
      }));

      setBrandVoiceApplied(true);
      setUseBrandVoice(true);

      trackEvent("brand_voice_applied", {
        brand_id: formData.brandId,
        voice_provider: config.suggestedVoice.provider,
        voice_id: config.suggestedVoice.voiceId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply brand voice");
      setUseBrandVoice(false);
    } finally {
      setLoadingBrandVoice(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={initialData ? "Edit Agent" : "Create Voice Agent"}
        description="Configure your AI voice agent's personality and behavior."
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/voice">
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                placeholder="e.g., Sales Assistant, Support Bot"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of what this agent does"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) => {
                  setFormData({ ...formData, brandId: value });
                  setBrandVoiceApplied(false); // Reset when brand changes
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Use Brand Voice - One Brain, Many Voices */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      Use Brand Voice
                    </p>
                    {brandVoiceApplied && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Applied
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Auto-configure this agent using your Brand Brain settings.
                    System prompt, greeting, voice, and personality will match your brand.
                  </p>
                </div>
                <Button
                  variant={brandVoiceApplied ? "secondary" : "secondary"}
                  size="sm"
                  disabled={loadingBrandVoice || !formData.brandId}
                  onClick={handleApplyBrandVoice}
                >
                  {brandVoiceApplied ? "Re-apply" : "Apply Brand Voice"}
                </Button>
              </div>
              {brandVoiceApplied && (
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                  Brand voice applied. You can still customize the settings below.
                </p>
              )}
            </div>

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
                checked={formData.isActive}
                onCheckedChange={(value) =>
                  setFormData({ ...formData, isActive: value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone Numbers - Only shown for existing agents */}
        {initialData && (
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <h2 className="text-lg font-semibold">Assigned Phone Numbers</h2>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/dashboard/voice/numbers">
                  Manage Numbers
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {phoneNumbers && phoneNumbers.length > 0 ? (
                <div className="space-y-3">
                  {phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {phone.number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {phone.status === "active" ? "Active" : phone.status || "Unknown status"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={phone.isActive ? "default" : "secondary"}
                        className={phone.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                      >
                        {phone.isActive ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No phone numbers assigned</p>
                  <p className="text-sm mt-1 mb-4">
                    Provision a phone number to receive inbound calls.
                  </p>
                  <Button
                    size="sm"
                    disabled={provisioning}
                    onClick={handleProvisionPhone}
                  >
                    Provision Phone Number
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">AI Configuration</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LLM Provider</Label>
                <Select
                  value={formData.llmProvider}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    llmProvider: value,
                    llmModel: LLM_MODELS[value as keyof typeof LLM_MODELS]?.[0]?.key || "gpt-4o-mini"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.key} value={provider.key}>{provider.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={formData.llmModel}
                  onValueChange={(value) => setFormData({ ...formData, llmModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModels.map((model) => (
                      <SelectItem key={model.key} value={model.key}>{model.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="Instructions for how the AI should behave..."
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Greeting Message</Label>
              <Textarea
                placeholder="What the agent says when answering a call"
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: Number(e.target.value) })
                }
                className="w-full max-w-md"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Voice Settings</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Text-to-Speech Provider</Label>
              <Select
                value={formData.ttsProvider}
                onValueChange={(value) => {
                  const provider = value;
                  let defaultVoice = "";
                  switch (provider) {
                    case "openai": defaultVoice = "nova"; break;
                    case "elevenlabs": defaultVoice = "21m00Tcm4TlvDq8ikWAM"; break; // Rachel
                    case "cartesia": defaultVoice = "248be419-c632-4f23-adf1-5324ed7dbf1d"; break; // Helpful Woman
                    case "deepgram": defaultVoice = "aura-asteria-en"; break; // Asteria
                    default: defaultVoice = "";
                  }
                  setFormData({ ...formData, ttsProvider: provider, voiceId: defaultVoice });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select TTS provider" />
                </SelectTrigger>
                <SelectContent>
                  {TTS_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.key} value={provider.key}>{provider.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.ttsProvider === "openai" && (
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_VOICES.map((voice) => (
                      <SelectItem key={voice.key} value={voice.key}>{voice.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.ttsProvider === "elevenlabs" && (
              <>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select
                    value={formData.voiceId}
                    onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_VOICES.map((voice) => (
                        <SelectItem key={voice.key} value={voice.key}>
                          <div className="flex flex-col">
                            <span>{voice.label}</span>
                            <span className="text-xs text-muted-foreground">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">ElevenLabs offers 75ms ultra-low latency voices</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Ultra-low 75ms latency for natural conversations
                </div>
              </>
            )}

            {formData.ttsProvider === "cartesia" && (
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTESIA_VOICES.map((voice) => (
                      <SelectItem key={voice.key} value={voice.key}>{voice.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.ttsProvider === "deepgram" && (
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEEPGRAM_VOICES.map((voice) => (
                      <SelectItem key={voice.key} value={voice.key}>{voice.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Call Settings</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Transfer Number</Label>
              <Input
                placeholder="+1234567890"
                value={formData.transferNumber}
                onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Number to transfer calls to when requested or escalation needed</p>
            </div>
          </CardContent>
        </Card>

        {/* Function Calling Tools - Only shown for existing agents */}
        {initialData && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Function Calling Tools</h2>
            </CardHeader>
            <CardContent>
              <AgentToolsEditor agentId={initialData.id} />
            </CardContent>
          </Card>
        )}

        {/* RAG Knowledge Bases - Only shown for existing agents */}
        {initialData && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Knowledge Bases (RAG)</h2>
            </CardHeader>
            <CardContent>
              <AgentKnowledgeBasesEditor agentId={initialData.id} />
            </CardContent>
          </Card>
        )}

        {/* Cost Information */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-200 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Pricing Information</h2>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">Voice AI Calls</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Billed per minute of call duration
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                  ${PRICING.voice.perMinute.toFixed(2)}<span className="text-sm font-normal">/min</span>
                </p>
              </div>
            </div>

            <TooltipProvider>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Speech-to-Text</p>
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        ${PRICING.voice.breakdown.stt.toFixed(2)}/min
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Speech recognition to convert caller audio to text</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">AI Processing</p>
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        ${PRICING.voice.breakdown.llm.toFixed(2)}/min
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>AI processing and response generation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Text-to-Speech</p>
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        ${PRICING.voice.breakdown.tts.toFixed(2)}/min
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Convert AI responses to natural speech</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Telephony</p>
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        ${PRICING.voice.breakdown.telephony.toFixed(2)}/min
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Phone line and carrier costs</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="flex items-start gap-2 p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p>
                  <strong>Example:</strong> A 5-minute call costs approximately ${(5 * PRICING.voice.perMinute).toFixed(2)}.
                </p>
                <p className="mt-1">
                  <Link href="/dashboard/settings/usage" className="underline hover:no-underline">
                    View your usage dashboard
                  </Link>{" "}
                  for detailed cost tracking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-between gap-3">
          {initialData ? (
            <Button
              variant="destructive"
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete Agent
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/voice">
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {initialData ? "Save Changes" : "Create Agent"}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>Delete Agent</DialogTitle>
              <p className="text-sm text-muted-foreground font-normal">This action cannot be undone</p>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete <strong>{initialData?.name}</strong>?
            </p>

            {phoneNumbers.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                    This agent has <strong>{phoneNumbers.length}</strong> phone number{phoneNumbers.length > 1 ? "s" : ""} assigned:
                  </p>
                  <div className="space-y-2 mb-4">
                    {phoneNumbers.map((phone) => (
                      <div key={phone.id} className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-amber-600" />
                        <span className="font-mono">{phone.number}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                    What should happen to the phone number{phoneNumbers.length > 1 ? "s" : ""}?
                  </p>
                </div>

                <RadioGroup
                  value={deletePhoneOption}
                  onValueChange={(value) => setDeletePhoneOption(value as "pool" | "release")}
                  className="gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pool" id="pool" />
                    <Label htmlFor="pool">Return to pool</Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">Numbers remain available for other agents</p>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="release" id="release" />
                    <Label htmlFor="release" className="text-red-600 dark:text-red-400">Delete &amp; release numbers</Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">Delete from LiveKit and release from Magnus (permanent)</p>
                </RadioGroup>

                {deletePhoneOption === "release" && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>Warning:</strong> This will permanently release the phone number{phoneNumbers.length > 1 ? "s" : ""} from your account.
                      You may not be able to get the same number{phoneNumbers.length > 1 ? "s" : ""} back.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <p className="text-sm">No phone numbers assigned to this agent.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteConfirm}
            >
              {phoneNumbers.length > 0 && deletePhoneOption === "release"
                ? "Delete Agent & Numbers"
                : "Delete Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
