"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Divider, Button } from "@heroui/react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { SettingsForm } from "./settings-form";
import { BrandsList } from "./brands-list";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

interface Brand {
  id: string;
  name: string;
  website: string | null;
  createdAt: Date;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
}

interface SettingsContentProps {
  organization: Organization;
  brands: Brand[];
  subscription: Subscription | null;
  userEmail: string | null;
}

export function SettingsContent({
  organization,
  brands,
  subscription,
  userEmail,
}: SettingsContentProps) {
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResetOnboarding = async () => {
    if (!confirm("Are you sure you want to reset onboarding? You will see the onboarding wizard again on next page load.")) {
      return;
    }

    setResettingOnboarding(true);
    setResetMessage(null);

    try {
      const response = await fetch("/api/onboarding/reset", {
        method: "POST",
      });

      if (response.ok) {
        setResetMessage({ type: "success", text: "Onboarding reset! Redirecting..." });
        // Redirect to dashboard with force param to show onboarding
        setTimeout(() => {
          window.location.href = "/dashboard?showOnboarding=true";
        }, 1500);
      } else {
        const error = await response.json();
        setResetMessage({ type: "error", text: error.error || "Failed to reset onboarding" });
      }
    } catch {
      setResetMessage({ type: "error", text: "Failed to reset onboarding" });
    } finally {
      setResettingOnboarding(false);
    }
  };

  const isTrialing = subscription?.status === "trialing";
  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trialEnd).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your organization and brands
        </p>
      </div>

      {/* Subscription Status */}
      {isTrialing && (
        <Card className="border-brand-500 bg-brand-50 dark:bg-brand-900/20">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Free Trial Active
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trialDaysLeft} days remaining in your trial
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-brand-500 text-white text-sm font-medium rounded-full">
                Trial
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Organization Settings */}
      <Card>
        <CardHeader className="pb-0">
          <h2 className="text-lg font-semibold">Organization</h2>
        </CardHeader>
        <CardBody>
          <SettingsForm organization={organization} />
        </CardBody>
      </Card>

      {/* Brands */}
      <Card>
        <CardHeader className="pb-0 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Brands</h2>
        </CardHeader>
        <CardBody>
          <BrandsList
            brands={brands}
            organizationId={organization.id}
          />
        </CardBody>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-0">
          <h2 className="text-lg font-semibold">Account</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {userEmail || "Not available"}
              </p>
            </div>
            <Divider />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Member since
              </p>
              <p className="font-medium text-gray-900 dark:text-white" suppressHydrationWarning>
                {new Date(organization.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Developer Tools */}
      <Card className="border-warning-200 dark:border-warning-800">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold">Developer Tools</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Reset your onboarding to test the setup flow again. This will show
                the onboarding wizard on your next page load.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  color="warning"
                  variant="flat"
                  startContent={<RefreshCw className={`w-4 h-4 ${resettingOnboarding ? "animate-spin" : ""}`} />}
                  isLoading={resettingOnboarding}
                  onPress={handleResetOnboarding}
                >
                  Reset Onboarding
                </Button>
                {resetMessage && (
                  <span className={`text-sm ${resetMessage.type === "success" ? "text-success" : "text-danger"}`}>
                    {resetMessage.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
