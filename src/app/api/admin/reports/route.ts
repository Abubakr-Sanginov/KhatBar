import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/app/api/admin/users/route"

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")?.toUpperCase()
    const reports = await prisma.report.findMany({
      where: status && ["OPEN", "RESOLVED", "DISMISSED"].includes(status) ? { status: status as "OPEN" | "RESOLVED" | "DISMISSED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        reporter: { select: { id: true, email: true, username: true } },
      },
    })
    const chatIds = reports.map((report) => report.chatId).filter((id): id is string => Boolean(id))
    const privateIds = new Set((await prisma.chat.findMany({
      where: { id: { in: chatIds }, NOT: { isPublic: true, type: { in: ["GROUP", "CHANNEL"] } } }, select: { id: true },
    })).map((chat) => chat.id))
    // Reports about closed conversations are intentionally invisible to administrators:
    // accepting a report would disclose that the conversation exists.
    return NextResponse.json({ reports: reports.filter((report) => !report.chatId || !privateIds.has(report.chatId)) })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { id, status } = await req.json()
    if (!id || !["OPEN", "RESOLVED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const report = await prisma.report.findUnique({ where: { id }, select: { chatId: true } })
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    if (report.chatId) {
      const chat = await prisma.chat.findUnique({ where: { id: report.chatId }, select: { type: true, isPublic: true } })
      if (!chat?.isPublic || (chat.type !== "GROUP" && chat.type !== "CHANNEL")) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
      }
    }
    await prisma.report.update({ where: { id }, data: { status } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
