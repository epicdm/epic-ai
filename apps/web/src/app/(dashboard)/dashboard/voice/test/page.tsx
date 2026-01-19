import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TestConsole } from "@/components/voice/test-console";

export default async function TestPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <TestConsole />;
}
