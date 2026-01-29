"use client";

/**
 * Website Step - Import brand data from website
 *
 * Scrapes website for:
 * - Company name
 * - Description
 * - Logo (og:image)
 * - Favicon
 * - Social links
 * - Brand colors
 */

import { useState } from "react";
import {
  Input,
  Button,
  Card,
  CardBody,
  Chip,
  Avatar,
  Spinner,
  Alert,
} from "@heroui/react";
import {
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
} from "@/components/ui/wizard";
import { Globe, Search, CheckCircle, ExternalLink, SkipForward } from "lucide-react";
import type { BrandWizardData, WebsiteData } from "../brand-setup-wizard";

interface WebsiteStepProps {
  stepIndex: number;
}

export function WebsiteStep({ stepIndex }: WebsiteStepProps) {
  const { data, setData, setAllData, nextStep } = useWizard();
  const wizardData = data as unknown as BrandWizardData;

  const [url, setUrl] = useState(wizardData.websiteUrl || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/brand/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to analyze website");
      }

      const websiteData: WebsiteData = result.data;

      // Update wizard data with scraped info
      setAllData({
        websiteUrl: url.trim(),
        websiteData: websiteData,
        // Auto-fill brand fields if not already set
        brandName: wizardData.brandName || websiteData.companyName || "",
        brandDescription: wizardData.brandDescription || websiteData.description || "",
        brandLogo: wizardData.brandLogo || websiteData.logo || websiteData.favicon || null,
        brandWebsite: url.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze website");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSkip = () => {
    nextStep();
  };

  const websiteData = wizardData.websiteData;

  return (
    <WizardStepContainer
      stepIndex={stepIndex}
      nextLabel={websiteData ? "Continue" : "Skip"}
      onNext={websiteData ? undefined : () => { nextStep(); return false; }}
    >
      <WizardStepHeader
        icon={<Globe className="w-6 h-6 text-primary" />}
        title="Import from Website"
        description="Enter your website URL to automatically extract your brand information. This step is optional."
      />

      <WizardStepContent>
        <div className="space-y-6">
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="https://yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              startContent={<Globe className="w-4 h-4 text-default-400" />}
              isDisabled={isAnalyzing}
              classNames={{
                base: "flex-1",
              }}
            />
            <Button
              color="primary"
              onPress={handleAnalyze}
              isLoading={isAnalyzing}
              isDisabled={!url.trim()}
              startContent={!isAnalyzing && <Search className="w-4 h-4" />}
            >
              Analyze
            </Button>
          </div>

          {error && (
            <Alert color="danger" variant="flat">
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <Card className="bg-default-50">
              <CardBody className="flex items-center justify-center py-8">
                <Spinner size="lg" />
                <p className="mt-4 text-default-500">Analyzing website...</p>
              </CardBody>
            </Card>
          )}

          {/* Results */}
          {websiteData && !isAnalyzing && (
            <Card className="bg-success-50 dark:bg-success-900/20">
              <CardBody className="gap-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Website analyzed successfully!</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo Preview */}
                  {(websiteData.logo || websiteData.favicon) && (
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={websiteData.logo || websiteData.favicon || undefined}
                        className="w-16 h-16"
                        radius="lg"
                        showFallback
                        fallback={<Globe className="w-8 h-8" />}
                      />
                      <div>
                        <p className="text-sm font-medium">Logo found</p>
                        <p className="text-xs text-default-500">
                          {websiteData.logo ? "From og:image" : "From favicon"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Company Name */}
                  {websiteData.companyName && (
                    <div>
                      <p className="text-xs text-default-500 mb-1">Company Name</p>
                      <p className="font-medium">{websiteData.companyName}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {websiteData.description && (
                  <div>
                    <p className="text-xs text-default-500 mb-1">Description</p>
                    <p className="text-sm">{websiteData.description}</p>
                  </div>
                )}

                {/* Social Links */}
                {Object.keys(websiteData.socialLinks).length > 0 && (
                  <div>
                    <p className="text-xs text-default-500 mb-2">Social Links Found</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(websiteData.socialLinks).map(([platform, url]) => (
                        <Chip
                          key={platform}
                          size="sm"
                          variant="flat"
                          color="primary"
                          endContent={<ExternalLink className="w-3 h-3" />}
                          as="a"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {platform}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Colors */}
                {websiteData.colors.length > 0 && (
                  <div>
                    <p className="text-xs text-default-500 mb-2">Brand Colors</p>
                    <div className="flex gap-2">
                      {websiteData.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-lg border border-default-200"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Template */}
                {websiteData.suggestedTemplate && (
                  <div className="pt-2 border-t border-divider">
                    <p className="text-xs text-default-500 mb-1">Suggested Template</p>
                    <Chip color="secondary" variant="flat">
                      {websiteData.suggestedTemplate}
                    </Chip>
                    {websiteData.suggestedTemplateReason && (
                      <p className="text-xs text-default-400 mt-1">
                        {websiteData.suggestedTemplateReason}
                      </p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Skip Option */}
          {!websiteData && !isAnalyzing && (
            <div className="text-center pt-4">
              <Button
                variant="light"
                onPress={handleSkip}
                startContent={<SkipForward className="w-4 h-4" />}
              >
                Skip this step
              </Button>
              <p className="text-xs text-default-400 mt-2">
                You can always add your website later
              </p>
            </div>
          )}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}
