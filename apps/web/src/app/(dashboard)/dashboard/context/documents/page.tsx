import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContextDocumentsPage } from "@/components/context/context-documents-page";

export const metadata = {
  title: "Documents | Context Engine | Epic AI",
};

export default async function DocumentsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();
  if (!organization) {
    throw new Error("Organization not found - please contact support");
  }

  // Get brand with document uploads
  let brand = null;
  try {
    brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
      include: {
        documentUploads: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching brand for documents:", error);
  }

  if (!brand) {
    redirect("/dashboard/brand");
  }

  return (
    <ContextDocumentsPage
      brandId={brand.id}
      brandName={brand.name}
      initialDocuments={brand.documentUploads.map(d => ({
        id: d.id,
        fileName: d.fileName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        status: d.status,
        errorMessage: d.errorMessage,
        processedAt: d.processedAt,
        createdAt: d.createdAt,
      }))}
    />
  );
}
