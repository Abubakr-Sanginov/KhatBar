export type UserStatus = "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE"

export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL"

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER"

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "GIF" | "STICKER" | "FILE" | "SYSTEM"

export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  status: UserStatus
  lastSeen: string
  isVerified: boolean
}

export interface Chat {
  id: string
  type: ChatType
  name: string | null
  description: string | null
  avatarUrl: string | null
  ownerId: string | null
  isPublic: boolean
  inviteCode: string | null
  members: ChatMember[]
  lastMessage?: Message | null
  unreadCount?: number
}

export interface ChatMember {
  id: string
  role: MemberRole
  joinedAt: string
  lastReadAt: string
  user: User
}

export interface Message {
  id: string
  content: string | null
  type: MessageType
  mediaUrl: string | null
  mediaWidth: number | null
  mediaHeight: number | null
  mediaDuration: number | null
  thumbnailUrl: string | null
  isEdited: boolean
  isPinned: boolean
  replyToId: string | null
  replyTo?: Message | null
  forwardedFromId: string | null
  forwardedFrom?: Message | null
  createdAt: string
  sender: User
  chatId: string
  senderId: string
}

export interface Session {
  id: string
  token: string
  userId: string
  expiresAt: string
}