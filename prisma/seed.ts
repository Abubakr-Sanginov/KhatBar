import { ConversationType, MemberRole, MessageType, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [abubakr, sarah, ali] = await Promise.all([
    prisma.user.upsert({
      where: { username: 'abubakr' },
      update: {},
      create: {
        username: 'abubakr',
        email: 'abubakr@example.com',
        displayName: 'Abubakr',
        statusText: 'Shipping KhatBar',
        isAdmin: true,
      },
    }),
    prisma.user.upsert({
      where: { username: 'sarah' },
      update: {},
      create: {
        username: 'sarah',
        email: 'sarah@example.com',
        displayName: 'Sarah Chen',
        statusText: 'Designing reactions',
      },
    }),
    prisma.user.upsert({
      where: { username: 'ali' },
      update: {},
      create: {
        username: 'ali',
        email: 'ali@example.com',
        displayName: 'Ali Karimov',
        statusText: 'Working on channels',
      },
    }),
  ])

  const general = await prisma.conversation.upsert({
    where: { slug: 'general' },
    update: {},
    create: {
      slug: 'general',
      name: 'General',
      type: ConversationType.CHANNEL,
      isPublic: true,
      membersCount: 3,
    },
  })

  await prisma.conversationMember.createMany({
    data: [
      { conversationId: general.id, userId: abubakr.id, role: MemberRole.OWNER },
      { conversationId: general.id, userId: sarah.id, role: MemberRole.MEMBER },
      { conversationId: general.id, userId: ali.id, role: MemberRole.MEMBER },
    ],
    skipDuplicates: true,
  })

  const messages = [
    { authorId: abubakr.id, body: 'Welcome to KhatBar.', type: MessageType.SYSTEM },
    { authorId: sarah.id, body: 'Reaction system looks good.', type: MessageType.TEXT },
    { authorId: ali.id, body: 'Channel APIs are next.', type: MessageType.TEXT },
  ]

  for (const entry of messages) {
    const message = await prisma.message.create({
      data: {
        conversationId: general.id,
        authorId: entry.authorId,
        body: entry.body,
        type: entry.type,
      },
    })

    await prisma.conversation.update({
      where: { id: general.id },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastMessagePreview: entry.body,
      },
    })
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
