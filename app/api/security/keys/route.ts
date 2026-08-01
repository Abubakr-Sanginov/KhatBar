import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { requireConversationModerator } from '@/lib/security/access-control'
import { rotateConversationKey } from '@/lib/security/key-manager'

const schema = z.object({
  conversationId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, version: 2, demo: true })
  }

  const currentUser = await getCurrentUser()
  const payload = schema.parse(await request.json())
  await requireConversationModerator(currentUser.id, payload.conversationId)
  return NextResponse.json(await rotateConversationKey(payload.conversationId, currentUser.id))
}
