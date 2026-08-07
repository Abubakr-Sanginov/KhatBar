import { useEffect, useRef, useCallback, useMemo } from "react";
import { useLocalChatStore } from "../stores/local-chat-store";
import { getOrCreateDeviceIdentity, chatIdForPeers } from "../lib/local-chat/crypto";
import { LocalTransport } from "../lib/local-chat/transport";
import { LocalSyncEngine } from "../lib/local-chat/sync";
import {
  listLocalChats,
  listLocalMessages,
  putLocalChat,
  putLocalMessage,
  getLocalChatByPeer,
  deleteLocalChat as dbDeleteLocalChat,
} from "../lib/local-chat/db";
import type { LocalChat, LocalPeer } from "../lib/local-chat/types";

export function useLocalChat() {
  const ready = useLocalChatStore((s) => s.ready);
  const deviceId = useLocalChatStore((s) => s.deviceId);
  const deviceName = useLocalChatStore((s) => s.deviceName);
  const chats = useLocalChatStore((s) => s.chats);
  const messages = useLocalChatStore((s) => s.messages);
  const peers = useLocalChatStore((s) => s.peers);
  const activeChatId = useLocalChatStore((s) => s.activeChatId);

  const setReady = useLocalChatStore((s) => s.setReady);
  const setDeviceIdentity = useLocalChatStore((s) => s.setDeviceIdentity);
  const setChats = useLocalChatStore((s) => s.setChats);
  const upsertChat = useLocalChatStore((s) => s.upsertChat);
  const deleteChatStore = useLocalChatStore((s) => s.deleteChat);
  const setMessages = useLocalChatStore((s) => s.setMessages);
  const addMessage = useLocalChatStore((s) => s.addMessage);
  const upsertPeer = useLocalChatStore((s) => s.upsertPeer);
  const setActiveChatId = useLocalChatStore((s) => s.setActiveChatId);

  const engineRef = useRef<LocalSyncEngine | null>(null);
  const transportRef = useRef<LocalTransport | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const identity = await getOrCreateDeviceIdentity();
      if (!mounted) return;

      setDeviceIdentity(identity.deviceId, identity.name);

      const loadedChats = await listLocalChats();
      if (!mounted) return;
      setChats(loadedChats);

      const peerKeys = new Map<string, string>();
      for (const chat of loadedChats) {
        peerKeys.set(chat.peerId, chat.peerPublicKey);
        const msgs = await listLocalMessages(chat.id);
        setMessages(chat.id, msgs);
      }

      const peersData: Record<string, LocalPeer> = {};
      for (const chat of loadedChats) {
        peersData[chat.peerId] = {
          id: chat.peerId,
          name: chat.peerName,
          publicKey: chat.peerPublicKey,
          online: false,
        };
      }
      for (const p of Object.values(peersData)) {
        upsertPeer(p);
      }

      const transport = new LocalTransport(
        (msg, peerId) => {
          engineRef.current?.handleWireMessage(msg, peerId);
        },
        (peerId) => {
          const existing = useLocalChatStore.getState().peers[peerId];
          if (existing) {
            upsertPeer({ ...existing, online: false });
          }
        }
      );
      transportRef.current = transport;

      const engine = new LocalSyncEngine(transport, {
        onIncomingMessage: (chatId, content, fromPeerId) => {
          const msg = {
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            chatId,
            fromMe: false,
            content,
            delivered: true,
            createdAt: Date.now(),
          };
          addMessage(chatId, msg);
          putLocalMessage(msg).catch(() => {});
        },
        onPeerOnline: (peerId, name, publicKey) => {
          const existing = useLocalChatStore.getState().peers[peerId];
          upsertPeer({
            id: peerId,
            name: name || existing?.name || "Unknown",
            publicKey: publicKey || existing?.publicKey || "",
            online: true,
          });
        },
        onPeerOffline: (peerId) => {
          const existing = useLocalChatStore.getState().peers[peerId];
          if (existing) {
            upsertPeer({ ...existing, online: false });
          }
        },
      });
      engineRef.current = engine;

      engine.start(identity, peerKeys);
      setReady(true);
    }

    boot();

    return () => {
      mounted = false;
      engineRef.current?.stop();
      transportRef.current?.stop();
    };
  }, []);

  const pair = useCallback(async (peer: LocalPeer) => {
    const id = useLocalChatStore.getState().deviceId;
    const chatId = chatIdForPeers(id, peer.id);
    const chat: LocalChat = {
      id: chatId,
      peerId: peer.id,
      peerName: peer.name,
      peerPublicKey: peer.publicKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putLocalChat(chat);
    upsertChat(chat);
    upsertPeer({ ...peer, online: true });
    engineRef.current?.setPeerKey(peer.id, peer.publicKey);
    transportRef.current?.broadcast({ kind: "hello", deviceId: id, name: useLocalChatStore.getState().deviceName, publicKey: "" });
  }, []);

  const sendLocalMessage = useCallback(async (peerId: string, content: string) => {
    const id = useLocalChatStore.getState().deviceId;
    const chatId = chatIdForPeers(id, peerId);

    let chat = await getLocalChatByPeer(peerId);
    if (!chat) {
      const peer = useLocalChatStore.getState().peers[peerId];
      if (!peer) throw new Error("Unknown peer");
      chat = {
        id: chatId,
        peerId: peer.id,
        peerName: peer.name,
        peerPublicKey: peer.publicKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await putLocalChat(chat);
      upsertChat(chat);
    }

    const localMsg = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId,
      fromMe: true,
      content,
      delivered: false,
      createdAt: Date.now(),
    };
    addMessage(chatId, localMsg);
    await putLocalMessage(localMsg);

    await engineRef.current?.sendMessage(chatId, peerId, content);
  }, []);

  const createOffer = useCallback(async () => {
    return transportRef.current?.createPairingOffer();
  }, []);

  const acceptOffer = useCallback(async (code: string, offer: any) => {
    return transportRef.current?.acceptPairingOffer(code, offer);
  }, []);

  const acceptAnswer = useCallback(async (code: string, answer: any) => {
    return transportRef.current?.acceptPairingAnswer(code, answer);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    await dbDeleteLocalChat(chatId);
    deleteChatStore(chatId);
  }, []);

  return useMemo(() => ({
    ready,
    deviceId,
    deviceName,
    chats,
    messages,
    peers,
    activeChatId,
    pair,
    sendLocalMessage,
    createOffer,
    acceptOffer,
    acceptAnswer,
    deleteChat,
    setActiveChatId,
  }), [ready, deviceId, deviceName, chats, messages, peers, activeChatId]);
}
