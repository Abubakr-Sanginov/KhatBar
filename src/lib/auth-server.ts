import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

/** Reads the session cookie and returns the user id, or null when invalid. */
export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) return null
  return session.userId
}

const USERNAME_RE = /^[a-zA-Z0-9_]{5,32}$/

export function normalizeChatUsername(raw: unknown): { value: string | null; error: string | null } {
  if (raw === undefined || raw === null || raw === "") return { value: null, error: null }
  if (typeof raw !== "string") return { value: null, error: "Invalid username" }
  const value = raw.trim().replace(/^@/, "")
  if (!USERNAME_RE.test(value)) {
    return { value: null, error: "Username must be 5-32 characters: letters, digits or underscore" }
  }
  return { value, error: null }
}

/** Short, URL-safe invite code. */
export function generateInviteCode(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
