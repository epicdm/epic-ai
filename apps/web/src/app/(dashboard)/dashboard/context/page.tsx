import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContextEnginePage } from "@/components/context/context-engine-page";

export const metadata = {
  title: "Context Engine | Epic AI",
};

export default async function ContextPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();
  if (!organization) {
    redirect("/onboarding");
  }

  // Get brand with context sources - wrapped in try-catch for resilience
  let brand = null;
  try {
    brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
      include: {
        contextSources: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { contextItems: true } },
          },
        },
        documentUploads: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            contextSources: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching brand for context:", error);
  }

  if (!brand) {
    redirect("/dashboard/brand");
  }

  // Get total context items count - wrapped in try-catch
  let totalContextItems = 0;
  try {
    totalContextItems = await prisma.contextItem.count({
      where: {
        source: { brandId: brand.id },
      },
    });
  } catch (error) {
    console.error("Error counting context items:", error);
  }

  return (
    <ContextEnginePage
      brandId={brand.id}
      brandName={brand.name}
      initialSources={brand.contextSources.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        status: s.status,
        lastSync: s.lastSync,
        syncError: s.syncError,
        itemCount: s._count.contextItems,
        createdAt: s.createdAt,
      }))}
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
      stats={{
        totalSources: brand._count.contextSources,
        totalItems: totalContextItems,
      }}
    />
  );
}
