import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"
import { getIO } from "@/server/socket"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const chatId = new URL(req.url).searchParams.get("chatId")
    const hard = new URL(req.url).searchParams.get("hard") === "true"
    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

    const message = await prisma.message.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
    if (message.senderId !== userId || message.chatId !== chatId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId } },
      select: { id: true },
    })
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (hard) {
      if (message.content !== null || message.mediaUrl !== null) {
        return NextResponse.json({ error: "Message must be redacted before permanent deletion" }, { status: 409 })
      }
      await prisma.message.delete({ where: { id } })
      getIO()?.to(`chat:${chatId}`).emit("message:deleted-hard", { chatId, messageId: id })
    } else {
      await prisma.message.update({ where: { id }, data: { content: null, mediaUrl: null } })
      getIO()?.to(`chat:${chatId}`).emit("message:deleted", { chatId, messageId: id })
    }
    return NextResponse.json({ success: true, hard })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const { isPinned } = await req.json()

    const message = await prisma.message.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })

    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId: session.userId, chatId: message.chatId } },
    })
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await prisma.message.update({ where: { id }, data: { isPinned: !!isPinned } })
    return NextResponse.json({ success: true, isPinned: !!isPinned })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
