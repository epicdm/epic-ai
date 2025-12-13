"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  CheckboxGroup,
  Slider,
  Progress,
  Avatar,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sparkles,
  Wand2,
  ArrowRight,
  CheckCircle2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Image,
  FileText,
  Video,
  RefreshCw,
} from "lucide-react";

interface BrandBrain {
  id: string;
  voiceTone: string | null;
  writingStyle: string | null;
  contentPillars: string[];
  keyTopics: string[];
}

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  profileImageUrl: string | null;
}

interface ContentGeneratePageProps {
  brandId: string;
  brain: BrandBrain | null;
  socialAccounts: SocialAccount[];
}

const CONTENT_TYPES = [
  { key: "POST", label: "Social Post", icon: FileText, description: "Short-form social media content" },
  { key: "THREAD", label: "Thread", icon: FileText, description: "Multi-part thread for X/Twitter" },
  { key: "ARTICLE", label: "Article", icon: FileText, description: "Long-form blog or article content" },
  { key: "AD", label: "Ad Copy", icon: Sparkles, description: "Advertising content" },
];

const PLATFORMS = [
  { key: "TWITTER", label: "X (Twitter)", icon: Twitter },
  { key: "LINKEDIN", label: "LinkedIn", icon: Linkedin },
  { key: "INSTAGRAM", label: "Instagram", icon: Instagram },
  { key: "FACEBOOK", label: "Facebook", icon: Facebook },
];

const TONES = [
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "educational", label: "Educational" },
  { key: "inspirational", label: "Inspirational" },
  { key: "humorous", label: "Humorous" },
];

interface GeneratedContent {
  id: string;
  content: string;
  hashtags: string[];
  imagePrompt?: string;
}

export function ContentGeneratePage({ brandId, brain, socialAccounts }: ContentGeneratePageProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [contentType, setContentType] = useState("POST");
  const [platforms, setPlatforms] = useState<string[]>(["TWITTER"]);
  const [topic, setTopic] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState(brain?.voiceTone || "professional");
  const [count, setCount] = useState(3);
  const [includeImage, setIncludeImage] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          contentType,
          platforms,
          topic,
          customPrompt,
          tone,
          count,
          includeImage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedContent(data.content || []);
        setStep(2);
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          contentIds: selectedContent,
          status: "PENDING",
        }),
      });

      if (res.ok) {
        router.push("/dashboard/content");
      }
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (index: number) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          contentType,
          platforms,
          topic,
          customPrompt,
          tone,
          count: 1,
          includeImage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.content && data.content.length > 0) {
          const newContent = [...generatedContent];
          newContent[index] = data.content[0];
          setGeneratedContent(newContent);
        }
      }
    } catch (error) {
      console.error("Error regenerating content:", error);
    } finally {
      setGenerating(false);
    }
  };

  const toggleContentSelection = (id: string) => {
    setSelectedContent((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Generate Content"
        description="Create AI-powered content tailored to your brand voice."
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        <StepIndicator step={1} currentStep={step} label="Configure" />
        <div className="w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
        <StepIndicator step={2} currentStep={step} label="Review" />
        <div className="w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
        <StepIndicator step={3} currentStep={step} label="Save" />
      </div>

      {/* Step 1: Configure */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Content Type */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Content Type</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONTENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setContentType(type.key)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        contentType === type.key
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${
                        contentType === type.key ? "text-primary" : "text-gray-500"
                      }`} />
                      <p className="text-sm font-medium">{type.label}</p>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Platforms */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Target Platforms</h3>
            </CardHeader>
            <CardBody>
              <CheckboxGroup
                orientation="horizontal"
                value={platforms}
                onChange={(value) => setPlatforms(value as string[])}
              >
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const hasAccount = socialAccounts.some((a) => a.platform === platform.key);
                  return (
                    <Checkbox
                      key={platform.key}
                      value={platform.key}
                      isDisabled={!hasAccount}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {platform.label}
                        {!hasAccount && (
                          <Chip size="sm" variant="flat" color="warning">
                            Not connected
                          </Chip>
                        )}
                      </div>
                    </Checkbox>
                  );
                })}
              </CheckboxGroup>
            </CardBody>
          </Card>

          {/* Topic & Prompt */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Content Topic</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {brain?.contentPillars && brain.contentPillars.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Quick select from your content pillars:</p>
                  <div className="flex flex-wrap gap-2">
                    {brain.contentPillars.map((pillar) => (
                      <Chip
                        key={pillar}
                        variant={topic === pillar ? "solid" : "bordered"}
                        color={topic === pillar ? "primary" : "default"}
                        className="cursor-pointer"
                        onClick={() => setTopic(pillar)}
                      >
                        {pillar}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <Input
                label="Topic"
                placeholder="What should the content be about?"
                value={topic}
                onValueChange={setTopic}
              />

              <Textarea
                label="Custom Instructions (Optional)"
                placeholder="Any specific instructions for the AI..."
                value={customPrompt}
                onValueChange={setCustomPrompt}
                minRows={2}
              />
            </CardBody>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Generation Settings</h3>
            </CardHeader>
            <CardBody className="space-y-6">
              <Select
                label="Tone"
                selectedKeys={[tone]}
                onSelectionChange={(keys) => setTone(Array.from(keys)[0] as string)}
              >
                {TONES.map((t) => (
                  <SelectItem key={t.key}>{t.label}</SelectItem>
                ))}
              </Select>

              <div>
                <p className="text-sm font-medium mb-2">Number of variations: {count}</p>
                <Slider
                  size="sm"
                  step={1}
                  minValue={1}
                  maxValue={10}
                  value={count}
                  onChange={(v) => setCount(v as number)}
                  className="max-w-md"
                />
              </div>

              <Checkbox
                isSelected={includeImage}
                onValueChange={setIncludeImage}
              >
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Generate image suggestions
                </div>
              </Checkbox>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button
              color="primary"
              size="lg"
              startContent={generating ? undefined : <Wand2 className="w-5 h-5" />}
              onPress={handleGenerate}
              isLoading={generating}
              isDisabled={!topic.trim() || platforms.length === 0}
            >
              Generate Content
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review Generated Content */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="flat"
              onPress={() => setStep(1)}
            >
              Back to Settings
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedContent.length} of {generatedContent.length} selected
              </span>
              <Button
                color="primary"
                onPress={() => {
                  if (selectedContent.length > 0) setStep(3);
                }}
                isDisabled={selectedContent.length === 0}
                endContent={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedContent.map((content, index) => (
              <Card
                key={content.id || index}
                isPressable
                onPress={() => toggleContentSelection(content.id)}
                className={`transition-all ${
                  selectedContent.includes(content.id)
                    ? "ring-2 ring-primary"
                    : ""
                }`}
              >
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <Checkbox
                      isSelected={selectedContent.includes(content.id)}
                      onValueChange={() => toggleContentSelection(content.id)}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => handleRegenerate(index)}
                      isLoading={generating}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm">{content.content}</p>

                  {content.hashtags && content.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-primary">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {content.imagePrompt && (
                    <p className="text-xs text-gray-400 italic">
                      Image: {content.imagePrompt}
                    </p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Save */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardBody className="py-12 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Ready to Save</h2>
                <p className="text-gray-500">
                  {selectedContent.length} content item{selectedContent.length !== 1 ? "s" : ""} will be
                  added to your approval queue.
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="flat" onPress={() => setStep(2)}>
                  Back to Review
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveSelected}
                  isLoading={saving}
                >
                  Save to Queue
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const isActive = currentStep >= step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isActive
            ? "bg-primary text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-500"
        }`}
      >
        {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
      </div>
      <span className={`text-xs ${isActive ? "text-primary" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}
