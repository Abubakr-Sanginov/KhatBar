import * as SecureStore from "expo-secure-store";
import type { Chat, Message } from "../types";

// react-native-quick-crypto requires a dev client build (not Expo Go).
// Fall back to the global crypto object when the native module is unavailable.
// Use `any` for the types since SubtleCrypto/CryptoKey may not exist in RN.
let subtle: any;
let getRandomValues: <T extends ArrayBufferView>(array: T) => T;
try {
  const qc = require("react-native-quick-crypto");
  subtle = qc.subtle;
  getRandomValues = qc.getRandomValues;
} catch {
  const g = globalThis.crypto ?? (globalThis as any);
  subtle = g.subtle;
  getRandomValues = (arr: any) => g.getRandomValues(arr);
}

/** E2EE for 1:1 private chats and closed groups.
 *
 * Wire-compatible with the web client in src/lib/e2ee.ts: the same ECDH P-256
 * identity keys published as a JWK string, the same HKDF info label, and the
 * same {v,iv,ciphertext} envelope. A device keeps its private key in the OS
 * keychain (SecureStore) and only ever uploads the public JWK.
 */
const PRIVATE_KEY_TAG = "khatbar_e2ee_private_jwk";
const PUBLIC_KEY_TAG = "khatbar_e2ee_public_jwk";
const INFO = "KhatBar private chat v1";

type EncryptedEnvelope = { v: 1; iv: string; ciphertext: string };
type GroupParticipant = { id: string; encryptionPublicKey?: string | null };

export const ENCRYPTED_MESSAGE_KEY_UNAVAILABLE = "Encrypted message — key unavailable";
export const ENCRYPTED_MESSAGE_DECRYPT_FAILED = "Encrypted message — unable to decrypt";

function parseEncryptedEnvelope(value: unknown): EncryptedEnvelope | null {
  let parsed: unknown = value;
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    if (parsed.length > 50_000) return null;
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const envelope = parsed as Partial<EncryptedEnvelope>;
  return envelope.v === 1 && typeof envelope.iv === "string" && typeof envelope.ciphertext === "string"
    ? envelope as EncryptedEnvelope
    : null;
}

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

/** Hermes has no atob/btoa and TextEncoder is not guaranteed, so do it by hand. */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

function base64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array((clean.length * 3) >> 2);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] ? B64.indexOf(clean[i + 2]) : -1;
    const c3 = clean[i + 3] ? B64.indexOf(clean[i + 3]) : -1;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (c2 >= 0) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (c3 >= 0) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return p === out.length ? out : out.subarray(0, p);
}

function utf8ToBytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      // Surrogate pair -> single code point.
      c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return new Uint8Array(out);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
    } else if (b < 0xf0) {
      out += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
    } else {
      const cp =
        ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      const n = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (n >> 10), 0xdc00 + (n & 1023));
    }
  }
  return out;
}

function toBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function randomBytes(length: number): Uint8Array {
  return getRandomValues(new Uint8Array(length)) as Uint8Array;
}

/** Generates the device identity pair once and publishes only the public JWK. */
export async function ensureIdentityKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const [existingPrivate, existingPublic] = await Promise.all([
    SecureStore.getItemAsync(PRIVATE_KEY_TAG),
    SecureStore.getItemAsync(PUBLIC_KEY_TAG),
  ]);
  if (existingPrivate && existingPublic) {
    return { publicKey: existingPublic, privateKey: existingPrivate };
  }

  const pair = await subtle.generateKey(ECDH, true, ["deriveBits", "deriveKey"]);
  if (!("privateKey" in pair)) throw new Error("Could not generate an encryption key pair");

  // Exported as JWK because that is the format the server validates and the
  // web client publishes; raw/pkcs8 would not interoperate.
  const publicKey = JSON.stringify(await subtle.exportKey("jwk", pair.publicKey as any));
  const privateKey = JSON.stringify(await subtle.exportKey("jwk", pair.privateKey as any));

  await SecureStore.setItemAsync(PRIVATE_KEY_TAG, privateKey);
  await SecureStore.setItemAsync(PUBLIC_KEY_TAG, publicKey);

  return { publicKey, privateKey };
}

export async function getStoredPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBLIC_KEY_TAG);
}

export async function getStoredPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PRIVATE_KEY_TAG);
}

export async function clearIdentityKeys(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PRIVATE_KEY_TAG),
    SecureStore.deleteItemAsync(PUBLIC_KEY_TAG),
  ]);
}

async function loadPrivateKey(): Promise<any> {
  const jwk = await SecureStore.getItemAsync(PRIVATE_KEY_TAG);
  if (!jwk) throw new Error("Private encryption key is unavailable on this device");
  return subtle.importKey("jwk", JSON.parse(jwk), ECDH, false, ["deriveBits", "deriveKey"]);
}

/** ECDH with the peer, then HKDF to an AES-GCM key bound to this chat's salt. */
async function chatKey(peerPublicKey: string, salt: string): Promise<any> {
  const privateKey = await loadPrivateKey();
  const peer = await subtle.importKey("jwk", JSON.parse(peerPublicKey), ECDH, false, []);
  const shared = await subtle.deriveBits({ name: "ECDH", public: peer }, privateKey, 256);
  const material = await subtle.importKey("raw", shared, { name: "HKDF" }, false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: base64ToBytes(salt), info: utf8ToBytes(INFO) },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptWithKey(key: any, plaintext: Uint8Array): Promise<string> {
  const iv = randomBytes(12);
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return JSON.stringify({
    v: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(toBytes(ciphertext)),
  } satisfies EncryptedEnvelope);
}

async function decryptWithKey(key: any, encoded: string): Promise<Uint8Array> {
  const envelope = parseEncryptedEnvelope(encoded);
  if (!envelope) {
    throw new Error("Invalid encrypted message");
  }
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ciphertext),
  );
  return toBytes(plaintext);
}

export async function encryptPrivateText(
  peerPublicKey: string,
  salt: string,
  plaintext: string,
): Promise<string> {
  return encryptWithKey(await chatKey(peerPublicKey, salt), utf8ToBytes(plaintext));
}

export async function decryptPrivateText(
  peerPublicKey: string,
  salt: string,
  encoded: string,
): Promise<string> {
  return bytesToUtf8(await decryptWithKey(await chatKey(peerPublicKey, salt), encoded));
}

/**
 * Creates a random AES key for a new closed group and wraps it once per
 * participant using ECDH. The server receives the wrappers, never the AES key.
 */
export async function createPrivateGroupSetup(creatorId: string, members: GroupParticipant[]) {
  const ownPublicKey = await getStoredPublicKey();
  if (!ownPublicKey) throw new Error("Your encryption key is not ready yet. Try again in a moment.");
  const participants = [{ id: creatorId, encryptionPublicKey: ownPublicKey }, ...members];
  if (participants.some((member) => !member.encryptionPublicKey)) {
    throw new Error("Every group member must open KhatBar once to set up encryption");
  }
  const encryptionSalt = bytesToBase64(randomBytes(32));
  const rawGroupKey = randomBytes(32);
  const memberKeyEnvelopes: Record<string, string> = {};
  for (const member of participants) {
    memberKeyEnvelopes[member.id] = await encryptWithKey(
      await chatKey(member.encryptionPublicKey!, encryptionSalt),
      rawGroupKey,
    );
  }
  return { encryptionSalt, memberKeyEnvelopes };
}

function privatePeer(chat: Chat, userId: string) {
  if (chat.type !== "PRIVATE" || !chat.encryptionSalt) {
    throw new Error("This private chat has not been encrypted yet");
  }
  const peer = chat.members?.find((member) => member.user?.id !== userId)?.user;
  if (!peer?.encryptionPublicKey) throw new Error("The other participant has not set up encryption");
  return { publicKey: peer.encryptionPublicKey, salt: chat.encryptionSalt };
}

function isPrivateGroup(chat: Chat) {
  return chat.type === "GROUP" && !chat.isPublic && Boolean(chat.encryptionSalt);
}

async function privateGroupKey(chat: Chat, userId: string): Promise<any> {
  if (!isPrivateGroup(chat) || !chat.encryptionSalt || !chat.ownerId) {
    throw new Error("This private group has not been encrypted yet");
  }
  const mine = chat.members?.find((member) => member.user?.id === userId);
  const owner = chat.members?.find((member) => member.user?.id === chat.ownerId)?.user;
  if (!mine?.encryptedChatKey || !owner?.encryptionPublicKey) {
    throw new Error("Group encryption key is unavailable");
  }
  const raw = await decryptWithKey(
    await chatKey(owner.encryptionPublicKey, chat.encryptionSalt),
    mine.encryptedChatKey,
  );
  return subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function isEncryptedChat(chat: Chat) {
  return chat.type === "PRIVATE" || isPrivateGroup(chat);
}

export async function encryptForPrivateChat(chat: Chat, userId: string, plaintext: string) {
  if (chat.type === "PRIVATE") {
    const peer = privatePeer(chat, userId);
    return encryptPrivateText(peer.publicKey, peer.salt, plaintext);
  }
  return encryptWithKey(await privateGroupKey(chat, userId), utf8ToBytes(plaintext));
}

/** Replaces ciphertext only in memory. Nothing decrypted is sent back to the server. */
export async function decryptPrivateChatMessages(
  chat: Chat,
  userId: string,
  messages: Message[],
): Promise<Message[]> {
  if (!isEncryptedChat(chat)) return messages;

  const unavailable = (list: Message[]) =>
    list.map((message) =>
      message.isEncrypted ? { ...message, content: "Encrypted message — key unavailable" } : message,
    );

  if (isPrivateGroup(chat)) {
    try {
      const key = await privateGroupKey(chat, userId);
      return Promise.all(
        messages.map(async (message) => {
          if (!message.content || (!message.isEncrypted && !isEncryptedEnvelope(message.content))) return message;
          try {
            return { ...message, content: bytesToUtf8(await decryptWithKey(key, message.content)) };
          } catch {
            return { ...message, content: "Encrypted message — unable to decrypt" };
          }
        }),
      );
    } catch {
      return unavailable(messages);
    }
  }

  let peer: { publicKey: string; salt: string };
  try {
    peer = privatePeer(chat, userId);
  } catch {
    return unavailable(messages);
  }
  return Promise.all(
    messages.map(async (message) => {
      if (!message.content || (!message.isEncrypted && !isEncryptedEnvelope(message.content))) return message;
      try {
        return { ...message, content: await decryptPrivateText(peer.publicKey, peer.salt, message.content) };
      } catch {
        return { ...message, content: "Encrypted message — unable to decrypt" };
      }
    }),
  );
}

export function isEncryptedEnvelope(value: unknown): boolean {
  return parseEncryptedEnvelope(value) !== null;
}

export async function normalizeIncomingMessage(
  chat: Chat | null | undefined,
  userId: string | null | undefined,
  message: Message,
): Promise<Message> {
  if (!chat || !userId) return message;
  const [normalized] = await decryptPrivateChatMessages(chat, userId, [message]);
  return normalized;
}
