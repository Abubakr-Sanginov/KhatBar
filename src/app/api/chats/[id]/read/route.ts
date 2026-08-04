import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId: session.userId, chatId: id } },
    })
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const lastReadAt = new Date()
    await prisma.chatMember.update({
      where: { userId_chatId: { userId: session.userId, chatId: id } },
      data: { lastReadAt },
    })
    return NextResponse.json({ success: true, lastReadAt })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
