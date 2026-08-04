import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function authUser(req: NextRequest) {
  const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) return null
  return session.userId
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await authUser(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const body = await req.json()

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: { select: { userId: true, role: true } } },
    })
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    const me = chat.members.find((m) => m.userId === userId)
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const canManage = me.role === "OWNER" || me.role === "ADMIN"
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if ("linkedChannelId" in body) {
      // Only public groups can be linked to a channel.
      if (chat.type !== "GROUP" || !chat.isPublic) {
        return NextResponse.json({ error: "Only public groups can be linked to a channel" }, { status: 400 })
      }
      const linkedChannelId = body.linkedChannelId
      if (linkedChannelId !== null && typeof linkedChannelId !== "string") {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
      }
      if (linkedChannelId) {
        if (linkedChannelId === chat.id) {
          return NextResponse.json({ error: "A group cannot link to itself" }, { status: 400 })
        }
        const channel = await prisma.chat.findUnique({
          where: { id: linkedChannelId },
          include: { members: { select: { userId: true, role: true } } },
        })
        if (!channel || channel.type !== "CHANNEL") {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 })
        }
        const channelRole = channel.members.find((m) => m.userId === userId)
        if (!channelRole || (channelRole.role !== "OWNER" && channelRole.role !== "ADMIN")) {
          return NextResponse.json({ error: "You must be an owner or admin of the channel" }, { status: 403 })
        }
      }
      await prisma.chat.update({ where: { id }, data: { linkedChannelId: linkedChannelId || null } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown fields" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
