/**
 * Analytics Dashboard Page - PKG-025
 * Social media performance analytics and AI insights
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@epic-ai/database';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export const metadata = {
  title: 'Analytics | Epic AI',
  description: 'Track your social media performance and discover AI-powered insights',
};

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get user's organization and brand
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    redirect('/onboarding');
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
