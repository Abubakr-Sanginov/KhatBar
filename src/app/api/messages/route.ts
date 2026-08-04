import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"

const senderSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
} as const

function isEncryptedEnvelope(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 50_000) return false
  try {
    const parsed = JSON.parse(value) as { v?: unknown; iv?: unknown; ciphertext?: unknown }
    return parsed.v === 1 && typeof parsed.iv === "string" && typeof parsed.ciphertext === "string"
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("chatId")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

    // Only members may read a chat's history.
    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId } },
      select: { id: true },
    })
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: senderSelect }, call: true },
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
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { chatId, content, type, mediaUrl, replyToId } = await req.json()
    if (typeof chatId !== "string" || !chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 })
    }

    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId } },
      select: { role: true, chat: { select: { type: true, isPublic: true } } },
    })
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Channels are broadcast-only: subscribers cannot post.
    if (
      membership.chat.type === "CHANNEL" &&
      membership.role !== "OWNER" &&
      membership.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Only admins can post in this channel" }, { status: 403 })
    }

    const isEncryptedChat = membership.chat.type === "PRIVATE" ||
      (membership.chat.type === "GROUP" && !membership.chat.isPublic)
    if (isEncryptedChat && (type !== "TEXT" || mediaUrl || !isEncryptedEnvelope(content))) {
      return NextResponse.json({ error: "Private conversations accept only encrypted text messages" }, { status: 400 })
    }

    const message = await prisma.message.create({
      data: {
        content: typeof content === "string" ? content : null,
        type: type || "TEXT",
        isEncrypted: isEncryptedChat,
        chatId,
        senderId: userId,
        mediaUrl: mediaUrl || null,
        replyToId: replyToId || null,
      },
    })
    const full = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: senderSelect }, call: true },
    })
    return NextResponse.json({ message: full })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
