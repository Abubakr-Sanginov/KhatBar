import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) return null
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || user.role !== "ADMIN") return null
  return user
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() || ""
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { userId, role } = await req.json()
    if (!userId || !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    if (userId === admin.id && role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 })
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, username: true, role: true },
    })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("id")
    if (!userId) return NextResponse.json({ error: "id required" }, { status: 400 })
    if (userId === admin.id) return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 })
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
