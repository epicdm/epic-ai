import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/hero";

export const dynamic = "force-dynamic";

export default async function V2HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingHero />;
}
