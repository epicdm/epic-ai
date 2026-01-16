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
  Chip,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  RadioGroup,
  Radio,
  useDisclosure,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Save, DollarSign, Info, Phone, Trash2, Plus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PRICING } from "@/components/ui/cost-estimator";
import { trackEvent } from "@/lib/analytics";

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

export function AgentForm({ brands, initialData }: AgentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState(initialData?.phoneNumbers || []);
  const [deletePhoneOption, setDeletePhoneOption] = useState<"pool" | "release">("pool");
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

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

      onDeleteModalClose();
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

        {/* Phone Numbers - Only shown for existing agents */}
        {initialData && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Assigned Phone Numbers</h2>
              <Button
                as={Link}
                href="/dashboard/voice/numbers"
                size="sm"
                variant="flat"
                startContent={<Phone className="w-4 h-4" />}
              >
                Manage Numbers
              </Button>
            </CardHeader>
            <CardBody>
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
                      <Chip
                        size="sm"
                        color={phone.isActive ? "success" : "default"}
                        variant="flat"
                      >
                        {phone.isActive ? "Enabled" : "Disabled"}
                      </Chip>
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
                    color="primary"
                    size="sm"
                    isLoading={provisioning}
                    onPress={handleProvisionPhone}
                    startContent={!provisioning && <Plus className="w-4 h-4" />}
                  >
                    Provision Phone Number
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        )}

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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tooltip content="Speech recognition to convert caller audio to text">
                <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Speech-to-Text</p>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    ${PRICING.voice.breakdown.stt.toFixed(2)}/min
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="AI processing and response generation">
                <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">AI Processing</p>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    ${PRICING.voice.breakdown.llm.toFixed(2)}/min
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Convert AI responses to natural speech">
                <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Text-to-Speech</p>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    ${PRICING.voice.breakdown.tts.toFixed(2)}/min
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Phone line and carrier costs">
                <div className="p-3 bg-white/30 dark:bg-black/10 rounded-lg text-center cursor-help">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Telephony</p>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    ${PRICING.voice.breakdown.telephony.toFixed(2)}/min
                  </p>
                </div>
              </Tooltip>
            </div>

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
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-between gap-3">
          {initialData ? (
            <Button
              color="danger"
              variant="flat"
              onPress={onDeleteModalOpen}
              startContent={<Trash2 className="w-4 h-4" />}
            >
              Delete Agent
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
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
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Delete Agent</h3>
              <p className="text-sm text-gray-500 font-normal">This action cannot be undone</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete <strong>{initialData?.name}</strong>?
            </p>

            {phoneNumbers.length > 0 && (
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
                  <Radio value="pool" description="Numbers remain available for other agents">
                    Return to pool
                  </Radio>
                  <Radio
                    value="release"
                    description="Delete from LiveKit and release from Magnus (permanent)"
                    classNames={{ label: "text-red-600 dark:text-red-400" }}
                  >
                    Delete &amp; release numbers
                  </Radio>
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
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onDeleteModalClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deleting}
              onPress={handleDeleteConfirm}
              startContent={!deleting && <Trash2 className="w-4 h-4" />}
            >
              {phoneNumbers.length > 0 && deletePhoneOption === "release"
                ? "Delete Agent & Numbers"
                : "Delete Agent"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
