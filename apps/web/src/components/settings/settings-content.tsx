"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Divider, Button, Checkbox } from "@heroui/react";
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
  const [removeBrandOnReset, setRemoveBrandOnReset] = useState(false);
  const [removeOrganizationOnReset, setRemoveOrganizationOnReset] = useState(false);

  const handleResetOnboarding = async () => {
    let confirmMessage = "Are you sure you want to reset onboarding? You will see the onboarding wizard again on next page load.";

    if (removeOrganizationOnReset) {
      confirmMessage = "⚠️ FULL RESET: This will DELETE your organization, all brands, all data, and reset the 5-phase wizard. You will start completely from scratch. This CANNOT be undone. Are you absolutely sure?";
    } else if (removeBrandOnReset) {
      confirmMessage = "Are you sure you want to reset onboarding AND delete all brands? This cannot be undone.";
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setResettingOnboarding(true);
    setResetMessage(null);

    const payload = {
      removeBrand: removeBrandOnReset,
      removeOrganization: removeOrganizationOnReset,
    };
    console.log("[Reset UI] Sending payload:", payload);

    try {
      const response = await fetch("/api/onboarding/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("[Reset UI] Response:", { ok: response.ok, status: response.status, data });

      if (response.ok) {
        console.log("[Reset UI] Success! Full response data:", data);
        const debugInfo = data.organizationDeleted
          ? `Org deleted: ${data.deletedOrgId}, Remaining memberships: ${data.remainingMemberships}`
          : "No organization deleted";
        console.log("[Reset UI]", debugInfo);
        setResetMessage({ type: "success", text: data.message || "Reset complete! Redirecting..." });
        // Redirect to setup hub if organization was deleted, otherwise dashboard
        setTimeout(() => {
          window.location.href = removeOrganizationOnReset
            ? "/setup"
            : "/dashboard?showOnboarding=true";
        }, 1500);
      } else {
        console.error("[Reset UI] Error response:", data);
        setResetMessage({ type: "error", text: data.error || "Failed to reset onboarding" });
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
              <div className="space-y-2 mb-3">
                <Checkbox
                  isSelected={removeBrandOnReset}
                  onValueChange={(checked) => {
                    setRemoveBrandOnReset(checked);
                    if (!checked) setRemoveOrganizationOnReset(false);
                  }}
                  color="danger"
                  size="sm"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Also remove all brands (start completely fresh)
                  </span>
                </Checkbox>
                <Checkbox
                  isSelected={removeOrganizationOnReset}
                  onValueChange={(checked) => {
                    setRemoveOrganizationOnReset(checked);
                    if (checked) setRemoveBrandOnReset(true);
                  }}
                  color="danger"
                  size="sm"
                  isDisabled={!removeBrandOnReset}
                  className="ml-4"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Also remove organization (full reset - restart 5-phase wizard)
                  </span>
                </Checkbox>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  color={removeOrganizationOnReset ? "danger" : removeBrandOnReset ? "danger" : "warning"}
                  variant={removeOrganizationOnReset ? "solid" : "flat"}
                  startContent={<RefreshCw className={`w-4 h-4 ${resettingOnboarding ? "animate-spin" : ""}`} />}
                  isLoading={resettingOnboarding}
                  onPress={handleResetOnboarding}
                >
                  {removeOrganizationOnReset
                    ? "Full Reset (Delete Everything)"
                    : removeBrandOnReset
                      ? "Reset & Delete Brands"
                      : "Reset Onboarding"}
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
