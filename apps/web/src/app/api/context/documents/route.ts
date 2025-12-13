/**
 * Document Upload API - PKG-021
 * GET - List all document uploads for a brand
 * POST - Upload a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { put } from '@vercel/blob';
import { ContextManager } from '@/lib/services/context-engine/manager';
import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to verify brand access
async function verifyBrandAccess(brandId: string, userId: string) {
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      organization: {
        memberships: { some: { userId } },
      },
    },
  });
  return brand;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const documents = await prisma.documentUpload.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: {
        contextSource: {
          select: {
            id: true,
            status: true,
            _count: { select: { contextItems: true } },
          },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        errorMessage: doc.errorMessage,
        processedAt: doc.processedAt,
        pagesCount: doc.pagesCount,
        wordCount: doc.wordCount,
        contextSourceId: doc.contextSourceId,
        contextItemCount: doc.contextSource?._count?.contextItems || 0,
        createdAt: doc.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const brandId = formData.get('brandId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: PDF, TXT, MD, DOCX` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${brandId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });

    // Create document upload record
    const document = await prisma.documentUpload.create({
      data: {
        brandId,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type,
        fileSize: file.size,
        status: 'PENDING',
        uploadedBy: userId,
      },
    });

    // Process document asynchronously
    processDocumentAsync(document.id, brandId, blob.url, file.name, file.type);

    return NextResponse.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        status: document.status,
        createdAt: document.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process document in background
async function processDocumentAsync(
  documentId: string,
  brandId: string,
  fileUrl: string,
  fileName: string,
  mimeType: string
) {
  try {
    // Update status to processing
    await prisma.documentUpload.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    // Create context source and process document
    const manager = new ContextManager(brandId);
    const sourceId = await manager.addSource('PDF_UPLOAD', fileName, {
      fileUrl,
      fileName,
      mimeType,
    });

    // Get word count from context items
    const contextItems = await prisma.contextItem.findMany({
      where: { sourceId },
      select: { content: true },
    });

    const wordCount = contextItems.reduce((total, item) => {
      return total + item.content.split(/\s+/).length;
    }, 0);

    // Update document with results
    await prisma.documentUpload.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        contextSourceId: sourceId,
        processedAt: new Date(),
        wordCount,
      },
    });
  } catch (error) {
    console.error('Document processing failed:', error);
    await prisma.documentUpload.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      },
    });
  }
}
