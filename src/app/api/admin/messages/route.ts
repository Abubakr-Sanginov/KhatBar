import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/app/api/admin/users/route"

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const messages = await prisma.message.findMany({
      where: { chat: { isPublic: true, type: { in: ["GROUP", "CHANNEL"] } } },
      include: {
        sender: { select: { id: true, username: true, displayName: true, email: true } },
        chat: { select: { id: true, type: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("id")
    if (!messageId) return NextResponse.json({ error: "id required" }, { status: 400 })
    const message = await prisma.message.findFirst({
      where: { id: messageId, chat: { isPublic: true, type: { in: ["GROUP", "CHANNEL"] } } },
      select: { id: true },
    })
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
    await prisma.message.delete({ where: { id: message.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
