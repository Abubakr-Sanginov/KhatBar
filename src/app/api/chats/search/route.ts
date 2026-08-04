import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"

/** Discovery for public groups and channels, by name or @username. */
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim().replace(/^@/, "")
    if (!q) return NextResponse.json({ chats: [] })

    const chats = await prisma.chat.findMany({
      where: {
        isPublic: true,
        type: { in: ["GROUP", "CHANNEL"] },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        type: true,
        name: true,
        username: true,
        description: true,
        avatarUrl: true,
        _count: { select: { members: true } },
        // Non-empty only when the caller already joined.
        members: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      chats: chats.map(({ _count, members, ...chat }) => ({
        ...chat,
        memberCount: _count.members,
        isMember: members.length > 0,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
