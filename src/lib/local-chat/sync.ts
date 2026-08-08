/**
 * Sync layer — delivery ledger.
 *
 * Outgoing messages are written to the outbox as ciphertext with state
 * "pending". When a peer is reachable (BroadcastChannel or WebRTC), the sync
 * engine flushes the outbox, waits for acks, and marks messages "delivered".
 * If the device comes back in range later, pending messages are re-sent
 * automatically.
 */

import { LocalTransport } from "./transport"
import {
  getLocalChatByPeer,
  listOutbox,
  putLocalMessage,
  putOutbox,
  updateOutbox,
  updateLocalMessage,
} from "./db"
import { decryptFromPeer, encryptForPeer } from "./crypto"
import type { LocalMessage, OutboxItem, WireMessage } from "./types"

export interface SyncDeps {
  onIncoming: (message: LocalMessage) => void
  onPeerOnline: (peerId: string) => void
  onPeerOffline: (peerId: string) => void
}

export class LocalSyncEngine {
  private transport: LocalTransport
  private deps: SyncDeps
  private onlinePeers = new Set<string>()
  private identity: { deviceId: string; name: string; publicKey: string } | null = null
  private flushing = false

  constructor(deps: SyncDeps) {
    this.deps = deps
    this.transport = new LocalTransport((msg, peerId) => void this.onWireMessage(msg, peerId))
  }

  get isRunning(): boolean {
    return this.identity !== null
  }

  async start(
    identity: { deviceId: string; name: string; publicKey: string },
    peerKeys: Record<string, string>,
  ): Promise<void> {
    this.identity = identity
    this.peerKeys = peerKeys
    this.transport.start(identity)
    await this.flushOutbox()
  }

  private peerKeys: Record<string, string> = {}

  async setPeerKey(peerId: string, publicKey: string): Promise<void> {
    this.peerKeys[peerId] = publicKey
    this.transport.announce()
  }

  private async onWireMessage(msg: WireMessage, peerId: string): Promise<void> {
    switch (msg.kind) {
      case "hello": {
        if (!this.onlinePeers.has(peerId)) {
          this.onlinePeers.add(peerId)
          this.deps.onPeerOnline(peerId)
          await this.flushOutbox()
        }
        return
      }
      case "message": {
        const chat = await getLocalChatByPeer(peerId)
        if (!chat) return // unknown peer — ignore until paired
        const plain = await decryptFromPeer(
          { iv: msg.iv, ciphertext: msg.ciphertext },
          peerId,
          chat.peerPublicKey,
        )
        if (!plain) return
        const message: LocalMessage = {
          id: msg.messageId,
          chatId: chat.id,
          fromMe: false,
          content: plain,
          delivered: "delivered",
          createdAt: msg.ts,
        }
        await putLocalMessage(message)
        await this.sendAck(peerId, msg.messageId)
        this.deps.onIncoming(message)
        return
      }
      case "ack": {
        await updateOutbox(msg.messageId, { state: "delivered", attempts: 0 })
        await updateLocalMessage(msg.messageId, { delivered: "delivered" })
        return
      }
      case "read": {
        // mark read-receipts (currently only used to ping peers)
        return
      }
    }
  }

  private async sendAck(peerId: string, messageId: string): Promise<void> {
    const deviceId = this.identity?.deviceId ?? ""
    this.transport.send(peerId, { kind: "ack", deviceId, messageId })
  }

  /** Send a message to a local peer. Returns message id. */
  async sendMessage(chatId: string, peerId: string, content: string): Promise<string> {
    const chat = await getLocalChatByPeer(peerId)
    if (!chat) throw new Error("Local chat not paired")
    const messageId = crypto.randomUUID()
    const createdAt = Date.now()
    const envelope = await encryptForPeer(content, peerId, chat.peerPublicKey)

    // 1. Persist ciphertext in the outbox first — the ledger of truth.
    const outboxItem: OutboxItem = {
      id: messageId,
      chatId,
      peerId,
      ciphertext: JSON.stringify(envelope),
      state: "pending",
      createdAt,
      attempts: 0,
    }
    await putOutbox(outboxItem)

    // 2. Reflect immediately in local history (plaintext stays on device).
    const message: LocalMessage = {
      id: messageId,
      chatId,
      fromMe: true,
      content,
      delivered: "pending",
      createdAt,
    }
    await putLocalMessage(message)

    // 3. Try to push now; sync will retry later if offline.
    this.flushOutbox()
    return messageId
  }

  /** Try to deliver all pending messages to reachable peers. */
  async flushOutbox(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      const pending = await listOutbox("pending")
      for (const item of pending) {
        const envelope = JSON.parse(item.ciphertext) as { iv: string; ciphertext: string }
        const sent = this.transport.send(item.peerId, {
          kind: "message",
          deviceId: this.identity?.deviceId ?? "",
          messageId: item.id,
          chatId: item.chatId,
          iv: envelope.iv,
          ciphertext: envelope.ciphertext,
          ts: item.createdAt,
        })
        if (sent) {
          await updateOutbox(item.id, { attempts: item.attempts + 1 })
        } else if (item.attempts >= 5) {
          await updateOutbox(item.id, { state: "failed" })
        }
      }
    } finally {
      this.flushing = false
    }
  }

  /** Peers currently reachable. */
  get onlinePeerIds(): string[] {
    return Array.from(this.onlinePeers)
  }

  async isPeerOnline(peerId: string): Promise<boolean> {
    return this.onlinePeers.has(peerId)
  }

  createPairingCode(): Promise<string> {
    return this.transport.createPairingCode()
  }

  joinPairingCode(code: string): Promise<void> {
    return this.transport.joinPairingCode(code)
  }

  dispose(): void {
    this.transport.dispose()
    this.onlinePeers.clear()
    this.identity = null
  }
}
