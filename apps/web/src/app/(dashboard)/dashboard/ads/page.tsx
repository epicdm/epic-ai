import { AdsDashboard } from "@/components/ads/ads-dashboard";

export const metadata = {
  title: "Ads | Epic AI",
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdsDashboard />;
}
