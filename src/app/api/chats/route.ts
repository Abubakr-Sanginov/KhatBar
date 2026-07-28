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
    const memberships = await prisma.chatMember.findMany({
      where: { userId: session.userId },
    })
    const chatIds = memberships.map((m) => m.chatId)
    const chats = await prisma.chat.findMany({
      where: { id: { in: chatIds } },
    })
    return NextResponse.json({ chats })
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
    const { type, name, memberIds } = await req.json()
    const chat = await prisma.chat.create({
      data: {
        type: type || "PRIVATE",
        name: name || null,
        ownerId: session.userId,
        members: {
          create: [
            { userId: session.userId, role: "OWNER" },
            ...(memberIds || []).map((id: string) => ({ userId: id, role: "MEMBER" as const })),
          ],
        },
      },
    })
    return NextResponse.json({ chat })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}