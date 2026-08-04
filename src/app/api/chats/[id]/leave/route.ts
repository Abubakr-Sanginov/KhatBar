import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"

/**
 * Leave a group or channel. The owner cannot walk away without handing the
 * chat over first, so ownership always stays resolvable.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId: id } },
      select: { role: true, chat: { select: { type: true } } },
    })
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 404 })
    if (membership.chat.type === "PRIVATE") {
      return NextResponse.json({ error: "Private chats cannot be left" }, { status: 400 })
    }
    if (membership.role === "OWNER") {
      return NextResponse.json(
        { error: "Transfer ownership before leaving" },
        { status: 403 },
      )
    }

    await prisma.chatMember.delete({ where: { userId_chatId: { userId, chatId: id } } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
