export type UserStatus = "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE"

export type UserRole = "USER" | "ADMIN"

export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL"

export type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER"

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "GIF" | "STICKER" | "FILE" | "SYSTEM" | "CALL"

export type CallStatus = "ONGOING" | "ENDED" | "MISSED" | "DECLINED" | "CANCELED"

export interface CallRecord {
  id: string
  status: CallStatus
  isVideo: boolean
  startedAt: string
  answeredAt: string | null
  endedAt: string | null
  durationSec: number
  starterId: string
}

export interface User {
  id: string
  email: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  status: UserStatus
  role?: UserRole
  lastSeen: string | null
  isVerified: boolean
  privacyShowStatus?: boolean
  privacyShowLastSeen?: boolean
  privacyReadReceipts?: boolean
  encryptionPublicKey?: string | null
}

export interface Report {
  id: string
  reason: string
  status: "OPEN" | "RESOLVED" | "DISMISSED"
  chatId: string | null
  messageId: string | null
  createdAt: string
  reporter: { id: string; email: string; username: string | null }
}

export interface Chat {
  id: string
  type: ChatType
  name: string | null
  username: string | null
  description: string | null
  avatarUrl: string | null
  ownerId: string | null
  isPublic: boolean
  inviteCode: string | null
  linkedChannelId: string | null
  linkedChannel?: { id: string; name: string | null; username: string | null } | null
  linkedGroups?: { id: string; name: string | null; username: string | null }[]
  encryptionSalt?: string | null
  updatedAt?: string
  members: ChatMember[]
  messages?: Message[]
  lastMessage?: Message | null
  unreadCount?: number
  /** Total members, including those not in the loaded `members` slice. */
  memberCount?: number
}

export interface ChatMember {
  id: string
  role: MemberRole
  joinedAt: string
  lastReadAt: string
  encryptedChatKey?: string | null
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
  isEncrypted?: boolean
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
  callId?: string | null
  call?: CallRecord | null
}

export interface Session {
  id: string
  token: string
  userId: string
  expiresAt: string
}
