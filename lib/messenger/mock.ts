import type { ChatBootstrap } from '@/lib/messenger/types'

export function getMockBootstrap(): ChatBootstrap {
  return {
    currentUserId: 'user_me',
    selectedConversationId: 'conv_general',
    conversations: [
      {
        id: 'conv_general',
        name: 'General',
        type: 'CHANNEL',
        unreadCount: 3,
        lastMessagePreview: 'Ship the message virtualization today',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        membersCount: 24,
      },
      {
        id: 'conv_design',
        name: 'Design Sync',
        type: 'GROUP',
        unreadCount: 0,
        lastMessagePreview: 'Voice room starts in 5 minutes',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
        membersCount: 7,
      },
      {
        id: 'conv_direct_1',
        name: 'Sarah Chen',
        type: 'DIRECT',
        unreadCount: 1,
        lastMessagePreview: 'I pushed the new sticker pack.',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        membersCount: 2,
      },
    ],
    messages: Array.from({ length: 60 }).map((_, index) => ({
      id: `msg_${index + 1}`,
      conversationId: 'conv_general',
      authorId: index % 3 === 0 ? 'user_me' : `user_${index % 5}`,
      authorName: index % 3 === 0 ? 'Abubakr' : ['Sarah', 'Ali', 'Maya', 'Nika', 'Omar'][index % 5],
      authorAvatarUrl: null,
      body:
        index % 8 === 0
          ? 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGVzdA/g9582DNuQppxC/giphy.gif'
          : `High-load message #${index + 1}. Cursor-safe render path with optimistic UI and batched updates.`,
      type: index % 8 === 0 ? 'GIF' : 'TEXT',
      createdAt: new Date(Date.now() - (60 - index) * 1000 * 45).toISOString(),
      reactionSummary: index % 5 === 0 ? [{ emoji: '🔥', count: 3 }, { emoji: '✅', count: 1 }] : [],
    })),
  }
}
