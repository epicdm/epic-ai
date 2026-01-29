import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NumbersContent } from "./numbers-content";

export const dynamic = "force-dynamic";

export default async function PhoneNumbersPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <NumbersContent />;
}
