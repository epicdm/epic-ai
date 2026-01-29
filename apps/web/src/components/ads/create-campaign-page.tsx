"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Switch,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { value: "META", label: "Meta (Facebook & Instagram)" },
  { value: "GOOGLE", label: "Google Ads" },
  { value: "LINKEDIN", label: "LinkedIn Ads" },
];

const OBJECTIVES = [
  { value: "LEAD_GENERATION", label: "Lead Generation" },
  { value: "TRAFFIC", label: "Website Traffic" },
  { value: "AWARENESS", label: "Brand Awareness" },
  { value: "CONVERSIONS", label: "Conversions" },
];

interface AdVariation {
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
}

export function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("META");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("LEAD_GENERATION");
  const [dailyBudget, setDailyBudget] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productDescription, setProductDescription] = useState("");

  // Creatives
  const [adVariations, setAdVariations] = useState<AdVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [includeImage, setIncludeImage] = useState(true);

  async function generateAds() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          objective,
          targetAudience,
          productDescription,
          includeImage,
          variations: 3,
        }),
      });

      const data = await res.json();
      if (data.variations) {
        setAdVariations(data.variations);
        setSelectedVariation(0);
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }
    } catch (error) {
      console.error("Error generating ads:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function saveCampaign() {
    if (!name || selectedVariation === null) return;

    setSaving(true);
    try {
      const creative = adVariations[selectedVariation];

      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform,
          objective,
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
          targeting: { audience: targetAudience },
          creatives: [
            {
              ...creative,
              imageUrl,
              type: "IMAGE",
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/ads/campaigns/${data.campaign.id}`);
      }
    } catch (error) {
      console.error("Error saving campaign:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Campaign"
        description="Set up a new advertising campaign with AI-generated content."
      />

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-default-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Campaign Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Campaign Name"
              placeholder="e.g., Q1 Lead Gen - Small Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Select
              label="Platform"
              selectedKeys={[platform]}
              onSelectionChange={(keys) => setPlatform(Array.from(keys)[0] as string)}
            >
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Objective"
              selectedKeys={[objective]}
              onSelectionChange={(keys) => setObjective(Array.from(keys)[0] as string)}
            >
              {OBJECTIVES.map((o) => (
                <SelectItem key={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              type="number"
              label="Daily Budget (USD)"
              placeholder="50"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              startContent={<span className="text-default-400">$</span>}
            />

            <div className="flex justify-end">
              <Button
                color="primary"
                endContent={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(2)}
                isDisabled={!name}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: AI Generation */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Generate Ad Content</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              label="Target Audience"
              placeholder="Describe your ideal customer (e.g., Small business owners who want to automate their sales process)"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              minRows={2}
            />

            <Textarea
              label="Product/Service Description"
              placeholder="Describe what you're promoting (e.g., AI-powered voice agents that qualify leads 24/7)"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              minRows={2}
            />

            <Switch isSelected={includeImage} onValueChange={setIncludeImage}>
              Generate AI Image
            </Switch>

            <Button
              color="primary"
              startContent={<Sparkles className="w-4 h-4" />}
              onClick={generateAds}
              isLoading={generating}
              className="w-full"
            >
              Generate Ad Variations
            </Button>

            {/* Generated Variations */}
            {adVariations.length > 0 && (
              <div className="space-y-4 mt-6">
                <p className="font-medium">Select a variation:</p>
                {adVariations.map((variation, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedVariation(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedVariation === index
                        ? "border-primary bg-primary/5"
                        : "border-default-200 hover:border-default-300"
                    }`}
                  >
                    <p className="font-semibold text-lg">{variation.headline}</p>
                    <p className="text-default-600 mt-2">{variation.primaryText}</p>
                    {variation.description && (
                      <p className="text-sm text-default-400 mt-1">
                        {variation.description}
                      </p>
                    )}
                    <p className="text-sm text-primary mt-2">
                      CTA: {variation.callToAction}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Image */}
            {imageUrl && (
              <div className="mt-4">
                <p className="font-medium mb-2">Generated Image:</p>
                <img
                  src={imageUrl}
                  alt="Ad creative"
                  className="w-full max-w-md rounded-lg"
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="bordered"
                startContent={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                color="primary"
                endContent={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(3)}
                isDisabled={selectedVariation === null}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && selectedVariation !== null && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Review & Create</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Campaign Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-default-500">Campaign Name</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Platform</p>
                <p className="font-medium">{platform}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Objective</p>
                <p className="font-medium">{objective.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Daily Budget</p>
                <p className="font-medium">${dailyBudget || "Not set"}</p>
              </div>
            </div>

            {/* Ad Preview */}
            <div className="p-4 bg-default-50 rounded-lg">
              <p className="text-sm text-default-500 mb-2">Ad Preview</p>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Ad"
                  className="w-full max-w-sm rounded-lg mb-4"
                />
              )}
              <p className="font-bold text-lg">
                {adVariations[selectedVariation].headline}
              </p>
              <p className="mt-2">{adVariations[selectedVariation].primaryText}</p>
              <Button size="sm" color="primary" className="mt-4">
                {adVariations[selectedVariation].callToAction}
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="bordered"
                startContent={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                color="primary"
                onClick={saveCampaign}
                isLoading={saving}
              >
                Create Campaign
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
