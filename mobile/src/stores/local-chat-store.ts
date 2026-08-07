import { create } from "zustand";
import type { LocalChat, LocalMessage, LocalPeer } from "../lib/local-chat/types";

interface LocalChatState {
  ready: boolean;
  deviceId: string;
  deviceName: string;
  chats: LocalChat[];
  messages: Record<string, LocalMessage[]>;
  peers: Record<string, LocalPeer>;
  activeChatId: string | null;

  setReady: (ready: boolean) => void;
  setDeviceIdentity: (id: string, name: string) => void;
  setChats: (chats: LocalChat[]) => void;
  upsertChat: (chat: LocalChat) => void;
  deleteChat: (chatId: string) => void;
  setMessages: (chatId: string, messages: LocalMessage[]) => void;
  addMessage: (chatId: string, message: LocalMessage) => void;
  markDelivered: (chatId: string, msgId: string) => void;
  upsertPeer: (peer: LocalPeer) => void;
  removePeer: (peerId: string) => void;
  setActiveChatId: (id: string | null) => void;
}

export const useLocalChatStore = create<LocalChatState>((set) => ({
  ready: false,
  deviceId: "",
  deviceName: "",
  chats: [],
  messages: {},
  peers: {},
  activeChatId: null,

  setReady: (ready) => set({ ready }),
  setDeviceIdentity: (deviceId, deviceName) => set({ deviceId, deviceName }),
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((s) => {
      const exists = s.chats.find((c) => c.id === chat.id);
      return {
        chats: exists
          ? s.chats.map((c) => (c.id === chat.id ? chat : c))
          : [chat, ...s.chats],
      };
    }),
  deleteChat: (chatId) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      messages: { ...s.messages, [chatId]: [] },
    })),
  setMessages: (chatId, messages) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),
  addMessage: (chatId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [...(s.messages[chatId] || []), message],
      },
    })),
  markDelivered: (chatId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).map((m) =>
          m.id === msgId ? { ...m, delivered: true } : m
        ),
      },
    })),
  upsertPeer: (peer) =>
    set((s) => ({
      peers: { ...s.peers, [peer.id]: { ...s.peers[peer.id], ...peer } },
    })),
  removePeer: (peerId) =>
    set((s) => {
      const { [peerId]: _, ...rest } = s.peers;
      return { peers: rest };
    }),
  setActiveChatId: (id) => set({ activeChatId: id }),
}));
