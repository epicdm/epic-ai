"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/page-header";
import { trackEvent } from "@/lib/analytics/analytics";
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
  Loader2,
} from "lucide-react";
import { AIConfidence } from "@/components/ui/ai-confidence";

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

// Helper function to determine recommended tones based on Brand Brain voice
function getRecommendedTones(brandVoiceTone: string | null): {
  toneKey: string;
  confidence: number;
  reason: string;
}[] {
  if (!brandVoiceTone) return [];

  const toneRecommendations: Record<string, { toneKey: string; confidence: number; reason: string }[]> = {
    professional: [
      { toneKey: "professional", confidence: 95, reason: "Matches your brand's professional voice perfectly" },
      { toneKey: "educational", confidence: 88, reason: "Complements professional tone with informative content" },
      { toneKey: "inspirational", confidence: 82, reason: "Professional brands can inspire while maintaining credibility" },
    ],
    casual: [
      { toneKey: "casual", confidence: 95, reason: "Matches your brand's casual, friendly voice" },
      { toneKey: "humorous", confidence: 88, reason: "Casual brands often use humor effectively" },
      { toneKey: "enthusiastic", confidence: 85, reason: "Enthusiasm pairs well with casual communication" },
    ],
    friendly: [
      { toneKey: "casual", confidence: 92, reason: "Friendly brands resonate with casual communication" },
      { toneKey: "enthusiastic", confidence: 88, reason: "Enthusiasm enhances friendly brand perception" },
      { toneKey: "inspirational", confidence: 85, reason: "Friendly brands can inspire without being overly formal" },
    ],
    authoritative: [
      { toneKey: "professional", confidence: 93, reason: "Authority requires professional communication" },
      { toneKey: "educational", confidence: 90, reason: "Authoritative brands excel at educating their audience" },
      { toneKey: "inspirational", confidence: 85, reason: "Authority can inspire trust and action" },
    ],
    witty: [
      { toneKey: "humorous", confidence: 95, reason: "Wit and humor go hand in hand" },
      { toneKey: "casual", confidence: 88, reason: "Witty communication works best in casual contexts" },
      { toneKey: "enthusiastic", confidence: 82, reason: "Enthusiasm amplifies witty content" },
    ],
    conversational: [
      { toneKey: "casual", confidence: 93, reason: "Conversational brands thrive with casual tone" },
      { toneKey: "enthusiastic", confidence: 87, reason: "Conversations are more engaging with enthusiasm" },
      { toneKey: "humorous", confidence: 83, reason: "Humor makes conversations memorable" },
    ],
    empowering: [
      { toneKey: "inspirational", confidence: 95, reason: "Empowerment is best delivered through inspiration" },
      { toneKey: "enthusiastic", confidence: 90, reason: "Enthusiasm drives empowering messages" },
      { toneKey: "educational", confidence: 85, reason: "Education empowers through knowledge" },
    ],
  };

  return toneRecommendations[brandVoiceTone.toLowerCase()] || [];
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
        trackEvent("content_generated", {
          type: contentType,
          content_type: contentType,
          platforms: platforms.join(","),
          tone,
          count,
          generated_count: data.content?.length || 0,
        });
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
        trackEvent("content_saved", {
          content_count: selectedContent.length,
        });
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
              <CardTitle>Content Type</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>Target Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const hasAccount = socialAccounts.some((a) => a.platform === platform.key);
                  return (
                    <div key={platform.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`platform-${platform.key}`}
                        checked={platforms.includes(platform.key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPlatforms([...platforms, platform.key]);
                          } else {
                            setPlatforms(platforms.filter((p) => p !== platform.key));
                          }
                        }}
                        disabled={!hasAccount}
                      />
                      <label
                        htmlFor={`platform-${platform.key}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Icon className="w-4 h-4" />
                        {platform.label}
                        {!hasAccount && (
                          <Badge variant="outline">Not connected</Badge>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Topic & Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Content Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {brain?.contentPillars && brain.contentPillars.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Quick select from your content pillars:</p>
                  <div className="flex flex-wrap gap-2">
                    {brain.contentPillars.map((pillar) => (
                      <button
                        key={pillar}
                        onClick={() => setTopic(pillar)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                          topic === pillar
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-input hover:bg-accent"
                        }`}
                      >
                        {pillar}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  placeholder="What should the content be about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Custom Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any specific instructions for the AI..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => {
                      const recommendations = getRecommendedTones(brain?.voiceTone ?? null);
                      const recommendation = recommendations.find((r) => r.toneKey === t.key);
                      return (
                        <SelectItem key={t.key} value={t.key}>
                          <div className="flex items-center gap-2">
                            <span>{t.label}</span>
                            {recommendation ? (
                              <AIConfidence
                                score={recommendation.confidence}
                                variant="dots"
                              />
                            ) : null}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of variations: {count}</Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full max-w-md accent-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-image"
                  checked={includeImage}
                  onCheckedChange={(checked) => setIncludeImage(checked === true)}
                />
                <label htmlFor="include-image" className="flex items-center gap-2 text-sm">
                  <Image className="w-4 h-4" />
                  Generate image suggestions
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={generating || !topic.trim() || platforms.length === 0}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-5 w-5" />
              )}
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
              variant="secondary"
              onClick={() => setStep(1)}
            >
              Back to Settings
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedContent.length} of {generatedContent.length} selected
              </span>
              <Button
                onClick={() => {
                  if (selectedContent.length > 0) setStep(3);
                }}
                disabled={selectedContent.length === 0}
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedContent.map((content, index) => (
              <Card
                key={content.id || index}
                className={`cursor-pointer transition-all ${
                  selectedContent.includes(content.id)
                    ? "ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => toggleContentSelection(content.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <Checkbox
                      checked={selectedContent.includes(content.id)}
                      onCheckedChange={() => toggleContentSelection(content.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerate(index);
                      }}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Save */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center space-y-6">
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
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back to Review
                </Button>
                <Button
                  onClick={handleSaveSelected}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save to Queue
                </Button>
              </div>
            </CardContent>
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
