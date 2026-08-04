import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,32}$/

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username } = await req.json()
    const clean = username?.trim() as string | undefined
    if (!clean) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }
    if (!USERNAME_REGEX.test(clean)) {
      return NextResponse.json(
        { error: "Username must be 3-32 characters and contain only letters, numbers and underscores" },
        { status: 400 },
      )
    }

    const taken = await prisma.user.findFirst({
      where: { username: { equals: clean, mode: "insensitive" }, id: { not: session.userId } },
    })
    if (taken) {
      return NextResponse.json({ error: "This username is already taken" }, { status: 409 })
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        username: clean,
        displayName: clean,
      },
    })
    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
