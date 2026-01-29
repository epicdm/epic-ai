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
  Tooltip,
  Chip,
} from "@heroui/react";
import {
  Wizard,
  useWizard,
  type WizardStep,
} from "@/components/ui/wizard/wizard";
import {
  ArrowLeft,
  Save,
  DollarSign,
  Info,
  User,
  Mic,
  Brain,
  CheckCircle,
  Phone,
  Building,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { PRICING } from "@/components/ui/cost-estimator";
import { trackEvent } from "@/lib/analytics";

interface Brand {
  id: string;
  name: string;
}

interface AgentWizardProps {
  brands: Brand[];
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

const wizardSteps: WizardStep[] = [
  {
    id: "basic",
    title: "Basic Info",
    description: "Name and brand",
    icon: <User className="w-4 h-4" />,
  },
  {
    id: "phone",
    title: "Phone Number",
    description: "Provision phone",
    icon: <Phone className="w-4 h-4" />,
  },
  {
    id: "voice",
    title: "Voice Settings",
    description: "Voice and speech",
    icon: <Mic className="w-4 h-4" />,
  },
  {
    id: "ai",
    title: "AI Configuration",
    description: "Behavior and personality",
    icon: <Brain className="w-4 h-4" />,
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Confirm settings",
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

export function AgentWizard({ brands }: AgentWizardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    brandId: brands[0]?.id || "",
    provisionPhone: true,
    llmProvider: "openai",
    llmModel: "gpt-4o-mini",
    ttsProvider: "openai",
    sttProvider: "deepgram",
    voiceId: "nova",
    systemPrompt:
      "You are a helpful AI assistant for our company. Be friendly, professional, and concise. Help callers with their questions and guide them to the right resources.",
    greeting: "Hello! Thanks for calling. How can I help you today?",
    temperature: 0.7,
    transferNumber: "",
    isActive: true,
  });

  const handleComplete = async (data: Record<string, unknown>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/voice/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          provisionPhone: formData.provisionPhone, // Include phone provisioning flag
          voiceSettings: {
            voiceId: formData.voiceId,
            temperature: formData.temperature,
          },
        }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || "Failed to create agent");
      }

      const responseData = await response.json();
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

      router.push("/dashboard/voice");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Voice Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set up your AI voice agent in a few simple steps
          </p>
        </div>
        <Button
          as={Link}
          href="/dashboard/voice"
          variant="bordered"
          startContent={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardBody className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardBody>
        </Card>
      )}

      <Wizard
        steps={wizardSteps}
        onComplete={handleComplete}
        variant="full"
        showProgress={true}
        showStepIndicator={false}
      >
        <WizardStepContent
          formData={formData}
          setFormData={setFormData}
          brands={brands}
          loading={loading}
        />
      </Wizard>
    </div>
  );
}

interface WizardStepContentProps {
  formData: any;
  setFormData: (data: any) => void;
  brands: Brand[];
  loading: boolean;
}

function WizardStepContent({ formData, setFormData, brands, loading }: WizardStepContentProps) {
  const { currentStep, nextStep, prevStep, isFirstStep, isLastStep } = useWizard();

  return (
    <div className="space-y-6">
      {currentStep === 0 && <BasicInfoStep formData={formData} setFormData={setFormData} brands={brands} />}
      {currentStep === 1 && <PhoneNumberStep formData={formData} setFormData={setFormData} />}
      {currentStep === 2 && <VoiceSettingsStep formData={formData} setFormData={setFormData} />}
      {currentStep === 3 && <AIConfigurationStep formData={formData} setFormData={setFormData} />}
      {currentStep === 4 && <ReviewStep formData={formData} brands={brands} />}

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="bordered"
          onPress={prevStep}
          isDisabled={isFirstStep || loading}
        >
          Previous
        </Button>
        <Button
          color="primary"
          onPress={nextStep}
          isLoading={loading}
          startContent={isLastStep ? <Save className="w-4 h-4" /> : undefined}
        >
          {isLastStep ? "Create Agent" : "Next"}
        </Button>
      </div>
    </div>
  );
}

// Step 1: Basic Info
function BasicInfoStep({ formData, setFormData, brands }: { formData: any; setFormData: any; brands: Brand[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Basic Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Give your agent a name and select the brand it represents
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Agent Name"
          placeholder="e.g., Sales Assistant, Support Bot"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          isRequired
          size="lg"
          startContent={<User className="w-4 h-4 text-gray-400" />}
        />

        <Textarea
          label="Description"
          placeholder="Brief description of what this agent does"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          size="lg"
          minRows={3}
        />

        <Select
          label="Brand"
          selectedKeys={formData.brandId ? [formData.brandId] : []}
          onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
          isRequired
          size="lg"
          startContent={<Building className="w-4 h-4 text-gray-400" />}
        >
          {brands.map((brand) => (
            <SelectItem key={brand.id}>{brand.name}</SelectItem>
          ))}
        </Select>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Active Status
                </p>
                <p className="text-sm text-gray-500">
                  Enable this agent to receive calls immediately after creation
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
      </div>
    </div>
  );
}

// Step 2: Phone Number
function PhoneNumberStep({ formData, setFormData }: { formData: any; setFormData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Phone Number
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Provision a phone number for your agent to receive inbound calls
        </p>
      </div>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-200 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Automatic Phone Provisioning
                </h3>
                <p className="text-blue-800 dark:text-blue-300 mb-4">
                  We'll automatically provision a phone number from Magnus Billing (Dominica +1-767-818-XXXX range)
                  and configure it to route calls to your agent.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>SIP Account:</strong> Automatically created with secure credentials
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>DID Number:</strong> Provisioned from available pool
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Call Routing:</strong> Configured to route to your agent
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Provision Phone Number
                </p>
                <p className="text-sm text-gray-500">
                  Enable to automatically provision a phone number during creation
                </p>
              </div>
              <Switch
                isSelected={formData.provisionPhone}
                onValueChange={(value) =>
                  setFormData({ ...formData, provisionPhone: value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {!formData.provisionPhone && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardBody className="p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-1">Manual Provisioning Required</p>
                  <p>
                    You can provision a phone number later from the agent's detail page or the phone numbers management page.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900 dark:text-white">Pricing</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Phone Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">$0.50/month</p>
              </div>
              <div>
                <p className="text-gray-500">Per Minute</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${PRICING.voice.perMinute.toFixed(2)}/min
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Phone number charges apply monthly. Call charges are per minute of active call time.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Step 3: Voice Settings
function VoiceSettingsStep({ formData, setFormData }: { formData: any; setFormData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Voice Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure how your agent speaks and sounds
        </p>
      </div>

      <div className="space-y-4">
        <Select
          label="Text-to-Speech Provider"
          selectedKeys={[formData.ttsProvider]}
          onChange={(e) => setFormData({ ...formData, ttsProvider: e.target.value })}
          size="lg"
          startContent={<Mic className="w-4 h-4 text-gray-400" />}
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
            size="lg"
            description="Choose the voice personality for your agent"
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
            size="lg"
            description="Enter the voice ID from your TTS provider"
          />
        )}

        <Textarea
          label="Greeting Message"
          placeholder="What the agent says when answering a call"
          value={formData.greeting}
          onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
          minRows={3}
          size="lg"
          description="This is the first thing callers will hear"
        />

        <Input
          label="Transfer Number (Optional)"
          placeholder="+1234567890"
          value={formData.transferNumber}
          onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
          size="lg"
          startContent={<Phone className="w-4 h-4 text-gray-400" />}
          description="Number to transfer calls to when requested or escalation needed"
        />
      </div>
    </div>
  );
}

// Step 3: AI Configuration
function AIConfigurationStep({ formData, setFormData }: { formData: any; setFormData: any }) {
  const currentModels = LLM_MODELS[formData.llmProvider as keyof typeof LLM_MODELS] || LLM_MODELS.openai;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Define your agent's intelligence and personality
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="LLM Provider"
            selectedKeys={[formData.llmProvider]}
            onChange={(e) => setFormData({
              ...formData,
              llmProvider: e.target.value,
              llmModel: LLM_MODELS[e.target.value as keyof typeof LLM_MODELS]?.[0]?.key || "gpt-4o-mini"
            })}
            size="lg"
            startContent={<Brain className="w-4 h-4 text-gray-400" />}
          >
            {LLM_PROVIDERS.map((provider) => (
              <SelectItem key={provider.key}>{provider.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Model"
            selectedKeys={[formData.llmModel]}
            onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
            size="lg"
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
          minRows={6}
          isRequired
          size="lg"
          description="Define the agent's role, personality, and guidelines"
        />

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature
              </label>
              <span className="text-sm font-semibold text-primary">
                {formData.temperature}
              </span>
            </div>
            <Slider
              step={0.1}
              minValue={0}
              maxValue={1}
              value={formData.temperature}
              onChange={(value) =>
                setFormData({ ...formData, temperature: value as number })
              }
              size="sm"
              color="primary"
            />
            <p className="text-xs text-gray-500">
              Lower values (0.0-0.3) = more focused and deterministic
              <br />
              Higher values (0.7-1.0) = more creative and varied responses
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Step 4: Review
function ReviewStep({ formData, brands }: { formData: any; brands: Brand[] }) {
  const selectedBrand = brands.find(b => b.id === formData.brandId);
  const selectedLLMModel = LLM_MODELS[formData.llmProvider as keyof typeof LLM_MODELS]?.find(
    m => m.key === formData.llmModel
  );
  const selectedTTSProvider = TTS_PROVIDERS.find(p => p.key === formData.ttsProvider);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Create
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your agent configuration before creating
        </p>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Basic Information</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{formData.name || "Not set"}</p>
            </div>
            {formData.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{formData.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Brand</p>
              <p className="font-medium">{selectedBrand?.name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Chip
                size="sm"
                color={formData.isActive ? "success" : "default"}
                variant="flat"
              >
                {formData.isActive ? "Active" : "Inactive"}
              </Chip>
            </div>
          </CardBody>
        </Card>

        {/* Phone Number */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Phone Number</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Automatic Provisioning</p>
              <Chip
                size="sm"
                color={formData.provisionPhone ? "success" : "default"}
                variant="flat"
                startContent={formData.provisionPhone ? <CheckCircle className="w-3 h-3" /> : undefined}
              >
                {formData.provisionPhone ? "Enabled" : "Disabled"}
              </Chip>
            </div>
            {formData.provisionPhone && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  A phone number will be automatically provisioned from Magnus Billing (Dominica +1-767-818-XXXX range)
                  with SIP account and call routing configured.
                </p>
              </div>
            )}
            {!formData.provisionPhone && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  You'll need to manually provision a phone number after the agent is created.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Voice Settings</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">TTS Provider</p>
              <p className="font-medium">{selectedTTSProvider?.label || formData.ttsProvider}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Voice</p>
              <p className="font-medium">{formData.voiceId || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Greeting</p>
              <p className="font-medium text-sm">{formData.greeting || "Not set"}</p>
            </div>
            {formData.transferNumber && (
              <div>
                <p className="text-sm text-gray-500">Transfer Number</p>
                <p className="font-medium">{formData.transferNumber}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Configuration</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Model</p>
              <p className="font-medium">
                {LLM_PROVIDERS.find(p => p.key === formData.llmProvider)?.label} - {selectedLLMModel?.label}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="font-medium">{formData.temperature}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">System Prompt</p>
              <p className="font-medium text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {formData.systemPrompt || "Not set"}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Pricing Info */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-200 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                Pricing Information
              </h3>
            </div>
          </CardHeader>
          <CardBody className="pt-2 space-y-4">
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

            <div className="flex items-start gap-2 p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p>
                  <strong>Example:</strong> A 5-minute call costs approximately ${(5 * PRICING.voice.perMinute).toFixed(2)}.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
