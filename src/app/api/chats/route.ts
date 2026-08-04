import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUserId, normalizeChatUsername, generateInviteCode } from "@/lib/auth-server"
import crypto from "crypto"

function isEncryptedEnvelope(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 50_000) return false
  try {
    const parsed = JSON.parse(value) as { v?: unknown; iv?: unknown; ciphertext?: unknown }
    return parsed.v === 1 && typeof parsed.iv === "string" && typeof parsed.ciphertext === "string"
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("cookie")?.match(/session_token=([^;]+)/)?.[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const memberships = await prisma.chatMember.findMany({
      where: { userId: session.userId },
    })
    const chatIds = memberships.map((m) => m.chatId)
    const chats = await prisma.chat.findMany({
      where: { id: { in: chatIds } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                lastSeen: true,
                privacyShowStatus: true,
                privacyShowLastSeen: true,
                privacyReadReceipts: true,
                encryptionPublicKey: true,
              },
            },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { call: true } },
        linkedChannel: { select: { id: true, name: true, username: true } },
        linkedGroups: { select: { id: true, name: true, username: true } },
        _count: { select: { members: true } },
      },
    })
    const lastReadMap: Record<string, Date> = {}
    for (const m of memberships) lastReadMap[m.chatId] = m.lastReadAt
    const unreadPairs = await Promise.all(
      chatIds.map((chatId) =>
        prisma.message
          .count({
            where: {
              chatId,
              senderId: { not: session.userId },
              createdAt: { gt: lastReadMap[chatId] ?? new Date(0) },
            },
          })
          .then((n) => [chatId, n] as const),
      ),
    )
    const unreadMap: Record<string, number> = {}
    for (const [chatId, n] of unreadPairs) unreadMap[chatId] = n
    const payload = chats.map((chat) => {
      const lastReadAt = lastReadMap[chat.id]
      const { _count, ...rest } = chat
      return {
        ...rest,
        memberCount: _count.members,
        lastReadAt: lastReadAt?.toISOString() ?? null,
        unreadCount: unreadMap[chat.id] || 0,
        members: chat.members.map((member) => {
          const other = member.user
          if (other.id === session.userId) return member
          return {
            ...member,
            lastReadAt: member.lastReadAt,
            user: {
              ...other,
              status: other.privacyShowStatus ? other.status : "OFFLINE",
              lastSeen: other.privacyShowLastSeen ? other.lastSeen : null,
            },
          }
        }),
      }
    })
    return NextResponse.json({ chats: payload })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const chatType = (body.type === "GROUP" || body.type === "CHANNEL" ? body.type : "PRIVATE") as
      | "PRIVATE"
      | "GROUP"
      | "CHANNEL"
    const ids: string[] = Array.isArray(body.memberIds)
      ? [
          ...new Set(
            (body.memberIds as unknown[]).filter(
              (id): id is string => typeof id === "string" && id !== userId,
            ),
          ),
        ]
      : []

    if (chatType === "PRIVATE") {
      if (ids.length !== 1) {
        return NextResponse.json({ error: "A private chat needs exactly one other person" }, { status: 400 })
      }
      const keyUsers = await prisma.user.findMany({
        where: { id: { in: [userId, ids[0]] } },
        select: { id: true, encryptionPublicKey: true },
      })
      if (keyUsers.length !== 2 || keyUsers.some((user) => !user.encryptionPublicKey)) {
        return NextResponse.json({ error: "Both users must be online once to set up private-chat encryption" }, { status: 409 })
      }
      // Reuse an existing 1:1 chat instead of creating duplicates. Legacy
      // chats receive a salt for all future encrypted messages.
      const existing = await prisma.chat.findFirst({
        where: {
          type: "PRIVATE",
          AND: [{ members: { some: { userId } } }, { members: { some: { userId: ids[0] } } }],
        },
      })
      if (existing) {
        const chat = existing.encryptionSalt
          ? existing
          : await prisma.chat.update({
              where: { id: existing.id },
              data: { encryptionSalt: crypto.randomBytes(32).toString("base64") },
            })
        return NextResponse.json({ chat })
      }

      const chat = await prisma.chat.create({
        data: {
          type: "PRIVATE",
          ownerId: userId,
          encryptionSalt: crypto.randomBytes(32).toString("base64"),
          members: {
            create: [
              { userId, role: "OWNER" },
              { userId: ids[0], role: "MEMBER" },
            ],
          },
        },
      })
      return NextResponse.json({ chat })
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 64) : ""
    if (chatType === "CHANNEL" && !name) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 })
    }

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 255)
        : null
    const isPublic = Boolean(body.isPublic)
    const isPrivateGroup = chatType === "GROUP" && !isPublic
    const { value: username, error: usernameError } = normalizeChatUsername(body.username)
    if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 })

    // A public chat is found by its @username, so it is required there.
    if (isPublic && !username) {
      return NextResponse.json({ error: "A public chat needs a username" }, { status: 400 })
    }
    if (username) {
      const [chatTaken, userTaken] = await Promise.all([
        prisma.chat.findUnique({ where: { username }, select: { id: true } }),
        prisma.user.findUnique({ where: { username }, select: { id: true } }),
      ])
      if (chatTaken || userTaken) {
        return NextResponse.json({ error: "This username is already taken" }, { status: 409 })
      }
    }

    const participantIds = [userId, ...ids]
    let encryptionSalt: string | null = null
    let memberKeyEnvelopes: Record<string, string> | null = null
    if (isPrivateGroup) {
      encryptionSalt = typeof body.encryptionSalt === "string" ? body.encryptionSalt : null
      memberKeyEnvelopes = body.memberKeyEnvelopes && typeof body.memberKeyEnvelopes === "object"
        ? body.memberKeyEnvelopes as Record<string, string>
        : null
      const saltIsValid = encryptionSalt && Buffer.from(encryptionSalt, "base64").length === 32
      const validEnvelopes = memberKeyEnvelopes && participantIds.every((id) => isEncryptedEnvelope(memberKeyEnvelopes![id]))
      if (!saltIsValid || !validEnvelopes || Object.keys(memberKeyEnvelopes!).some((id) => !participantIds.includes(id))) {
        return NextResponse.json({ error: "Private group encryption setup is invalid" }, { status: 400 })
      }
      const keyUsers = await prisma.user.findMany({
        where: { id: { in: participantIds } }, select: { id: true, encryptionPublicKey: true },
      })
      if (keyUsers.length !== participantIds.length || keyUsers.some((member) => !member.encryptionPublicKey)) {
        return NextResponse.json({ error: "Every group member must open KhatBar once to set up encryption" }, { status: 409 })
      }
    }

    // Members added at creation join directly; everyone else uses the link.
    const chat = await prisma.chat.create({
      data: {
        type: chatType,
        name: name || null,
        description,
        username,
        isPublic,
        encryptionSalt,
        inviteCode: generateInviteCode(),
        ownerId: userId,
        members: {
          create: [
            { userId, role: "OWNER", encryptedChatKey: memberKeyEnvelopes?.[userId] },
            ...ids.map((id) => ({ userId: id, role: "MEMBER" as const, encryptedChatKey: memberKeyEnvelopes?.[id] })),
          ],
        },
      },
    })
    return NextResponse.json({ chat })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
