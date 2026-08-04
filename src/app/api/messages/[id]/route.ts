import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
