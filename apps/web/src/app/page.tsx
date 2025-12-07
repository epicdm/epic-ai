import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/hero";

export default async function HomePage() {
  const { userId } = await auth();

  // If already signed in, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return <LandingHero />;
}
