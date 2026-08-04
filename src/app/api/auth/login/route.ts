import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { isValidEmail, normalizeEmail } from "@/lib/auth-input"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = normalizeEmail(body.email)
    const password = typeof body.password === "string" ? body.password : ""
    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: "Enter your email and password" }, { status: 400 })
    }
    // Case-insensitive lookup also supports accounts created before email
    // canonicalization was introduced.
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
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
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        lastSeen: user.lastSeen,
        privacyShowStatus: user.privacyShowStatus,
        privacyShowLastSeen: user.privacyShowLastSeen,
        privacyReadReceipts: user.privacyReadReceipts,
      },
      token,
    })
    response.cookies.set("session_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
