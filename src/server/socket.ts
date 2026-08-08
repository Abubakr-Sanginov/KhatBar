import { createServer } from "http"
import { Server, type Socket } from "socket.io"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

let io: Server | null = null
let prisma: PrismaClient | null = null
const userSockets = new Map<string, Set<string>>()
const disconnectGraceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DISCONNECT_GRACE_MS = 20_000

interface LocalDeviceProfile {
  deviceId: string
  name: string
  publicKey: string
}

interface LocalPairingSession {
  code: string
  ownerUserId: string
  ownerSocketId: string
  owner: LocalDeviceProfile
  offer: unknown
  expiresAt: number
}

const localDevices = new Map<string, { userId: string; socketId: string; profile: LocalDeviceProfile }>()
const localPairingSessions = new Map<string, LocalPairingSession>()
const LOCAL_PAIRING_TTL_MS = 120_000
const LOCAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4,12}$/

function normalizeLocalCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "") : ""
}

function validLocalProfile(value: unknown): value is LocalDeviceProfile {
  if (!value || typeof value !== "object") return false
  const profile = value as Partial<LocalDeviceProfile>
  return typeof profile.deviceId === "string" && profile.deviceId.length <= 128 &&
    typeof profile.name === "string" && profile.name.length <= 128 &&
    typeof profile.publicKey === "string" && profile.publicKey.length <= 16_000
}

function pruneLocalPairingSessions() {
  const now = Date.now()
  for (const [code, session] of localPairingSessions) {
    if (session.expiresAt <= now || !io?.sockets.sockets.has(session.ownerSocketId)) {
      localPairingSessions.delete(code)
    }
  }
}

function registerLocalChatHandlers(socket: AuthedSocket) {
  const userId = socket.user.id

  socket.on("local:register", (profile: unknown) => {
    if (!validLocalProfile(profile)) return
    localDevices.set(profile.deviceId, { userId, socketId: socket.id, profile })
    socket.emit("local:registered", { deviceId: profile.deviceId })
  })

  socket.on("local:pair:create", (data: { code?: unknown; offer?: unknown; profile?: unknown }) => {
    pruneLocalPairingSessions()
    const code = normalizeLocalCode(data?.code)
    if (!LOCAL_CODE_PATTERN.test(code) || !validLocalProfile(data?.profile) || !data?.offer) {
      socket.emit("local:pair:error", { code, error: "Invalid pairing request" })
      return
    }
    const existing = localPairingSessions.get(code)
    if (existing && existing.ownerSocketId !== socket.id) {
      socket.emit("local:pair:error", { code, error: "This code is already in use" })
      return
    }
    localDevices.set(data.profile.deviceId, { userId, socketId: socket.id, profile: data.profile })
    localPairingSessions.set(code, {
      code,
      ownerUserId: userId,
      ownerSocketId: socket.id,
      owner: data.profile,
      offer: data.offer,
      expiresAt: Date.now() + LOCAL_PAIRING_TTL_MS,
    })
    socket.emit("local:pair:created", { code, expiresAt: Date.now() + LOCAL_PAIRING_TTL_MS })
  })

  socket.on("local:pair:join", (data: { code?: unknown; profile?: unknown }) => {
    pruneLocalPairingSessions()
    const code = normalizeLocalCode(data?.code)
    const session = localPairingSessions.get(code)
    if (!session || !validLocalProfile(data?.profile)) {
      socket.emit("local:pair:error", { code, error: "Pairing code was not found or expired" })
      return
    }
    if (session.ownerSocketId === socket.id || session.owner.deviceId === data.profile.deviceId) {
      socket.emit("local:pair:error", { code, error: "You cannot pair this device with itself" })
      return
    }
    localDevices.set(data.profile.deviceId, { userId, socketId: socket.id, profile: data.profile })
    socket.emit("local:pair:offer", { code, offer: session.offer, peer: session.owner })
  })

  socket.on("local:pair:answer", (data: { code?: unknown; answer?: unknown; profile?: unknown }) => {
    pruneLocalPairingSessions()
    const code = normalizeLocalCode(data?.code)
    const session = localPairingSessions.get(code)
    if (!session || !validLocalProfile(data?.profile) || !data?.answer) {
      socket.emit("local:pair:error", { code, error: "Pairing session was not found or expired" })
      return
    }
    io?.sockets.sockets.get(session.ownerSocketId)?.emit("local:pair:answer", {
      code,
      answer: data.answer,
      peer: data.profile,
    })
    socket.emit("local:pair:complete", { code, peer: session.owner })
    localPairingSessions.delete(code)
  })

  socket.on("local:discover", (data: { deviceId?: unknown; peerIds?: unknown }) => {
    if (typeof data?.deviceId !== "string" || !Array.isArray(data?.peerIds)) return
    const requester = localDevices.get(data.deviceId)
    if (!requester || requester.socketId !== socket.id) return
    for (const peerId of data.peerIds.slice(0, 200)) {
      if (typeof peerId !== "string") continue
      const peer = localDevices.get(peerId)
      if (!peer || peer.socketId === socket.id) continue
      socket.emit("local:peer:online", { peer: peer.profile })
      io?.sockets.sockets.get(peer.socketId)?.emit("local:peer:online", { peer: requester.profile })
    }
  })

  socket.on("local:signal", (data: { targetDeviceId?: unknown; payload?: unknown }) => {
    if (!allowSignal(socket.id) || typeof data?.targetDeviceId !== "string" || !data?.payload) return
    const target = localDevices.get(data.targetDeviceId)
    if (!target) return
    targetSocket(target.socketId)?.emit("local:signal", {
      fromDeviceId: [...localDevices.values()].find((entry) => entry.socketId === socket.id)?.profile.deviceId,
      payload: data.payload,
    })
  })
}

function targetSocket(socketId: string) {
  return io?.sockets.sockets.get(socketId)
}

function unregisterLocalDevices(socketId: string) {
  for (const [deviceId, entry] of localDevices) {
    if (entry.socketId === socketId) localDevices.delete(deviceId)
  }
  for (const [code, session] of localPairingSessions) {
    if (session.ownerSocketId === socketId) localPairingSessions.delete(code)
  }
}

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

// --- per-socket rate limiting -------------------------------------------------
const MSG_BUDGET_MS = 10_000
const MSG_BUDGET_LIMIT = 20
const SIGNAL_BUDGET_MS = 1_000
const SIGNAL_BUDGET_LIMIT = 60
const buckets = new Map<string, { messages: number[]; signals: number[] }>()

function allow(socketId: string, kind: "messages" | "signals", budgetMs: number, limit: number): boolean {
  let bucket = buckets.get(socketId)
  if (!bucket) {
    bucket = { messages: [], signals: [] }
    buckets.set(socketId, bucket)
  }
  const now = Date.now()
  const window = bucket[kind]
  while (window.length && window[0] <= now - budgetMs) window.shift()
  if (window.length >= limit) return false
  window.push(now)
  return true
}

function allowMessage(socketId: string) {
  return allow(socketId, "messages", MSG_BUDGET_MS, MSG_BUDGET_LIMIT)
}

function allowSignal(socketId: string) {
  return allow(socketId, "signals", SIGNAL_BUDGET_MS, SIGNAL_BUDGET_LIMIT)
}

// Clean up buckets when a socket leaves so memory cannot grow unbounded.
function releaseBucket(socketId: string) {
  buckets.delete(socketId)
}

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
    if (!allowSignal(socket.id)) return
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

    registerLocalChatHandlers(socket as AuthedSocket)

    socket.on("disconnect", () => {
      releaseBucket(socket.id)
      unregisterLocalDevices(socket.id)
      const sockets = userSockets.get(userId)
      sockets?.delete(socket.id)
      if (sockets && sockets.size === 0) userSockets.delete(userId)
      if (isUserOnline(userId)) return

      // Keep calls and presence alive through short network interruptions.
      clearDisconnectGrace(userId)
      disconnectGraceTimers.set(userId, setTimeout(() => {
        disconnectGraceTimers.delete(userId)
        if (isUserOnline(userId)) return
        userSockets.delete(userId)
        userProfiles.delete(userId)
        leaveAllCalls(userId)
        getPrisma()
          .user.update({ where: { id: userId }, data: { status: "OFFLINE", lastSeen: new Date() } })
          .catch(() => {})
        if (user.privacyShowStatus) {
          io?.emit("presence:update", { userId, status: "OFFLINE" })
        }
      }, DISCONNECT_GRACE_MS))
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
        if (!allowMessage(socket.id)) {
          socket.emit("message:error", { chatId: data.chatId, error: "Rate limited: too many messages, slow down" })
          return
        }
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
