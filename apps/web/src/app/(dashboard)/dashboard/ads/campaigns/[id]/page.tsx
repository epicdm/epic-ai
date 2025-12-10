import { CampaignDetailPage } from "@/components/ads/campaign-detail-page";

export const metadata = {
  title: "Campaign | Ads",
};

export default function Page({ params }: { params: { id: string } }) {
  return <CampaignDetailPage campaignId={params.id} />;
}
