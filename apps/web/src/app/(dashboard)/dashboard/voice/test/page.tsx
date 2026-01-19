import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TestConsole } from "@/components/voice/test-console";

export const dynamic = 'force-dynamic';

export default async function TestPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <TestConsole />;
}
