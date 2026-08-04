import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { LocalChat, LocalMessage, LocalPeer } from "@/lib/local-chat/types"

interface LocalChatState {
  ready: boolean
  deviceId: string | null
  peers: Record<string, LocalPeer>
  chats: LocalChat[]
  messages: Record<string, LocalMessage[]>
  activeChatId: string | null
  pairingCode: string | null

  setReady: (ready: boolean) => void
  setDeviceId: (id: string | null) => void
  upsertPeer: (peer: LocalPeer) => void
  setPeerOnline: (id: string, online: boolean) => void
  removePeer: (id: string) => void
  setChats: (chats: LocalChat[]) => void
  setMessages: (chatId: string, messages: LocalMessage[]) => void
  appendMessage: (message: LocalMessage) => void
  setActiveChatId: (id: string | null) => void
  setPairingCode: (code: string | null) => void
}

export const useLocalChatStore = create<LocalChatState>()(
  persist(
    (set) => ({
      ready: false,
      deviceId: null,
      peers: {},
      chats: [],
      messages: {},
      activeChatId: null,
      pairingCode: null,

      setReady: (ready) => set({ ready }),
      setDeviceId: (deviceId) => set({ deviceId }),
      upsertPeer: (peer) =>
        set((s) => {
          const existing = s.peers[peer.id]
          return {
            peers: {
              ...s.peers,
              [peer.id]: existing
                ? { ...existing, ...peer, lastSeen: Date.now() }
                : { ...peer, lastSeen: Date.now() },
            },
          }
        }),
      setPeerOnline: (id, online) =>
        set((s) => ({
          peers: {
            ...s.peers,
            [id]: s.peers[id] ? { ...s.peers[id], online } : s.peers[id],
          },
        })),
      removePeer: (id) =>
        set((s) => {
          const peers = { ...s.peers }
          delete peers[id]
          return { peers }
        }),
      setChats: (chats) => set({ chats }),
      setMessages: (chatId, messages) =>
        set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),
      appendMessage: (message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [message.chatId]: [...(s.messages[message.chatId] ?? []), message],
          },
        })),
      setActiveChatId: (activeChatId) => set({ activeChatId }),
      setPairingCode: (pairingCode) => set({ pairingCode }),
    }),
    {
      name: "khatbar-local-chat-store",
      partialize: (s) => ({
        deviceId: s.deviceId,
        peers: s.peers,
        chats: s.chats,
      }),
    },
  ),
)
