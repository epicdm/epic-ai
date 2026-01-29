import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewSocialDashboard } from "@/components/social/new-social-dashboard";

export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <NewSocialDashboard />;
}
