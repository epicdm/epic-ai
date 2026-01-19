import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SocialAccountsPage } from "@/components/social/social-accounts-page";

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <SocialAccountsPage />;
}
