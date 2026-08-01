import { prisma } from '@/lib/db'

export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (!user.isAdmin) {
    throw new Error('FORBIDDEN_ADMIN_ONLY')
  }
  return user
}

export async function requireConversationModerator(userId: string, conversationId: string) {
  const membership = await prisma.conversationMember.findUniqueOrThrow({
    where: { conversationId_userId: { conversationId, userId } },
  })

  if (!['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role)) {
    throw new Error('FORBIDDEN_MODERATOR_ONLY')
  }

  return membership
}
