/**
 * Local chat — device-to-device messaging that never touches the server.
 *
 * Three layers:
 *   Transport  — peer discovery + socket (BroadcastChannel on one device,
 *                WebRTC DataChannel over Wi-Fi LAN, pairing via codes)
 *   Crypto     — ECDH P-256 identity keys + AES-256-GCM message envelopes
 *   Sync       — a delivery ledger: pending → delivered, auto-resend when a
 *                peer comes back in range
 */

export interface LocalPeer {
  id: string // deviceId
  name: string
  publicKey: string // ECDH public key (JWK JSON)
  lastSeen: number
  online: boolean
}

export interface LocalChat {
  id: string // stable hash of (myDeviceId, peerDeviceId)
  peerId: string
  peerName: string
  peerPublicKey: string
  createdAt: number
  updatedAt: number
}

export type DeliveryState = "pending" | "delivered" | "failed"

export interface LocalMessage {
  id: string
  chatId: string
  fromMe: boolean
  content: string // plaintext; ciphertext lives in the outbox while pending
  delivered?: DeliveryState
  createdAt: number
}

export interface OutboxItem {
  id: string
  chatId: string
  peerId: string
  ciphertext: string
  state: DeliveryState
  createdAt: number
  attempts: number
}

export const LOCAL_CHAT_SERVICE = "khatbar-local"
export const LOCAL_CHAT_BEACON = "khatbar-beacon"

export interface Beacon {
  type: "hello" | "bye"
  deviceId: string
  name: string
  publicKey: string
  ts: number
}

/** One WebRTC DataChannel carries the same wire messages as the beacon. */
export type WireMessage =
  | { kind: "hello"; deviceId: string; name: string; publicKey: string }
  | { kind: "message"; deviceId: string; messageId: string; chatId: string; iv: string; ciphertext: string; ts: number }
  | { kind: "ack"; deviceId: string; messageId: string }
  | { kind: "read"; deviceId: string; chatId: string; ts: number }
