import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("chatId")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = messages.length > limit
    const data = hasMore ? messages.slice(0, limit) : messages

    return NextResponse.json({
      messages: data.reverse(),
      nextCursor: hasMore ? data[0]?.id : null,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { chatId, content, type, mediaUrl, replyToId } = await req.json()
    const message = await prisma.message.create({
      data: {
        content,
        type: type || "TEXT",
        chatId,
        senderId: session.userId,
        mediaUrl: mediaUrl || null,
        replyToId: replyToId || null,
      },
    })
    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}