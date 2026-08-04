import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth-server"

export async function PUT(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { publicKey } = await req.json()
    if (typeof publicKey !== "string" || publicKey.length > 2_000) {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 })
    }
    const key = JSON.parse(publicKey) as { kty?: string; crv?: string; x?: string; y?: string }
    if (key.kty !== "EC" || key.crv !== "P-256" || typeof key.x !== "string" || typeof key.y !== "string") {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 })
    }
    await prisma.user.update({ where: { id: userId }, data: { encryptionPublicKey: publicKey } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid public key" }, { status: 400 })
  }
}
