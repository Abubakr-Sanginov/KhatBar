import { api } from "./client";
import type { Chat, ChatMember, Message, ApiResponse, User } from "../types";

interface ChatsResponse {
  chats: (Chat & { lastMessage?: Message | null; unreadCount: number; _count?: { members: number } })[];
}

interface MessagesResponse {
  messages: Message[];
  nextCursor?: string;
}

export interface CreateChatInput {
  type: "PRIVATE" | "GROUP" | "CHANNEL";
  name?: string;
  username?: string;
  description?: string;
  isPublic?: boolean;
  memberIds?: string[];
  encryptionSalt?: string;
  memberKeyEnvelopes?: Record<string, string>;
}

export const chatsApi = {
  list: () => api.get<ChatsResponse>("/api/chats"),

  create: (data: CreateChatInput) => api.post<{ chat: Chat }>("/api/chats", data),

  get: (id: string) => api.get<{ chat: Chat & { members: ChatMember[] } }>(`/api/chats/${id}`),

  update: (id: string, data: Partial<Pick<Chat, "name" | "description" | "avatarUrl" | "linkedChannelId">>) =>
    api.patch<{ chat: Chat }>(`/api/chats/${id}`, data),

  leave: (id: string) => api.post(`/api/chats/${id}/leave`),

  delete: (id: string) => api.delete(`/api/chats/${id}`),

  join: (code: string) => api.post<{ chat: Chat }>(`/api/chats/join`, { code }),

  search: (query: string) =>
    api.get<{ chats: Chat[] }>(`/api/chats/search?q=${encodeURIComponent(query)}`),

  getMembers: (chatId: string) =>
    api.get<{ members: (ChatMember & { user: User })[] }>(`/api/chats/${chatId}/members`),

  addMembers: (chatId: string, memberIds: string[]) =>
    api.post<{ members: ChatMember[] }>(`/api/chats/${chatId}/members`, { memberIds }),

  removeMember: (chatId: string, userId: string) =>
    api.delete(`/api/chats/${chatId}/members?userId=${userId}`),

  updateMemberRole: (chatId: string, userId: string, role: string) =>
    api.patch(`/api/chats/${chatId}/members`, { userId, role }),

  markRead: (chatId: string) => api.post(`/api/chats/${chatId}/read`),
};