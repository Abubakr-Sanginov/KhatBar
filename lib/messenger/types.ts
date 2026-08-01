export type SidebarConversation = {
  id: string
  name: string
  type: 'DIRECT' | 'GROUP' | 'CHANNEL' | 'BLUETOOTH'
  unreadCount: number
  lastMessagePreview: string
  lastMessageAt: string
  avatarUrl?: string | null
  membersCount: number
}

export type ChatMessage = {
  id: string
  conversationId: string
  authorId: string | null
  authorName: string
  authorAvatarUrl?: string | null
  body: string | null
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'VIDEO_NOTE' | 'GIF' | 'STICKER' | 'CALL' | 'SYSTEM' | 'BLUETOOTH_HANDSHAKE'
  createdAt: string
  optimistic?: boolean
  reactionSummary?: Array<{ emoji: string; count: number }>
}

export type ChatBootstrap = {
  currentUserId: string
  conversations: SidebarConversation[]
  selectedConversationId: string
  messages: ChatMessage[]
}

export type MessageCursor = {
  createdAt: string
  id: string
}
