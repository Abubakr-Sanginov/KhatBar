import { useEffect } from "react"
import { putLocalChat } from "@/lib/local-chat/db"
import { acquireLocalEngine, getLocalEngine, startLocalEngine } from "@/lib/local-chat/engine"
import type { LocalChat, LocalPeer } from "@/lib/local-chat/types"
import { useLocalChatStore } from "@/stores/local-chat-store"

/** Uses the single shared local engine for every mounted local-chat surface. */
export function useLocalChat() {
  const store = useLocalChatStore

  useEffect(() => acquireLocalEngine(), [])

  return {
    sendLocalMessage: async (peerId: string, content: string) => {
      const engine = getLocalEngine() ?? await startLocalEngine()
      const state = store.getState()
      const peer = state.peers[peerId]
      if (!peer) throw new Error("Local peer is unavailable")
      let chat = state.chats.find((item) => item.peerId === peerId)
      if (!chat) {
        if (!state.deviceId) throw new Error("Local chat is not ready")
        chat = {
          id: [state.deviceId, peerId].sort().join("|"),
          peerId,
          peerName: peer.name,
          peerPublicKey: peer.publicKey,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await putLocalChat(chat)
        state.setChats([chat, ...state.chats])
      }
      const messageId = await engine.sendMessage(chat.id, peerId, content)
      state.appendMessage({
        id: messageId,
        chatId: chat.id,
        fromMe: true,
        content,
        delivered: "pending",
        createdAt: Date.now(),
      })
      return messageId
    },
    pair: async (peer: LocalPeer) => {
      const engine = getLocalEngine() ?? await startLocalEngine()
      const state = store.getState()
      if (!state.deviceId) throw new Error("Local chat is not ready")
      const existing = state.chats.find((item) => item.peerId === peer.id)
      if (existing) return existing
      const chat: LocalChat = {
        id: [state.deviceId, peer.id].sort().join("|"),
        peerId: peer.id,
        peerName: peer.name,
        peerPublicKey: peer.publicKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await putLocalChat(chat)
      state.upsertPeer(peer)
      state.setChats([chat, ...state.chats])
      await engine.setPeerKey(peer.id, peer.publicKey)
      return chat
    },
    retry: () => startLocalEngine(true),
  }
}
