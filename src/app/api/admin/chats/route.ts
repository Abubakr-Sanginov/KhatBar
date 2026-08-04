import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/app/api/admin/users/route"

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const chats = await prisma.chat.findMany({
      where: { isPublic: true, type: { in: ["GROUP", "CHANNEL"] } },
      include: {
        members: { include: { user: { select: { id: true, username: true, displayName: true, email: true } } } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    })
    return NextResponse.json({ chats })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("id")
    if (!chatId) return NextResponse.json({ error: "id required" }, { status: 400 })
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, isPublic: true, type: { in: ["GROUP", "CHANNEL"] } }, select: { id: true },
    })
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    await prisma.chat.delete({ where: { id: chat.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
