import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PostComposer } from "@/components/social/post-composer";

export const dynamic = 'force-dynamic';

export default async function CreatePostPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <PostComposer />;
}
