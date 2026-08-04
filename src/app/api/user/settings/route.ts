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
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        role: true,
        privacyShowStatus: true,
        privacyShowLastSeen: true,
        privacyReadReceipts: true,
      },
    })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { privacyShowStatus, privacyShowLastSeen, privacyReadReceipts } = await req.json()
    const data: Record<string, boolean> = {}
    if (typeof privacyShowStatus === "boolean") data.privacyShowStatus = privacyShowStatus
    if (typeof privacyShowLastSeen === "boolean") data.privacyShowLastSeen = privacyShowLastSeen
    if (typeof privacyReadReceipts === "boolean") data.privacyReadReceipts = privacyReadReceipts
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }
    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        role: true,
        privacyShowStatus: true,
        privacyShowLastSeen: true,
        privacyReadReceipts: true,
      },
    })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
