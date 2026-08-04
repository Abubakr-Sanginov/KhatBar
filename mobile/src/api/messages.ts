import { api } from "./client";
import type { Message, ApiResponse } from "../types";

interface MessagesResponse {
  messages: Message[];
  nextCursor?: string;
}

export const messagesApi = {
  list: (chatId: string, cursor?: string) => {
    const params = new URLSearchParams({ chatId });
    if (cursor) params.set("cursor", cursor);
    return api.get<MessagesResponse>(`/api/messages?${params.toString()}`);
  },

  send: (data: {
    chatId: string;
    content: string;
    type?: string;
    mediaUrl?: string;
    replyToId?: string;
    isEncrypted?: boolean;
  }) => api.post<{ message: Message }>("/api/messages", data),

  get: (id: string) => api.get<{ message: Message }>(`/api/messages/${id}`),

  delete: (id: string) => api.delete(`/api/messages/${id}`),
};