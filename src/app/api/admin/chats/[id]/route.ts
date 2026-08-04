import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/app/api/admin/users/route"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(_req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { id } = await params
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, username: true, displayName: true, status: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { sender: { select: { id: true, email: true, username: true, displayName: true } } },
        },
      },
    })
    if (!chat || !chat.isPublic || (chat.type !== "GROUP" && chat.type !== "CHANNEL")) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }
    return NextResponse.json({ chat })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
