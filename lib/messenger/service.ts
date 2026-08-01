import { MessageType, Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { decodeMessageCursor } from '@/lib/messenger/cursor'
import { getMockBootstrap } from '@/lib/messenger/mock'
import type { ChatBootstrap, ChatMessage } from '@/lib/messenger/types'

const PAGE_SIZE = 30

function buildDirectKey(userA: string, userB: string) {
  return [userA, userB].sort((a, b) => a.localeCompare(b)).join(':')
}

function getMessagePreview(body?: string | null, type: MessageType = MessageType.TEXT) {
  if (body?.trim()) return body.trim().slice(0, 160)

  const map: Record<MessageType, string> = {
    TEXT: '',
    IMAGE: '📷 Photo',
    VIDEO: '🎬 Video',
    FILE: '📎 File',
    AUDIO: '🎤 Voice message',
    VIDEO_NOTE: '⭕ Video note',
    GIF: '🌀 GIF',
    STICKER: '🙂 Sticker',
    CALL: '📞 Call',
    SYSTEM: 'System event',
    BLUETOOTH_HANDSHAKE: '📡 Bluetooth handshake',
  }

  return map[type]
}

function toReactionSummary(reactions: Array<{ emoji: string }>) {
  const counts = new Map<string, number>()
  for (const reaction of reactions) {
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }))
}

export async function getOrCreateDirectConversation(params: { currentUserId: string; otherUserId: string }) {
  const { currentUserId, otherUserId } = params

  if (!process.env.DATABASE_URL) {
    return {
      id: `direct_${currentUserId}_${otherUserId}`,
      type: 'DIRECT' as const,
      membersCount: 2,
    }
  }

  if (currentUserId === otherUserId) {
    throw new Error('Cannot create direct conversation with yourself')
  }

  const directKey = buildDirectKey(currentUserId, otherUserId)
  const existing = await prisma.conversation.findUnique({ where: { directKey } })
  if (existing) return existing

  return prisma.$transaction(
    async (tx) => {
      return tx.conversation.create({
        data: {
          type: 'DIRECT',
          directKey,
          membersCount: 2,
          members: {
            create: [
              { userId: currentUserId, role: 'OWNER' },
              { userId: otherUserId, role: 'OWNER' },
            ],
          },
        },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  )
}

export async function getChatBootstrap(currentUserId: string): Promise<ChatBootstrap> {
  if (!process.env.DATABASE_URL) {
    return getMockBootstrap()
  }

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: currentUserId, leftAt: null },
    include: { conversation: true },
    orderBy: [{ isPinned: 'desc' }, { lastReadAt: 'desc' }],
    take: 25,
  })

  const selectedConversationId = memberships[0]?.conversationId ?? ''
  const messages = selectedConversationId
    ? await listMessages({ currentUserId, conversationId: selectedConversationId, limit: PAGE_SIZE })
    : []

  return {
    currentUserId,
    selectedConversationId,
    conversations: memberships.map((membership) => ({
      id: membership.conversationId,
      name: membership.conversation.name ?? 'Untitled conversation',
      type: membership.conversation.type,
      unreadCount: membership.unreadCount,
      lastMessagePreview: membership.conversation.lastMessagePreview ?? 'No messages yet',
      lastMessageAt: membership.conversation.lastMessageAt?.toISOString() ?? new Date().toISOString(),
      membersCount: membership.conversation.membersCount,
      avatarUrl: membership.conversation.imageUrl,
    })),
    messages,
  }
}

export async function listMessages(params: {
  currentUserId: string
  conversationId: string
  cursor?: string | null
  limit?: number
}) {
  if (!process.env.DATABASE_URL) {
    return getMockBootstrap().messages.filter((message) => message.conversationId === params.conversationId)
  }

  const { conversationId, cursor, limit = PAGE_SIZE } = params
  const decoded = decodeMessageCursor(cursor)

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(decoded
        ? {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              { createdAt: new Date(decoded.createdAt), id: { lt: BigInt(decoded.id) } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      reactions: { select: { emoji: true } },
    },
  })

  return rows.map<ChatMessage>((message) => ({
    id: message.id.toString(),
    conversationId: message.conversationId,
    authorId: message.authorId,
    authorName: message.author?.displayName ?? 'System',
    authorAvatarUrl: message.author?.avatarUrl,
    body: message.body,
    type: message.type,
    createdAt: message.createdAt.toISOString(),
    reactionSummary: toReactionSummary(message.reactions),
  }))
}

export async function sendMessage(input: {
  conversationId: string
  currentUserId: string
  body?: string
  type?: MessageType
  clientNonce?: string
}) {
  const cleanBody = input.body?.trim() ?? ''
  if (!cleanBody) {
    throw new Error('Message body is required')
  }

  if (!process.env.DATABASE_URL) {
    return {
      id: `optimistic_${Date.now()}`,
      conversationId: input.conversationId,
      authorId: input.currentUserId,
      authorName: 'Abubakr',
      body: cleanBody,
      type: input.type ?? 'TEXT',
      createdAt: new Date().toISOString(),
      optimistic: false,
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      authorId: input.currentUserId,
      body: cleanBody,
      type: input.type ?? MessageType.TEXT,
      clientNonce: input.clientNonce,
    },
    include: {
      author: { select: { displayName: true, avatarUrl: true } },
    },
  })

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: {
      lastMessageId: message.id,
      lastMessageAt: message.createdAt,
      lastMessagePreview: getMessagePreview(message.body, message.type),
    },
  })

  await prisma.conversationMember.updateMany({
    where: {
      conversationId: input.conversationId,
      leftAt: null,
      NOT: { userId: input.currentUserId },
    },
    data: { unreadCount: { increment: 1 } },
  })

  return {
    id: message.id.toString(),
    conversationId: message.conversationId,
    authorId: message.authorId,
    authorName: message.author?.displayName ?? 'Unknown',
    authorAvatarUrl: message.author?.avatarUrl,
    body: message.body,
    type: message.type,
    createdAt: message.createdAt.toISOString(),
  }
}

export async function markConversationRead(params: {
  conversationId: string
  currentUserId: string
  messageId?: string
}) {
  if (!process.env.DATABASE_URL) {
    return { ok: true }
  }

  await prisma.conversationMember.update({
    where: {
      conversationId_userId: {
        conversationId: params.conversationId,
        userId: params.currentUserId,
      },
    },
    data: {
      unreadCount: 0,
      mentionCount: 0,
      lastReadMessageId: params.messageId ? BigInt(params.messageId) : undefined,
      lastReadAt: new Date(),
    },
  })

  return { ok: true }
}
