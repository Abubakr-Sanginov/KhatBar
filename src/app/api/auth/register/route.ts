import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json()
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex")
    const user = await prisma.user.create({
      data: { email, username, passwordHash, displayName: username },
    })
    const token = crypto.randomUUID()
    await prisma.session.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    const response = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } })
    response.cookies.set("session_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}