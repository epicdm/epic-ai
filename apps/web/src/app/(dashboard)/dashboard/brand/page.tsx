import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { NewBrandOverview } from "@/components/brand/brand-overview";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Brand Brain | Epic AI",
};

export default async function BrandPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <NewBrandOverview />;
}
