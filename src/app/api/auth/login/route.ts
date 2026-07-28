import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    const hash = crypto.createHash("sha256").update(password).digest("hex")
    if (hash !== user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    const token = crypto.randomUUID()
    await prisma.session.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    await prisma.user.update({ where: { id: user.id }, data: { status: "ONLINE" } })
    const response = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } })
    response.cookies.set("session_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}