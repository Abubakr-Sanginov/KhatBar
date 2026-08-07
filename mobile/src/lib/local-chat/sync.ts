import type { DeviceIdentity, LocalChat, WireMessage } from "./types";
import type { LocalTransport } from "./transport";
import { encryptForPeer, decryptFromPeer, chatIdForPeers } from "./crypto";
import {
  listOutbox,
  putOutboxItem,
  updateOutboxState,
  getLocalChatByPeer,
  putLocalMessage,
  markMessageDelivered,
} from "./db";

export type SyncCallbacks = {
  onIncomingMessage: (chatId: string, content: string, fromPeerId: string) => void;
  onPeerOnline: (peerId: string, name: string, publicKey: string) => void;
  onPeerOffline: (peerId: string) => void;
};

export class LocalSyncEngine {
  private transport: LocalTransport;
  private identity: DeviceIdentity | null = null;
  private peerKeys = new Map<string, string>();
  private onlinePeers = new Set<string>();
  private callbacks: SyncCallbacks;

  constructor(transport: LocalTransport, callbacks: SyncCallbacks) {
    this.transport = transport;
    this.callbacks = callbacks;
  }

  start(identity: DeviceIdentity, peerKeys: Map<string, string>) {
    this.identity = identity;
    this.peerKeys = peerKeys;
    this.transport.start(identity);
  }

  stop() {
    this.transport.stop();
  }

  setPeerKey(peerId: string, publicKey: string) {
    this.peerKeys.set(peerId, publicKey);
  }

  handleWireMessage(msg: WireMessage, peerId: string) {
    switch (msg.kind) {
      case "hello":
        this.onlinePeers.add(peerId);
        this.callbacks.onPeerOnline(peerId, msg.name, msg.publicKey);
        if (msg.publicKey) this.peerKeys.set(peerId, msg.publicKey);
        this.flushOutbox();
        break;
      case "message":
        this.handleIncomingMessage(msg, peerId);
        break;
      case "ack":
        this.handleAck(msg);
        break;
    }
  }

  private async handleIncomingMessage(msg: WireMessage & { kind: "message" }, peerId: string) {
    const peerKey = this.peerKeys.get(peerId);
    if (!peerKey) return;

    const chatId = chatIdForPeers(this.identity!.deviceId, peerId);
    try {
      const content = await decryptFromPeer(msg.ciphertext, peerId, peerKey);
      this.transport.send(peerId, { kind: "ack", msgId: msg.msgId });
      this.callbacks.onIncomingMessage(chatId, content, peerId);
    } catch {}
  }

  private async handleAck(msg: WireMessage & { kind: "ack" }) {
    const items = await listOutbox("pending");
    const item = items.find((i) => i.id === msg.msgId);
    if (item) {
      await updateOutboxState(item.id, "delivered", item.attempts);
      await markMessageDelivered(item.id);
    }
  }

  async sendMessage(chatId: string, peerId: string, content: string): Promise<string> {
    const peerKey = this.peerKeys.get(peerId);
    if (!peerKey) throw new Error("Peer key not found");

    const ciphertext = await encryptForPeer(content, peerId, peerKey);
    const msgId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await putOutboxItem({
      id: msgId,
      chatId,
      peerId,
      ciphertext,
      state: "pending",
      createdAt: Date.now(),
      attempts: 0,
    });

    await this.flushOutbox();
    return msgId;
  }

  private async flushOutbox() {
    const pending = await listOutbox("pending");
    for (const item of pending) {
      if (item.attempts >= 5) {
        await updateOutboxState(item.id, "failed", item.attempts);
        continue;
      }
      const sent = this.transport.send(item.peerId, {
        kind: "message",
        chatId: item.chatId,
        ciphertext: item.ciphertext,
        msgId: item.id,
      });
      if (sent) {
        await updateOutboxState(item.id, "pending", item.attempts + 1);
      }
    }
  }

  isPeerOnline(peerId: string): boolean {
    return this.onlinePeers.has(peerId);
  }

  getOnlinePeers(): string[] {
    return Array.from(this.onlinePeers);
  }
}
