import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "video/webm": ".webm",
  "video/mp4": ".mp4",
  "application/pdf": ".pdf",
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const form = (await req.formData()) as unknown as { get(name: string): File | null }
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 })
    }

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`
    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
