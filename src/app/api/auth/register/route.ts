import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { isValidEmail, normalizeEmail, normalizeUsername } from "@/lib/auth-input"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = normalizeEmail(body.email)
    const username = normalizeUsername(body.username)
    const password = typeof body.password === "string" ? body.password : ""
    if (!isValidEmail(email) || password.length < 8 || password.length > 256) {
      return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters" }, { status: 400 })
    }
    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    })
    if (existingEmail) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username },
      })
      if (existingUsername) {
        return NextResponse.json({ error: "This username is already taken" }, { status: 409 })
      }
    }
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex")
    const user = await prisma.user.create({
      data: {
        email,
        username: username || null,
        passwordHash,
        displayName: username || null,
      },
    })
    const token = crypto.randomUUID()
    await prisma.session.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role },
      token,
    })
    response.cookies.set("session_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch (e) {
    console.error("Register error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
