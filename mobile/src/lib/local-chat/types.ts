export const SERVICE_TYPE = "khatbar-local";
export const SERVICE_PORT = 0;

export interface DeviceIdentity {
  deviceId: string;
  name: string;
  publicKey: string;
}

export interface LocalChat {
  id: string;
  peerId: string;
  peerName: string;
  peerPublicKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalMessage {
  id: string;
  chatId: string;
  fromMe: boolean;
  content: string;
  delivered: boolean;
  createdAt: number;
}

export interface OutboxItem {
  id: string;
  chatId: string;
  peerId: string;
  ciphertext: string;
  state: "pending" | "delivered" | "failed";
  createdAt: number;
  attempts: number;
}

export interface LocalPeer {
  id: string;
  name: string;
  publicKey: string;
  online: boolean;
}

export type WireMessage =
  | { kind: "hello"; deviceId: string; name: string; publicKey: string }
  | { kind: "message"; chatId: string; ciphertext: string; msgId: string }
  | { kind: "ack"; msgId: string }
  | { kind: "read"; chatId: string; ts: number };
