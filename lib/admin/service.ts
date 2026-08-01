import { EncryptionMode } from '@prisma/client'

import { prisma } from '@/lib/db'
import type { AdminOverview } from '@/lib/admin/types'

export async function getAdminOverview(): Promise<AdminOverview> {
  const [usersTotal, adminsTotal, suspendedUsersTotal, conversationsTotal, encryptedConversationsTotal, lockedChannelsTotal] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { encryptionMode: { not: EncryptionMode.NONE } } }),
      prisma.conversation.count({ where: { isLocked: true } }),
    ])

  return {
    usersTotal,
    adminsTotal,
    suspendedUsersTotal,
    conversationsTotal,
    encryptedConversationsTotal,
    lockedChannelsTotal,
  }
}

export async function suspendUser(targetUserId: string, actorUserId: string) {
  const user = await prisma.user.update({ where: { id: targetUserId }, data: { isSuspended: true } })
  await prisma.adminAuditLog.create({
    data: {
      actorUserId,
      eventType: 'USER_SUSPENDED',
      targetUserId,
      payloadJson: JSON.stringify({ targetUserId }),
    },
  })
  return user
}

export async function lockChannel(conversationId: string, actorUserId: string) {
  const conversation = await prisma.conversation.update({ where: { id: conversationId }, data: { isLocked: true } })
  await prisma.adminAuditLog.create({
    data: {
      actorUserId,
      conversationId,
      eventType: 'CHANNEL_LOCKED',
      payloadJson: JSON.stringify({ conversationId }),
    },
  })
  return conversation
}
