import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlywheelTestPage } from "@/components/test/flywheel-test-page";

export default async function TestPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <FlywheelTestPage />;
}
