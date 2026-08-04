import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"

/**
 * Join a group or channel, either by invite code (works for private ones) or
 * by @username / id (public only).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : ""
    const username = typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : ""
    const chatId = typeof body.chatId === "string" ? body.chatId.trim() : ""

    if (!inviteCode && !username && !chatId) {
      return NextResponse.json({ error: "Provide an invite code, username or chat id" }, { status: 400 })
    }

    const chat = inviteCode
      ? await prisma.chat.findUnique({ where: { inviteCode } })
      : username
        ? await prisma.chat.findUnique({ where: { username } })
        : await prisma.chat.findUnique({ where: { id: chatId } })

    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    if (chat.type === "PRIVATE") {
      return NextResponse.json({ error: "This chat cannot be joined" }, { status: 400 })
    }
    if (chat.type === "GROUP" && !chat.isPublic && chat.encryptionSalt) {
      return NextResponse.json({ error: "Encrypted private groups can only be created with all members included" }, { status: 403 })
    }
    // Without an invite code, only public chats are joinable.
    if (!inviteCode && !chat.isPublic) {
      return NextResponse.json({ error: "This chat is private" }, { status: 403 })
    }

    const existing = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId: chat.id } },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ chat, alreadyMember: true })

    await prisma.chatMember.create({
      data: { userId, chatId: chat.id, role: "MEMBER" },
    })
    return NextResponse.json({ chat, alreadyMember: false })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
