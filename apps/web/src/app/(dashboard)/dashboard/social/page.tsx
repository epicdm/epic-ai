import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SocialDashboard } from "@/components/social/social-dashboard";

export default async function SocialPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <SocialDashboard />;
}
