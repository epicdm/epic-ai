import { NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    const orgId = user?.memberships[0]?.organizationId;

    if (!orgId) {
      return NextResponse.json({ agents: [] });
    }

    const agents = await prisma.voiceAgent.findMany({
      where: { organizationId: orgId },
      include: {
        phoneNumbers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching user agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
