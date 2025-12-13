/**
 * n8n Webhook Handler
 * Receives webhook calls from n8n workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import crypto from 'crypto';

// Verify webhook signature from n8n
function verifySignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-n8n-signature');
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('N8N_WEBHOOK_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }

  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST - Handle n8n webhook
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify signature
  if (!verifySignature(request, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let data: {
    action: string;
    brandId?: string;
    payload?: Record<string, unknown>;
  };

  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, brandId, payload } = data;

  try {
    switch (action) {
      // Trigger content generation
      case 'generate_content': {
        if (!brandId) {
          return NextResponse.json({ error: 'brandId required' }, { status: 400 });
        }

        // Create a job for content generation
        const job = await prisma.job.create({
          data: {
            type: 'GENERATE_CONTENT',
            brandId,
            payload: JSON.parse(JSON.stringify(payload || {})),
            status: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          jobId: job.id,
          message: 'Content generation job queued',
        });
      }

      // Trigger context scraping
      case 'scrape_context': {
        if (!brandId) {
          return NextResponse.json({ error: 'brandId required' }, { status: 400 });
        }

        const job = await prisma.job.create({
          data: {
            type: 'SCRAPE_WEBSITE',
            brandId,
            payload: JSON.parse(JSON.stringify(payload || {})),
            status: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          jobId: job.id,
          message: 'Scraping job queued',
        });
      }

      // Sync analytics
      case 'sync_analytics': {
        if (!brandId) {
          return NextResponse.json({ error: 'brandId required' }, { status: 400 });
        }

        const job = await prisma.job.create({
          data: {
            type: 'SYNC_ANALYTICS',
            brandId,
            payload: {},
            status: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          jobId: job.id,
          message: 'Analytics sync job queued',
        });
      }

      // Publish content immediately
      case 'publish_now': {
        const contentId = payload?.contentId as string;
        if (!contentId) {
          return NextResponse.json({ error: 'contentId required' }, { status: 400 });
        }

        const job = await prisma.job.create({
          data: {
            type: 'PUBLISH_CONTENT',
            payload: { contentId },
            status: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          jobId: job.id,
          message: 'Publish job queued',
        });
      }

      // Create lead from external source
      case 'create_lead': {
        if (!brandId || !payload) {
          return NextResponse.json(
            { error: 'brandId and payload required' },
            { status: 400 }
          );
        }

        // Get the brand to find the organization
        const brand = await prisma.brand.findUnique({
          where: { id: brandId },
          select: { organizationId: true },
        });

        if (!brand) {
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        const lead = await prisma.lead.create({
          data: {
            organizationId: brand.organizationId,
            brandId,
            firstName: (payload.firstName as string) || 'Unknown',
            lastName: payload.lastName as string,
            email: payload.email as string,
            phone: payload.phone as string,
            company: payload.company as string,
            source: 'WEBSITE',
            sourcePlatform: 'n8n',
            notes: payload.notes as string,
            customFields: JSON.parse(JSON.stringify(payload.customFields || {})),
          },
        });

        return NextResponse.json({
          success: true,
          leadId: lead.id,
          message: 'Lead created',
        });
      }

      // Update content status
      case 'update_content_status': {
        const contentId = payload?.contentId as string;
        const status = payload?.status as string;

        if (!contentId || !status) {
          return NextResponse.json(
            { error: 'contentId and status required' },
            { status: 400 }
          );
        }

        await prisma.contentItem.update({
          where: { id: contentId },
          data: { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' },
        });

        return NextResponse.json({
          success: true,
          message: 'Content status updated',
        });
      }

      // Custom workflow trigger
      case 'custom': {
        // Log custom webhook for debugging
        console.log('[n8n] Custom webhook received:', payload);

        return NextResponse.json({
          success: true,
          message: 'Custom webhook received',
          received: payload,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[n8n] Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check for n8n
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'epic-ai-n8n-webhook',
    timestamp: new Date().toISOString(),
  });
}
