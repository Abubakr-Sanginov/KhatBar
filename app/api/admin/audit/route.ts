import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/security/access-control'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([
      {
        id: 'audit_demo_1',
        eventType: 'CHANNEL_LOCKED',
        payloadJson: JSON.stringify({ conversationId: 'conv_general' }),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const currentUser = await getCurrentUser()
  await requireAdmin(currentUser.id)

  return NextResponse.json(
    await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  )
}
