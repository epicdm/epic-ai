"use client";

import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
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
              <p className="font-medium text-gray-900 dark:text-white">
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
    </div>
  );
}
