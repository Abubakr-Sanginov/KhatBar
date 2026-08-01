import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { getOrCreateDirectConversation } from '@/lib/messenger/service'

const schema = z.object({ otherUserId: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    const payload = schema.parse(await request.json())
    const conversation = await getOrCreateDirectConversation({
      currentUserId: currentUser.id,
      otherUserId: payload.otherUserId,
    })

    return NextResponse.json({ ok: true, conversation })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    )
  }
}
