import { randomBytes } from 'node:crypto'

import { prisma } from '@/lib/db'

export async function rotateConversationKey(conversationId: string, rotatedByUserId?: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
  const version = conversation.activeKeyVersion + 1
  const wrappedKey = randomBytes(32)

  await prisma.$transaction([
    prisma.conversationKey.create({
      data: {
        conversationId,
        version,
        wrappedKey,
        rotatedByUserId,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { activeKeyVersion: version },
    }),
  ])

  return { conversationId, version }
}

export async function getActiveConversationKey(conversationId: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
  return prisma.conversationKey.findUniqueOrThrow({
    where: {
      conversationId_version: {
        conversationId,
        version: conversation.activeKeyVersion,
      },
    },
  })
}
