import { NewContentQueue } from "@/components/content/new-content-queue";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Content Queue | Epic AI",
  description: "Manage your AI-generated content pipeline",
};

export default function ContentApprovalPage() {
  return <NewContentQueue />;
}
