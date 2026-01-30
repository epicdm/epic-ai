"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  Mail,
  Calendar,
  CreditCard,
  Webhook,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewSettingsContentProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  brands: Array<{
    id: string;
    name: string;
    website: string | null;
    createdAt: string;
  }>;
  subscription: {
    plan: string;
    status: string;
    trialEnd: string | null;
    currentPeriodEnd: string | null;
  } | null;
  userEmail: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewSettingsContent({
  organization,
  brands,
  subscription,
  userEmail,
}: NewSettingsContentProps) {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, organization, and integrations
        </p>
      </div>

      {/* Organization */}
      <SectionCard title="Organization" description="Your organization details">
        <div className="space-y-4">
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Name"
            value={organization.name}
          />
          <InfoRow
            icon={<Globe className="h-4 w-4" />}
            label="Slug"
            value={organization.slug}
          />
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Account Email"
            value={userEmail ?? "–"}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Created"
            value={new Date(organization.createdAt).toLocaleDateString()}
          />
        </div>
      </SectionCard>

      {/* Subscription */}
      <SectionCard
        title="Subscription"
        description="Your current plan and billing"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings/usage">View Usage</Link>
          </Button>
        }
      >
        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">
                    {subscription.plan}
                  </span>
                  <Badge
                    variant={
                      subscription.status === "active" ? "default" : "secondary"
                    }
                    className="capitalize"
                  >
                    {subscription.status}
                  </Badge>
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renews{" "}
                    {new Date(
                      subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active subscription
          </p>
        )}
      </SectionCard>

      {/* Brands */}
      <SectionCard
        title="Brands"
        description={`${brands.length} brand${brands.length !== 1 ? "s" : ""} configured`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/brand">Manage Brands</Link>
          </Button>
        }
      >
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No brands configured yet
          </p>
        ) : (
          <div className="divide-y">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{brand.name}</p>
                  {brand.website && (
                    <p className="text-xs text-muted-foreground">
                      {brand.website}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(brand.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Integrations & Webhooks */}
      <SectionCard
        title="Integrations & Webhooks"
        description="Connect external services"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link href="/dashboard/settings/webhooks">
              <Webhook className="h-4 w-4" />
              Webhooks
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="justify-start gap-2">
            <Link href="/dashboard/settings/publishing">
              <ExternalLink className="h-4 w-4" />
              Publishing Settings
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
