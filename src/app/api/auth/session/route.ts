import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ user: null })
    const session = await prisma.session.findUnique({
      where: { token },
    })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null })
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })
    if (!user) return NextResponse.json({ user: null })
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}