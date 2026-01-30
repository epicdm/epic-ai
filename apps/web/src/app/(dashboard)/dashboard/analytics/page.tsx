/**
 * Analytics Dashboard Page - PKG-025
 * Social media performance analytics and AI insights
 */

import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewAnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

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
  // In UAT bypass mode, skip auth
  if (isUATBypassEnabled()) {
    return <NewAnalyticsDashboard />;
  }

  const { userId } = await getAuth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <NewAnalyticsDashboard />;
}
