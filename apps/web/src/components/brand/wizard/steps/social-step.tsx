"use client";

/**
 * Social Step - Import data from connected social accounts
 *
 * Fetches connected social profiles and suggests:
 * - Logo (highest quality avatar)
 * - Brand name (from display names)
 * - Profile links
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Avatar,
  Button,
  Spinner,
  Alert,
  Chip,
} from "@heroui/react";
import {
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
} from "@/components/ui/wizard";
import {
  Share2,
  CheckCircle,
  ExternalLink,
  SkipForward,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import type { BrandWizardData, SocialData, SocialProfile } from "../brand-setup-wizard";

// Platform icons mapping
const platformIcons: Record<string, string> = {
  TWITTER: "𝕏",
  LINKEDIN: "in",
  FACEBOOK: "f",
  INSTAGRAM: "📷",
};

const platformColors: Record<string, "primary" | "secondary" | "success" | "warning" | "danger" | "default"> = {
  TWITTER: "default",
  LINKEDIN: "primary",
  FACEBOOK: "primary",
  INSTAGRAM: "secondary",
};

interface SocialStepProps {
  stepIndex: number;
  organizationId: string;
}

export function SocialStep({ stepIndex, organizationId }: SocialStepProps) {
  const { data, setAllData, nextStep } = useWizard();
  const wizardData = data as unknown as BrandWizardData;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch social profiles on mount
  useEffect(() => {
    if (!hasFetched && !wizardData.socialData) {
      fetchSocialProfiles();
    }
  }, [hasFetched, wizardData.socialData]);

  const fetchSocialProfiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/brand/social-profiles?organizationId=${organizationId}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch social profiles");
      }

      const socialData: SocialData = result.data;

      // Update wizard data
      setAllData({
        socialData,
        // Use social data to enhance brand settings if not already set from website
        brandLogo: wizardData.brandLogo || socialData.suggestedLogo || null,
        brandName: wizardData.brandName || socialData.suggestedName || "",
      });

      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profiles");
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseLogo = (avatar: string) => {
    setAllData({
      brandLogo: avatar,
    });
  };

  const handleSkip = () => {
    nextStep();
  };

  const socialData = wizardData.socialData;
  const hasProfiles = socialData && socialData.profiles.length > 0;

  return (
    <WizardStepContainer
      stepIndex={stepIndex}
      nextLabel={hasProfiles ? "Continue" : "Skip"}
      onNext={hasProfiles ? undefined : () => { nextStep(); return false; }}
    >
      <WizardStepHeader
        icon={<Share2 className="w-6 h-6 text-primary" />}
        title="Social Profiles"
        description="We'll pull information from your connected social accounts to help set up your brand. This step is optional."
      />

      <WizardStepContent>
        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <Card className="bg-default-50">
              <CardBody className="flex items-center justify-center py-8">
                <Spinner size="lg" />
                <p className="mt-4 text-default-500">Loading social profiles...</p>
              </CardBody>
            </Card>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Alert color="warning" variant="flat">
              <div className="flex items-center justify-between w-full">
                <span>{error}</span>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={fetchSocialProfiles}
                  startContent={<RefreshCw className="w-3 h-3" />}
                >
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {/* No Profiles Found */}
          {!isLoading && !error && hasFetched && !hasProfiles && (
            <Card className="bg-default-50">
              <CardBody className="text-center py-8">
                <Share2 className="w-12 h-12 mx-auto text-default-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
                <p className="text-default-500 mb-4">
                  You haven't connected any social accounts yet. You can connect
                  them later from your brand settings.
                </p>
                <Button
                  variant="light"
                  onPress={handleSkip}
                  startContent={<SkipForward className="w-4 h-4" />}
                >
                  Skip this step
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Profiles Found */}
          {!isLoading && hasProfiles && (
            <Card className="bg-success-50 dark:bg-success-900/20">
              <CardBody className="gap-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Found {socialData.profiles.length} connected account
                    {socialData.profiles.length > 1 ? "s" : ""}!
                  </span>
                </div>

                {/* Profile Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {socialData.profiles.map((profile, idx) => (
                    <ProfileCard
                      key={`${profile.platform}-${idx}`}
                      profile={profile}
                      isLogoSelected={wizardData.brandLogo === profile.avatar}
                      onUseLogo={handleUseLogo}
                    />
                  ))}
                </div>

                {/* Suggested Logo Section */}
                {socialData.suggestedLogo && (
                  <div className="pt-4 border-t border-divider">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={socialData.suggestedLogo}
                          className="w-12 h-12"
                          showFallback
                          fallback={<ImageIcon className="w-6 h-6" />}
                        />
                        <div>
                          <p className="text-sm font-medium">Suggested Logo</p>
                          <p className="text-xs text-default-500">
                            From your highest quality profile picture
                          </p>
                        </div>
                      </div>
                      {wizardData.brandLogo !== socialData.suggestedLogo && (
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          onPress={() => handleUseLogo(socialData.suggestedLogo!)}
                        >
                          Use This
                        </Button>
                      )}
                      {wizardData.brandLogo === socialData.suggestedLogo && (
                        <Chip color="primary" size="sm">
                          Selected
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Skip Option (when profiles exist) */}
          {!isLoading && hasProfiles && (
            <div className="text-center">
              <p className="text-xs text-default-400">
                You can customize all settings in the next step
              </p>
            </div>
          )}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

interface ProfileCardProps {
  profile: SocialProfile;
  isLogoSelected: boolean;
  onUseLogo: (avatar: string) => void;
}

function ProfileCard({ profile, isLogoSelected, onUseLogo }: ProfileCardProps) {
  return (
    <Card className="bg-default-100/50">
      <CardBody className="p-3">
        <div className="flex items-start gap-3">
          <Avatar
            src={profile.avatar || undefined}
            className="w-12 h-12 flex-shrink-0"
            showFallback
            fallback={
              <span className="text-lg font-bold">
                {platformIcons[profile.platform] || profile.platform[0]}
              </span>
            }
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Chip
                size="sm"
                color={platformColors[profile.platform] || "default"}
                variant="flat"
              >
                {profile.platform}
              </Chip>
            </div>
            {profile.displayName && (
              <p className="font-medium text-sm truncate">{profile.displayName}</p>
            )}
            {profile.username && (
              <p className="text-xs text-default-500 truncate">@{profile.username}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {profile.profileUrl && (
                <Button
                  as="a"
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="light"
                  className="h-6 min-w-0 px-2"
                  startContent={<ExternalLink className="w-3 h-3" />}
                >
                  View
                </Button>
              )}
              {profile.avatar && (
                <Button
                  size="sm"
                  variant={isLogoSelected ? "solid" : "flat"}
                  color={isLogoSelected ? "primary" : "default"}
                  className="h-6 min-w-0 px-2"
                  onPress={() => onUseLogo(profile.avatar!)}
                >
                  {isLogoSelected ? "Logo Selected" : "Use as Logo"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
