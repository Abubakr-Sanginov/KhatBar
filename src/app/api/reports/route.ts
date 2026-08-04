import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { reason, chatId, messageId } = await req.json()
    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }
    const report = await prisma.report.create({
      data: {
        reason: reason.slice(0, 500),
        chatId: chatId || null,
        messageId: messageId || null,
        reporterId: session.userId,
      },
    })
    return NextResponse.json({ report: { id: report.id, status: report.status } })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
