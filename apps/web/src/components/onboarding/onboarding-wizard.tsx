"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Input, Progress } from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  organizationSchema,
  brandSchema,
  type OrganizationFormData,
  type BrandFormData,
} from "@/lib/validations/onboarding";

interface OnboardingWizardProps {
  userName: string;
}

type Step = "welcome" | "organization" | "brand" | "complete";

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  const brandForm = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      website: "",
    },
  });

  const progress = {
    welcome: 0,
    organization: 33,
    brand: 66,
    complete: 100,
  };

  const handleCreateOrganization = async (data: OrganizationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create organization");
      }

      setOrganizationId(result.id);
      setStep("brand");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBrand = async (data: BrandFormData) => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create brand");
      }

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete onboarding");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBrand = async () => {
    setStep("complete");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardBody className="p-8">
          {/* Progress Bar */}
          <Progress
            value={progress[step]}
            className="mb-8"
            color="primary"
            size="sm"
          />

          {/* Step: Welcome */}
          {step === "welcome" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">👋</span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome, {userName}!
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Let&apos;s set up your workspace in just a few steps. This will only
                take a minute.
              </p>

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onPress={() => setStep("organization")}
              >
                Let&apos;s Get Started
              </Button>
            </div>
          )}

          {/* Step: Create Organization */}
          {step === "organization" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create Your Organization
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  This is your workspace for your team and brands.
                </p>
              </div>

              <form onSubmit={orgForm.handleSubmit(handleCreateOrganization)}>
                <div className="space-y-4">
                  <Input
                    label="Organization Name"
                    placeholder="Acme Inc."
                    {...orgForm.register("name")}
                    isInvalid={!!orgForm.formState.errors.name}
                    errorMessage={orgForm.formState.errors.name?.message}
                    autoFocus
                  />

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Step: Create Brand */}
          {step === "brand" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create Your First Brand
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Brands help you manage different products or clients.
                </p>
              </div>

              <form onSubmit={brandForm.handleSubmit(handleCreateBrand)}>
                <div className="space-y-4">
                  <Input
                    label="Brand Name"
                    placeholder="My Awesome Brand"
                    {...brandForm.register("name")}
                    isInvalid={!!brandForm.formState.errors.name}
                    errorMessage={brandForm.formState.errors.name?.message}
                    autoFocus
                  />

                  <Input
                    label="Website (Optional)"
                    placeholder="https://example.com"
                    {...brandForm.register("website")}
                    isInvalid={!!brandForm.formState.errors.website}
                    errorMessage={brandForm.formState.errors.website?.message}
                  />

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Create Brand
                  </Button>

                  <Button
                    type="button"
                    variant="light"
                    className="w-full"
                    onPress={handleSkipBrand}
                  >
                    Skip for now
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎉</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You&apos;re All Set!
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your workspace is ready. Let&apos;s start automating your marketing!
              </p>

              <div className="space-y-3 text-left mb-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Organization created
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    14-day free trial activated
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Ready to connect social accounts
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onPress={handleComplete}
                isLoading={isLoading}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
