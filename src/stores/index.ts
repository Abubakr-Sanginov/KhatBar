import { create } from "zustand"
import type { Chat, Message, User } from "@/types"

interface ChatStore {
  chats: Chat[]
  activeChat: Chat | null
  messages: Record<string, Message[]>
  unreadCounts: Record<string, number>
  setChats: (chats: Chat[]) => void
  setActiveChat: (chat: Chat | null) => void
  addMessage: (chatId: string, message: Message) => void
  setMessages: (chatId: string, messages: Message[]) => void
  prependMessages: (chatId: string, messages: Message[]) => void
  touchChat: (chatId: string, message: Message) => void
  updateMemberStatus: (userId: string, status: User["status"]) => void
  updateMemberLastRead: (chatId: string, userId: string, lastReadAt: string) => void
  incrementUnread: (chatId: string) => void
  resetUnread: (chatId: string) => void
  removeChat: (chatId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChat: null,
  messages: {},
  unreadCounts: {},
  setChats: (chats) =>
    set((state) => {
      const unreadCounts: Record<string, number> = { ...state.unreadCounts }
      for (const c of chats) {
        if (!(c.id in unreadCounts)) unreadCounts[c.id] = c.unreadCount || 0
      }
      return { chats, unreadCounts }
    }),
  setActiveChat: (chat) => set({ activeChat: chat }),
  addMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messages[chatId] || []
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [chatId]: [...existing, message],
        },
      }
    }),
  touchChat: (chatId, message) =>
    set((state) => ({
      chats: state.chats
        .map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [message, ...(chat.messages || []).filter((m) => m.id !== message.id)].slice(0, 1),
                updatedAt: message.createdAt,
              }
            : chat,
        )
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
    })),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),
  prependMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...messages, ...(state.messages[chatId] || [])],
      },
    })),
  updateMemberStatus: (userId, status) =>
    set((state) => ({
      chats: state.chats.map((chat) => ({
        ...chat,
        members: chat.members.map((m) =>
          m.user.id === userId ? { ...m, user: { ...m.user, status } } : m,
        ),
      })),
    })),
  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c)),
    })),
  resetUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
    })),
  updateMemberLastRead: (chatId, userId, lastReadAt) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              members: c.members.map((m) => (m.user.id === userId ? { ...m, lastReadAt } : m)),
            }
          : c,
      ),
    })),
  removeChat: (chatId) =>
    set((state) => {
      const messages = { ...state.messages }
      delete messages[chatId]
      const unreadCounts = { ...state.unreadCounts }
      delete unreadCounts[chatId]
      return {
        chats: state.chats.filter((c) => c.id !== chatId),
        activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
        messages,
        unreadCounts,
      }
    }),
}))

interface UserStore {
  users: Record<string, User>
  setUser: (user: User) => void
  setUsers: (users: User[]) => void
}

export const useUserStore = create<UserStore>((set) => ({
  users: {},
  setUser: (user) =>
    set((state) => ({ users: { ...state.users, [user.id]: user } })),
  setUsers: (users) =>
    set((state) => ({
      users: { ...state.users, ...Object.fromEntries(users.map((u) => [u.id, u])) },
    })),
}))

interface UIStore {
  isMobileSidebarOpen: boolean
  isInfoPanelOpen: boolean
  toggleSidebar: () => void
  toggleInfoPanel: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileSidebarOpen: false,
  isInfoPanelOpen: true,
  toggleSidebar: () => set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  toggleInfoPanel: () => set((s) => ({ isInfoPanelOpen: !s.isInfoPanelOpen })),
}))

interface SocketStore {
  token: string | null
  isConnected: boolean
  setToken: (token: string | null) => void
  setConnected: (connected: boolean) => void
}

export const useSocketStore = create<SocketStore>((set) => ({
  token: null,
  isConnected: false,
  setToken: (token) => set({ token }),
  setConnected: (isConnected) => set({ isConnected }),
}))