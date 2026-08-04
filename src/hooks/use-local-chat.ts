import { useEffect, useRef } from "react"
import { getOrCreateDeviceIdentity } from "@/lib/local-chat/crypto"
import { listLocalChats, listLocalMessages, putLocalChat } from "@/lib/local-chat/db"
import { LocalSyncEngine } from "@/lib/local-chat/sync"
import type { LocalChat, LocalMessage, LocalPeer } from "@/lib/local-chat/types"
import { useLocalChatStore } from "@/stores/local-chat-store"

/**
 * Boots the local chat engine: loads device identity, starts sync/transport,
 * and keeps the zustand store in sync with IndexedDB.
 */
export function useLocalChat() {
  const engineRef = useRef<LocalSyncEngine | null>(null)
  const store = useLocalChatStore

  useEffect(() => {
    let disposed = false

    async function boot() {
      const identity = await getOrCreateDeviceIdentity()
      if (disposed) return
      store.getState().setDeviceId(identity.deviceId)

      const chats = await listLocalChats()
      if (!disposed) store.getState().setChats(chats)
      const messages: Record<string, LocalMessage[]> = {}
      await Promise.all(
        chats.map(async (chat) => {
          messages[chat.id] = await listLocalMessages(chat.id)
        }),
      )
      if (!disposed) {
        Object.entries(messages).forEach(([chatId, msgs]) => {
          store.getState().setMessages(chatId, msgs)
        })
      }

      const peerKeys: Record<string, string> = {}
      chats.forEach((chat) => {
        peerKeys[chat.peerId] = chat.peerPublicKey
      })
      chats.forEach((chat) => {
        const existing = store.getState().peers[chat.peerId]
        if (!existing) {
          store
            .getState()
            .upsertPeer({
              id: chat.peerId,
              name: chat.peerName,
              publicKey: chat.peerPublicKey,
              lastSeen: chat.updatedAt,
              online: false,
            })
        }
      })

      const engine = new LocalSyncEngine({
        onIncoming: (message) => {
          store.getState().appendMessage(message)
        },
        onPeerOnline: (peerId) => {
          store.getState().setPeerOnline(peerId, true)
        },
        onPeerOffline: (peerId) => {
          store.getState().setPeerOnline(peerId, false)
        },
      })
      engineRef.current = engine
      await engine.start(
        {
          deviceId: identity.deviceId,
          name: identity.name,
          publicKey: JSON.stringify(identity.publicKey),
        },
        peerKeys,
      )
      if (!disposed) store.getState().setReady(true)
    }

    void boot()
    return () => {
      disposed = true
      engineRef.current?.dispose()
    }
  }, [store])

  return {
    engine: engineRef,
    sendLocalMessage: async (peerId: string, content: string) => {
      const engine = engineRef.current
      const state = store.getState()
      const peer = state.peers[peerId]
      if (!engine || !peer) throw new Error("Local chat is not ready")
      let chat = state.chats.find((c) => c.peerId === peerId)
      if (!chat) {
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
      return messageId
    },
    pair: async (peer: LocalPeer) => {
      const state = store.getState()
      if (!state.deviceId) throw new Error("Local chat is not ready")
      const existing = state.chats.find((c) => c.peerId === peer.id)
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
      engineRef.current?.setPeerKey(peer.id, peer.publicKey)
      return chat
    },
  }
}
