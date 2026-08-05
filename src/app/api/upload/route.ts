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

/** Minimal magic-byte validation so a claimed MIME cannot be spoofed. */
function matchesSignature(mime: string, buf: Uint8Array): boolean {
  const sig = (bytes: number[]) =>
    bytes.every((b, i) => buf[i] === b)
  switch (mime) {
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    case "image/png":
      return sig([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "image/webp":
      return sig([0x52, 0x49, 0x46, 0x46]) && sig([0x57, 0x45, 0x42, 0x50])
    case "image/gif":
      return sig([0x47, 0x49, 0x46, 0x38]) // GIF8
    case "audio/webm":
    case "video/webm":
      return sig([0x1a, 0x45, 0xdf, 0xa3])
    case "video/mp4":
      return sig([0x00, 0x00, 0x00]) && (buf[4] === 0x66 || buf[4] === 0x6d || buf[4] === 0x69 || buf[4] === 0x6d) // ftyp/moov
    case "audio/mpeg":
      return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
    case "application/pdf":
      return sig([0x25, 0x50, 0x44, 0x46]) // %PDF
    default:
      return true
  }
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
    if (!matchesSignature(file.type, new Uint8Array(buffer.subarray(0, 16)))) {
      return NextResponse.json({ error: "File content does not match its type" }, { status: 400 })
    }
    await writeFile(path.join(dir, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
