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
  incrementUnread: (chatId: string) => void
  resetUnread: (chatId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChat: null,
  messages: {},
  unreadCounts: {},
  setChats: (chats) => set({ chats }),
  setActiveChat: (chat) => set({ activeChat: chat }),
  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
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
  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    })),
  resetUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
    })),
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