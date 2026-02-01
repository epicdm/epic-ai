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
      return NextResponse.json({ stats: {} });
    }

    // Get basic stats
    const [agentCount, callCount, phoneNumberCount] = await Promise.all([
      prisma.voiceAgent.count({ where: { organizationId: orgId } }),
      prisma.callLog.count({ where: { organizationId: orgId } }),
      prisma.phoneNumber.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json({
      stats: {
        agents: agentCount,
        calls: callCount,
        phoneNumbers: phoneNumberCount,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
