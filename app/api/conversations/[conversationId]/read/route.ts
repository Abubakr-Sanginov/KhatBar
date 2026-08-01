import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { markConversationRead } from '@/lib/messenger/service'

const schema = z.object({
  messageId: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const currentUser = await getCurrentUser()
    const { conversationId } = await context.params
    const payload = schema.parse(await request.json())

    const result = await markConversationRead({
      conversationId,
      currentUserId: currentUser.id,
      messageId: payload.messageId,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    )
  }
}
