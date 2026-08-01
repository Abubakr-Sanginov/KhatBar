import { MessageType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { listMessages, sendMessage } from '@/lib/messenger/service'

const postSchema = z.object({
  body: z.string().min(1),
  type: z.nativeEnum(MessageType).optional(),
  clientNonce: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const currentUser = await getCurrentUser()
    const { conversationId } = await context.params
    const cursor = request.nextUrl.searchParams.get('cursor')

    const messages = await listMessages({
      currentUserId: currentUser.id,
      conversationId,
      cursor,
      limit: 30,
    })

    return NextResponse.json({ ok: true, messages })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const currentUser = await getCurrentUser()
    const { conversationId } = await context.params
    const payload = postSchema.parse(await request.json())

    const message = await sendMessage({
      conversationId,
      currentUserId: currentUser.id,
      body: payload.body,
      type: payload.type,
      clientNonce: payload.clientNonce,
    })

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    )
  }
}
