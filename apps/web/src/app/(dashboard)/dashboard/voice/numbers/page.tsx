import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PhoneNumbersPage } from "@/components/voice/phone-numbers-page";

export default async function NumbersPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <PhoneNumbersPage />;
}
