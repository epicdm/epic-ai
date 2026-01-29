import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RoutingContent } from "./routing-content";

export const dynamic = "force-dynamic";

export default async function PhoneRoutingPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <RoutingContent />;
}
