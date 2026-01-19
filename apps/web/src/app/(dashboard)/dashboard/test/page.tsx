import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TestPage } from "@/components/test/test-page";

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <TestPage />;
}
