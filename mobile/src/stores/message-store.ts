import { create } from "zustand";
import type { Message } from "../types";
import { messagesApi } from "../api/messages";

interface MessageState {
  messagesByChat: Record<string, Message[]>;
  isLoadingByChat: Record<string, boolean>;
  hasMoreByChat: Record<string, boolean>;
  cursorsByChat: Record<string, string | undefined>;
  loadMessages: (chatId: string) => Promise<void>;
  loadMore: (chatId: string) => Promise<void>;
  addMessage: (chatId: string, message: Message) => void;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, data: Partial<Message>) => void;
  clearChat: (chatId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChat: {},
  isLoadingByChat: {},
  hasMoreByChat: {},
  cursorsByChat: {},

  loadMessages: async (chatId) => {
    set((s) => ({
      isLoadingByChat: { ...s.isLoadingByChat, [chatId]: true },
    }));
    try {
      const res = await messagesApi.list(chatId);
      set((s) => ({
        messagesByChat: { ...s.messagesByChat, [chatId]: res.messages },
        hasMoreByChat: {
          ...s.hasMoreByChat,
          [chatId]: !!res.nextCursor,
        },
        cursorsByChat: {
          ...s.cursorsByChat,
          [chatId]: res.nextCursor,
        },
        isLoadingByChat: { ...s.isLoadingByChat, [chatId]: false },
      }));
    } catch {
      set((s) => ({
        isLoadingByChat: { ...s.isLoadingByChat, [chatId]: false },
      }));
    }
  },

  loadMore: async (chatId) => {
    const cursor = get().cursorsByChat[chatId];
    if (!cursor) return;
    try {
      const res = await messagesApi.list(chatId, cursor);
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: [...(s.messagesByChat[chatId] || []), ...res.messages],
        },
        hasMoreByChat: {
          ...s.hasMoreByChat,
          [chatId]: !!res.nextCursor,
        },
        cursorsByChat: {
          ...s.cursorsByChat,
          [chatId]: res.nextCursor,
        },
      }));
    } catch {}
  },

  addMessage: (chatId, message) => {
    set((s) => {
      const existing = s.messagesByChat[chatId] || [];
      if (existing.some((m) => m.id === message.id)) return s;
      return {
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: [message, ...existing],
        },
      };
    });
  },

  removeMessage: (messageId) => {
    set((s) => {
      const newMessages: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(s.messagesByChat)) {
        newMessages[chatId] = msgs.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true } : m
        );
      }
      return { messagesByChat: newMessages };
    });
  },

  updateMessage: (messageId, data) => {
    set((s) => {
      const newMessages: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(s.messagesByChat)) {
        newMessages[chatId] = msgs.map((m) =>
          m.id === messageId ? { ...m, ...data } : m
        );
      }
      return { messagesByChat: newMessages };
    });
  },

  clearChat: (chatId) => {
    set((s) => {
      const copy = { ...s.messagesByChat };
      delete copy[chatId];
      return { messagesByChat: copy };
    });
  },
}));
