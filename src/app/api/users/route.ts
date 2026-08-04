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

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.userId },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        privacyShowStatus: true,
        privacyShowLastSeen: true,
        encryptionPublicKey: true,
      },
      orderBy: { username: "asc" },
      take: 20,
    })

    const payload = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      status: u.privacyShowStatus ? u.status : "OFFLINE",
      privacyShowStatus: u.privacyShowStatus,
      encryptionPublicKey: u.encryptionPublicKey,
    }))

    return NextResponse.json({ users: payload })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
