import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Chat, Message, ChatMember } from "../types";
import { chatsApi } from "../api/chats";
import type { CreateChatInput } from "../api/chats";
import { decryptPrivateChatMessages, isEncryptedChat } from "../lib/e2ee";
import { useAuthStore } from "./auth-store";

type ChatListItem = Chat & {
  lastMessage?: Message | null;
  unreadCount: number;
  _count?: { members: number };
  typingUserIds?: string[];
  memberPresence?: Record<string, string>;
};

interface ChatState {
  chats: ChatListItem[];
  activeChat: (Chat & { members: ChatMember[] }) | null;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchChats: () => Promise<void>;
  refreshChats: () => Promise<void>;
  setActiveChat: (chat: (Chat & { members: ChatMember[] }) | null) => void;
  loadChat: (chatId: string) => Promise<void>;
  createChat: (data: CreateChatInput) => Promise<Chat>;
  leaveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  markRead: (chatId: string) => Promise<void>;
  updateChatInList: (chatId: string, data: Partial<ChatListItem>) => void;
  addMessageToChat: (chatId: string, message: Message) => void;
  searchChats: (query: string) => Promise<Chat[]>;
  addMember: (chatId: string, memberIds: string[]) => Promise<void>;
  removeMember: (chatId: string, userId: string) => Promise<void>;
  setTypingUser: (chatId: string, userId: string) => void;
  clearTypingUser: (chatId: string, userId: string) => void;
  updateMemberPresence: (userId: string, status: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,
      isLoading: false,
      isRefreshing: false,

  fetchChats: async () => {
    set({ isLoading: true });
    try {
      const res = await chatsApi.list();
      const userId = useAuthStore.getState().user?.id;
      const chats = userId ? await Promise.all(res.chats.map(async (chat) => ({
        ...chat,
        lastMessage: chat.lastMessage && isEncryptedChat(chat)
          ? (await decryptPrivateChatMessages(chat, userId, [chat.lastMessage]))[0]
          : chat.lastMessage,
      }))) : res.chats;
      set({ chats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  refreshChats: async () => {
    set({ isRefreshing: true });
    try {
      const res = await chatsApi.list();
      const userId = useAuthStore.getState().user?.id;
      const chats = userId ? await Promise.all(res.chats.map(async (chat) => ({
        ...chat,
        lastMessage: chat.lastMessage && isEncryptedChat(chat)
          ? (await decryptPrivateChatMessages(chat, userId, [chat.lastMessage]))[0]
          : chat.lastMessage,
      }))) : res.chats;
      set({ chats, isRefreshing: false });
    } catch {
      set({ isRefreshing: false });
    }
  },

  setActiveChat: (chat) => set({ activeChat: chat }),

  loadChat: async (chatId) => {
    try {
      const res = await chatsApi.get(chatId);
      set({ activeChat: res.chat });
    } catch {}
  },

  createChat: async (data) => {
    const res = await chatsApi.create(data);
    await get().fetchChats();
    return res.chat;
  },

  leaveChat: async (chatId) => {
    await chatsApi.leave(chatId);
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      activeChat: null,
    }));
  },

  deleteChat: async (chatId) => {
    await chatsApi.delete(chatId);
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      activeChat: null,
    }));
  },

  markRead: async (chatId) => {
    try {
      await chatsApi.markRead(chatId);
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === chatId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {}
  },

  updateChatInList: (chatId, data) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, ...data } : c)),
    }));
  },

  addMessageToChat: (chatId, message) => {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: message,
              unreadCount:
                s.activeChat?.id === chatId ? 0 : (c.unreadCount || 0) + 1,
            }
          : c
      ),
    }));
  },

  searchChats: async (query) => {
    const res = await chatsApi.search(query);
    return res.chats;
  },

  addMember: async (chatId, memberIds) => {
    await chatsApi.addMembers(chatId, memberIds);
    const updated = await chatsApi.get(chatId);
    set({ activeChat: updated.chat });
  },

  removeMember: async (chatId, userId) => {
    await chatsApi.removeMember(chatId, userId);
    const updated = await chatsApi.get(chatId);
    set({ activeChat: updated.chat });
  },

  setTypingUser: (chatId, userId) => {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              typingUserIds: [...(c.typingUserIds || []).filter((id) => id !== userId), userId],
            }
          : c
      ),
    }));
  },

  clearTypingUser: (chatId, userId) => {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              typingUserIds: (c.typingUserIds || []).filter((id) => id !== userId),
            }
          : c
      ),
    }));
  },

  updateMemberPresence: (userId, status) => {
    set((s) => ({
      chats: s.chats.map((c) => ({
        ...c,
        memberPresence: {
          ...(c.memberPresence || {}),
          [userId]: status,
        },
      })),
    }));
  },
    }),
    {
      name: "khatbar_chats",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ chats: s.chats }),
    }
  )
);
