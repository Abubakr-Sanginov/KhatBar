export interface User {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  status: UserStatus;
  role: UserRole;
  isVerified: boolean;
  privacyShowStatus: boolean;
  privacyShowLastSeen: boolean;
  privacyReadReceipts: boolean;
  encryptionPublicKey: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export type UserStatus = "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE";
export type UserRole = "USER" | "ADMIN";

export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  username: string | null;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  isPublic: boolean;
  inviteCode: string | null;
  linkedChannelId: string | null;
  linkedChannel?: Chat | null;
  linkedGroups?: Chat[];
  encryptionSalt: string | null;
  createdAt: string;
  updatedAt: string;
  members?: ChatMember[];
  lastMessage?: Message | null;
  unreadCount?: number;
  _count?: { members: number };
}

export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL";

export interface ChatMember {
  id: string;
  userId: string;
  chatId: string;
  role: MemberRole;
  joinedAt: string;
  lastReadAt: string | null;
  encryptedChatKey: string | null;
  user?: User;
  chat?: Chat;
}

export type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  mediaDuration: number | null;
  thumbnailUrl: string | null;
  isEncrypted: boolean;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  replyToId: string | null;
  forwardedFromId: string | null;
  callId: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  replyTo?: Message | null;
}

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "GIF" | "STICKER" | "FILE" | "SYSTEM" | "CALL";

export interface Call {
  id: string;
  chatId: string;
  starterId: string;
  status: CallStatus;
  isVideo: boolean;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
}

export type CallStatus = "ONGOING" | "ENDED" | "MISSED" | "DECLINED" | "CANCELED";

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
