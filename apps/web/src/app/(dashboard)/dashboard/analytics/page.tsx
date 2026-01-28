/**
 * Analytics Dashboard Page - PKG-025
 * Social media performance analytics and AI insights
 */

import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@epic-ai/database';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

// UAT bypass - allows testing without database when explicitly enabled
function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics | Epic AI',
  description: 'Track your social media performance and discover AI-powered insights',
};

export default async function AnalyticsPage() {
  // In UAT bypass mode, return mock data without database queries
  if (isUATBypassEnabled()) {
    return (
      <div className="p-6">
        <AnalyticsDashboard
          orgId="uat_test_org_001"
          brandId="uat_test_brand_001"
        />
      </div>
    );
  }

  const { userId } = await getAuth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user's organization and brand
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!membership) {
    throw new Error("Organization membership not found - please contact support");
  }

  const brand = await prisma.brand.findFirst({
    where: { organizationId: membership.organizationId },
  });

  return (
    <div className="p-6">
      <AnalyticsDashboard
        orgId={membership.organizationId}
        brandId={brand?.id}
      />
    </div>
  );
}
