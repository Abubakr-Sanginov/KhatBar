import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { MemberRole } from "@/types"

const ROLES: MemberRole[] = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"]

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
    const { memberId, role } = await req.json()
    if (!memberId || !ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const chat = await prisma.chat.findUnique({ where: { id }, include: { members: true } })
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    if (chat.type === "GROUP" && !chat.isPublic && chat.encryptionSalt) {
      return NextResponse.json({ error: "Changing members of an encrypted private group requires a key rotation" }, { status: 409 })
    }
    const me = chat.members.find((m) => m.userId === userId)
    const target = chat.members.find((m) => m.userId === memberId)
    if (!me || !target) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (target.role === "OWNER") return NextResponse.json({ error: "Cannot change the owner" }, { status: 403 })
    const canManage =
      me.role === "OWNER" ||
      (me.role === "ADMIN" &&
        (role === "MODERATOR" || role === "MEMBER") &&
        (target.role === "MODERATOR" || target.role === "MEMBER"))
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (role === "OWNER" && me.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await prisma.chatMember.update({
      where: { userId_chatId: { userId: memberId, chatId: id } },
      data: { role },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await authUser(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get("memberId")
    if (!memberId) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    const chat = await prisma.chat.findUnique({ where: { id }, include: { members: true } })
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    if (chat.type === "GROUP" && !chat.isPublic && chat.encryptionSalt) {
      return NextResponse.json({ error: "Changing members of an encrypted private group requires a key rotation" }, { status: 409 })
    }
    const me = chat.members.find((m) => m.userId === userId)
    const target = chat.members.find((m) => m.userId === memberId)
    if (!me || !target) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (target.role === "OWNER") return NextResponse.json({ error: "Cannot remove the owner" }, { status: 403 })
    const canKick =
      me.role === "OWNER" ||
      (me.role === "ADMIN" && (target.role === "MODERATOR" || target.role === "MEMBER"))
    if (!canKick) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await prisma.chatMember.delete({ where: { userId_chatId: { userId: memberId, chatId: id } } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
