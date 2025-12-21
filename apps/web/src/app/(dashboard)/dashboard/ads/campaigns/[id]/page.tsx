import { CampaignDetailPage } from "@/components/ads/campaign-detail-page";

export const metadata = {
  title: "Campaign | Ads",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetailPage campaignId={id} />;
}
