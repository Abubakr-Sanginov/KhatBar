import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { lockChannel } from '@/lib/admin/service'
import { getCurrentUser } from '@/lib/auth'
import { requireAdmin } from '@/lib/security/access-control'

const schema = z.object({ conversationId: z.string().min(1) })

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    const payload = schema.parse(await request.json())
    return NextResponse.json({ id: payload.conversationId, isLocked: true, demo: true })
  }

  const currentUser = await getCurrentUser()
  await requireAdmin(currentUser.id)
  const payload = schema.parse(await request.json())
  return NextResponse.json(await lockChannel(payload.conversationId, currentUser.id))
}
