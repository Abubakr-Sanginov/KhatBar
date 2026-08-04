import { createServer } from "http"
import { Server, type Socket } from "socket.io"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

let io: Server | null = null
let prisma: PrismaClient | null = null
const userSockets = new Map<string, Set<string>>()
const disconnectGraceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DISCONNECT_GRACE_MS = 20_000

interface CallPeer {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

/** Profile snapshot for every connected user, so calls can describe peers. */
const userProfiles = new Map<string, CallPeer>()

function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}

function sendToUser(userId: string, event: string, payload: unknown) {
  userSockets.get(userId)?.forEach((socketId) => {
    io?.sockets.sockets.get(socketId)?.emit(event, payload)
  })
}

function isUserOnline(userId: string) {
  return (userSockets.get(userId)?.size ?? 0) > 0
}

function clearDisconnectGrace(userId: string) {
  const timer = disconnectGraceTimers.get(userId)
  if (timer) clearTimeout(timer)
  disconnectGraceTimers.delete(userId)
}

export function getIO() {
  return io
}

const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  role: true,
}

type AuthedSocket = Socket & {
  user: {
    id: string
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    privacyShowStatus: boolean
  }
}

type MessageType = "TEXT" | "IMAGE" | "GIF" | "STICKER" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM" | "CALL"

function isEncryptedEnvelope(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 50_000) return false
  try {
    const parsed = JSON.parse(value) as { v?: unknown; iv?: unknown; ciphertext?: unknown }
    return parsed.v === 1 && typeof parsed.iv === "string" && typeof parsed.ciphertext === "string"
  } catch {
    return false
  }
}

type CallMode = "voice" | "video"

type CallEndReason = "hangup" | "declined" | "canceled" | "busy" | "unanswered" | "failed" | "media-denied"

interface CallSession {
  callId: string
  chatId: string
  chatName: string
  mode: CallMode
  isGroup: boolean
  starterId: string
  /** Users who accepted and are exchanging media. */
  joined: Set<string>
  /** Users invited but still ringing. */
  invited: Set<string>
  createdAt: number
  answeredAt: number | null
  dbCallId: string | null
  /** Resolves once the Call row exists; awaited before writing the summary. */
  persisted: Promise<void> | null
}

/** Active calls by callId, plus a reverse index so disconnects are cheap. */
const calls = new Map<string, CallSession>()
const userCalls = new Map<string, Set<string>>()

function callPeer(u: CallPeer): CallPeer {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }
}

/** True while the user is attached to the call, whether ringing or talking. */
function isInCall(session: CallSession, userId: string): boolean {
  return session.joined.has(userId) || session.invited.has(userId)
}

function trackUserCall(userId: string, callId: string) {
  if (!userCalls.has(userId)) userCalls.set(userId, new Set())
  userCalls.get(userId)!.add(callId)
}

function untrackUserCall(userId: string, callId: string) {
  const set = userCalls.get(userId)
  if (!set) return
  set.delete(callId)
  if (set.size === 0) userCalls.delete(userId)
}

async function persistCallStart(session: CallSession) {
  try {
    const call = await getPrisma().call.create({
      data: {
        chatId: session.chatId,
        starterId: session.starterId,
        isVideo: session.mode === "video",
        status: "ONGOING",
      },
    })
    session.dbCallId = call.id
  } catch (e) {
    console.error("[call] persist start failed:", e)
  }
}

const REASON_TO_STATUS: Record<CallEndReason, "ENDED" | "MISSED" | "DECLINED" | "CANCELED"> = {
  hangup: "ENDED",
  declined: "DECLINED",
  canceled: "CANCELED",
  busy: "DECLINED",
  unanswered: "MISSED",
  failed: "ENDED",
  "media-denied": "DECLINED",
}

/**
 * Close out a call: persist the summary, drop a CALL message into the chat so
 * the history shows it, then notify everyone still attached.
 */
async function finalizeCall(session: CallSession, reason: CallEndReason) {
  calls.delete(session.callId)
  for (const uid of [...session.joined, ...session.invited]) untrackUserCall(uid, session.callId)

  const endedAt = new Date()
  const answered = session.answeredAt !== null
  const durationSec = answered ? Math.max(0, Math.round((endedAt.getTime() - session.answeredAt!) / 1000)) : 0
  const status = answered ? "ENDED" : REASON_TO_STATUS[reason]

  // A very short call can end before the insert lands; wait for it.
  if (session.persisted) await session.persisted.catch(() => {})
  if (!session.dbCallId) return
  try {
    await getPrisma().call.update({
      where: { id: session.dbCallId },
      data: {
        status,
        endedAt,
        durationSec,
        answeredAt: session.answeredAt ? new Date(session.answeredAt) : null,
      },
    })
    const message = await getPrisma().message.create({
      data: {
        type: "CALL",
        content: null,
        chatId: session.chatId,
        senderId: session.starterId,
        callId: session.dbCallId,
      },
    })
    const full = await getPrisma().message.findUnique({
      where: { id: message.id },
      include: { sender: { select: userSelect }, call: true },
    })
    if (full) io?.to(`chat:${session.chatId}`).emit("message:new", full)
  } catch (e) {
    console.error("[call] persist end failed:", e)
  }
}

function endCall(session: CallSession, reason: CallEndReason, excludeUserId?: string) {
  for (const uid of [...session.joined, ...session.invited]) {
    if (uid === excludeUserId) continue
    sendToUser(uid, "call:ended", { callId: session.callId, reason })
  }
  void finalizeCall(session, reason)
}

/** Called on disconnect: detach the user from every call they were part of. */
function leaveAllCalls(userId: string) {
  const callIds = [...(userCalls.get(userId) ?? [])]
  for (const callId of callIds) {
    const session = calls.get(callId)
    if (!session) {
      untrackUserCall(userId, callId)
      continue
    }
    removeFromCall(session, userId, "hangup")
  }
}

function removeFromCall(session: CallSession, userId: string, reason: CallEndReason) {
  const wasJoined = session.joined.delete(userId)
  const wasInvited = session.invited.delete(userId)
  untrackUserCall(userId, session.callId)
  if (!wasJoined && !wasInvited) return

  const remaining = [...session.joined, ...session.invited]
  // A 1:1 call, or the last participant leaving, terminates the whole call.
  const shouldEnd = !session.isGroup || session.joined.size === 0 || remaining.length === 0

  if (shouldEnd) {
    endCall(session, reason, userId)
    return
  }
  for (const uid of remaining) {
    sendToUser(uid, wasJoined ? "call:peer-left" : "call:declined", {
      callId: session.callId,
      peerId: userId,
      reason,
    })
  }
}

function registerCallHandlers(socket: AuthedSocket) {
  const user = socket.user
  const userId = user.id

  socket.on("call:invite", async (data: { callId: string; chatId: string; mode: CallMode; targetIds: string[] }) => {
    if (!data?.callId || !data?.chatId || !Array.isArray(data.targetIds)) return
    if (calls.has(data.callId)) return
    try {
      const chat = await getPrisma().chat.findUnique({
        where: { id: data.chatId },
        include: { members: { select: { userId: true } } },
      })
      if (!chat) return
      const memberIds = new Set(chat.members.map((m) => m.userId))
      if (!memberIds.has(userId)) return
      const targets = data.targetIds.filter((id) => id !== userId && memberIds.has(id))
      if (targets.length === 0) return
      // Nobody to ring: fail fast instead of leaving the caller listening to ringback.
      const reachable = targets.filter(isUserOnline)
      if (reachable.length === 0) {
        sendToUser(userId, "call:ended", { callId: data.callId, reason: "unanswered" })
        return
      }

      const mode: CallMode = data.mode === "video" ? "video" : "voice"
      const chatName = chat.type === "PRIVATE" ? "" : chat.name || "Group call"
      const session: CallSession = {
        callId: data.callId,
        chatId: data.chatId,
        chatName,
        mode,
        isGroup: chat.type !== "PRIVATE",
        starterId: userId,
        joined: new Set([userId]),
        invited: new Set(reachable),
        createdAt: Date.now(),
        answeredAt: null,
        dbCallId: null,
        persisted: null,
      }
      calls.set(session.callId, session)
      trackUserCall(userId, session.callId)
      for (const id of reachable) trackUserCall(id, session.callId)

      const payload = {
        callId: session.callId,
        chatId: session.chatId,
        chatName: session.chatName,
        mode: session.mode,
        isGroup: session.isGroup,
        caller: callPeer(user),
      }
      // Ring first, persist after: the DB round-trip must not delay the invite.
      for (const id of reachable) sendToUser(id, "call:invite", payload)
      session.persisted = persistCallStart(session)
    } catch (e) {
      console.error("[call] invite failed:", e)
    }
  })

  socket.on("call:accept", (data: { callId: string }) => {
    const session = calls.get(data?.callId)
    if (!session || !session.invited.has(userId)) return
    session.invited.delete(userId)
    session.joined.add(userId)
    if (session.answeredAt === null) session.answeredAt = Date.now()

    const peer = callPeer(user)
    // Tell the inviter first: it becomes the offerer for this peer.
    sendToUser(session.starterId, "call:accepted", { callId: session.callId, peer })
    // Everyone else already in the call meets the newcomer; ids decide who offers.
    for (const uid of session.joined) {
      if (uid === userId || uid === session.starterId) continue
      sendToUser(uid, "call:peer-joined", { callId: session.callId, peer, initiator: uid < userId })
      const other = userProfiles.get(uid)
      if (other) {
        sendToUser(userId, "call:peer-joined", { callId: session.callId, peer: other, initiator: userId < uid })
      }
    }
    // Peers still ringing are shown to the newcomer so the roster is complete.
    for (const uid of session.invited) {
      const pending = userProfiles.get(uid)
      if (pending) sendToUser(userId, "call:peer-ringing", { callId: session.callId, peer: pending })
    }
  })

  socket.on("call:decline", (data: { callId: string; reason?: CallEndReason }) => {
    const session = calls.get(data?.callId)
    if (!session) return
    removeFromCall(session, userId, data?.reason === "unanswered" ? "unanswered" : "declined")
  })

  socket.on("call:busy", (data: { callId: string }) => {
    const session = calls.get(data?.callId)
    if (!session) return
    removeFromCall(session, userId, "busy")
  })

  socket.on("call:end", (data: { callId: string; reason?: CallEndReason }) => {
    const session = calls.get(data?.callId)
    if (!session) return
    if (isInCall(session, userId)) {
      removeFromCall(session, userId, data?.reason ?? "hangup")
    }
  })

  socket.on("call:signal", (data: { callId: string; targetId: string; payload: unknown }) => {
    const session = calls.get(data?.callId)
    if (!session || !data?.targetId) return
    // Accept signals from anyone attached to the call, including a peer that is
    // still ringing: an accepting side can emit its first offer before the
    // server processes its `call:accept`, and dropping it would deadlock
    // negotiation when that side is the impolite one.
    if (!isInCall(session, userId)) return
    if (!isInCall(session, data.targetId)) return
    sendToUser(data.targetId, "call:signal", {
      callId: session.callId,
      fromId: userId,
      payload: data.payload,
    })
  })

  socket.on("call:media-state", (data: { callId: string; isMuted: boolean; isCameraOff: boolean }) => {
    const session = calls.get(data?.callId)
    if (!session || !session.joined.has(userId)) return
    for (const uid of session.joined) {
      if (uid === userId) continue
      sendToUser(uid, "call:media-state", {
        callId: session.callId,
        peerId: userId,
        isMuted: Boolean(data.isMuted),
        isCameraOff: Boolean(data.isCameraOff),
      })
    }
  })
}

export function initSocketServer(httpServer: ReturnType<typeof createServer>) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error("Unauthorized"))
    try {
      const session = await getPrisma().session.findUnique({ where: { token } })
      if (!session || session.expiresAt < new Date()) return next(new Error("Unauthorized"))
      const user = await getPrisma().user.findUnique({ where: { id: session.userId } })
      if (!user) return next(new Error("Unauthorized"))
      ;(socket as AuthedSocket).user = user
      next()
    } catch (e) {
      console.error("[socket] auth error:", e)
      next(new Error("Unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    const user = (socket as AuthedSocket).user
    const userId = user.id

    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    clearDisconnectGrace(userId)
    userSockets.get(userId)!.add(socket.id)
    userProfiles.set(userId, callPeer(user))

    getPrisma().user.update({ where: { id: userId }, data: { status: "ONLINE", lastSeen: new Date() } }).catch(() => {})
    if (user.privacyShowStatus) {
      socket.broadcast.emit("presence:update", { userId, status: "ONLINE" })
    }

    socket.on("disconnect", async () => {
      userSockets.get(userId)?.delete(socket.id)
      const stillOnline = (userSockets.get(userId)?.size ?? 0) > 0
      if (!stillOnline) {
        // A screen-share permission prompt or a short network hiccup can
        // reconnect the socket. Keep the call alive during that window.
        clearDisconnectGrace(userId)
        disconnectGraceTimers.set(userId, setTimeout(() => {
          if (isUserOnline(userId)) return
          userSockets.delete(userId)
          userProfiles.delete(userId)
          leaveAllCalls(userId)
          disconnectGraceTimers.delete(userId)
        }, DISCONNECT_GRACE_MS))
      }
      getPrisma()
        .user.update({ where: { id: userId }, data: { status: "OFFLINE", lastSeen: new Date() } })
        .catch(() => {})
      if (user.privacyShowStatus) {
        socket.broadcast.emit("presence:update", { userId, status: "OFFLINE" })
      }
    })

    socket.on("join:chat", async (chatId: string) => {
      if (typeof chatId !== "string") return
      const membership = await getPrisma().chatMember.findUnique({
        where: { userId_chatId: { userId, chatId } }, select: { id: true },
      })
      if (membership) socket.join(`chat:${chatId}`)
    })
    socket.on("leave:chat", (chatId: string) => socket.leave(`chat:${chatId}`))

    socket.on("chat:read", async (chatId: string) => {
      const lastReadAt = new Date()
      try {
        const membership = await getPrisma().chatMember.update({
          where: { userId_chatId: { userId, chatId } },
          data: { lastReadAt },
        })
        if (!membership) return
      } catch {}
      // Do not emit when the membership update failed (including an unknown chat).
      const member = await getPrisma().chatMember.findUnique({ where: { userId_chatId: { userId, chatId } }, select: { id: true } })
      if (member) io?.to(`chat:${chatId}`).emit("chat:read", { chatId, userId, lastReadAt })
    })

    socket.on("typing", async (data: { chatId: string; isTyping: boolean }) => {
      if (!data?.chatId) return
      const membership = await getPrisma().chatMember.findUnique({
        where: { userId_chatId: { userId, chatId: data.chatId } }, select: { id: true },
      })
      if (membership) socket.to(`chat:${data.chatId}`).emit("typing", { chatId: data.chatId, userId, isTyping: data.isTyping })
    })

    socket.on("message:send", async (data: { chatId: string; content: string; type?: string; mediaUrl?: string; replyToId?: string }) => {
      try {
        const membership = await getPrisma().chatMember.findUnique({
          where: { userId_chatId: { userId, chatId: data.chatId } },
          select: { role: true, chat: { select: { type: true, isPublic: true } } },
        })
        if (!membership) {
          socket.emit("message:error", { chatId: data.chatId, error: "Not a member of this chat" })
          return
        }
        // Channels are broadcast-only: subscribers cannot post.
        if (
          membership.chat.type === "CHANNEL" &&
          membership.role !== "OWNER" &&
          membership.role !== "ADMIN"
        ) {
          socket.emit("message:error", {
            chatId: data.chatId,
            error: "Only admins can post in this channel",
          })
          return
        }
        const isEncryptedChat = membership.chat.type === "PRIVATE" ||
          (membership.chat.type === "GROUP" && !membership.chat.isPublic)
        if (isEncryptedChat && (data.type && data.type !== "TEXT" || data.mediaUrl || !isEncryptedEnvelope(data.content))) {
          socket.emit("message:error", { chatId: data.chatId, error: "Private conversations accept only encrypted text messages" })
          return
        }
        const message = await getPrisma().message.create({
          data: {
            content: data.content,
            type: (data.type as MessageType) || "TEXT",
            isEncrypted: isEncryptedChat,
            chatId: data.chatId,
            senderId: userId,
            mediaUrl: data.mediaUrl || null,
            replyToId: data.replyToId || null,
          },
        })
        const full = await getPrisma().message.findUnique({
          where: { id: message.id },
          include: { sender: { select: userSelect }, call: true },
        })
        if (full) {
          io?.to(`chat:${data.chatId}`).emit("message:new", full)
        }
      } catch {
        socket.emit("message:error", { chatId: data.chatId, error: "Failed to send message" })
      }
    })

    socket.on("message:delete", async (data: { chatId: string; messageId: string; hard?: boolean }) => {
      try {
        const msg = await getPrisma().message.findUnique({ where: { id: data.messageId } })
        if (!msg) return
        if (msg.senderId !== userId || msg.chatId !== data.chatId) return
        if (data.hard) {
          await getPrisma().message.delete({ where: { id: data.messageId } })
          io?.to(`chat:${data.chatId}`).emit("message:deleted-hard", { chatId: data.chatId, messageId: data.messageId })
        } else {
          await getPrisma().message.update({ where: { id: data.messageId }, data: { content: null, mediaUrl: null } })
          io?.to(`chat:${data.chatId}`).emit("message:deleted", { chatId: data.chatId, messageId: data.messageId })
        }
      } catch {}
    })

    registerCallHandlers(socket as AuthedSocket)
  })

  return io
}
