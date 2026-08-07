"use client"

import type { Chat, Message } from "@/types"

/** Browser-only crypto for 1:1 private chats.
 *
 * Each device owns an ECDH private key in IndexedDB. Only its public JWK is
 * uploaded. A per-chat public salt makes the derived AES key unique to that
 * conversation. The server therefore only relays/stores ciphertext.
 */
const DB_NAME = "khatbar-e2ee"
const STORE = "identity-keys"
const INFO = new TextEncoder().encode("KhatBar private chat v1")

type EncryptedEnvelope = { v: 1; iv: string; ciphertext: string }
type GroupParticipant = { id: string; encryptionPublicKey?: string | null }

export const ENCRYPTED_MESSAGE_KEY_UNAVAILABLE = "Encrypted message — key unavailable"
export const ENCRYPTED_MESSAGE_DECRYPT_FAILED = "Encrypted message — unable to decrypt"

function parseEncryptedEnvelope(value: unknown): EncryptedEnvelope | null {
  let parsed: unknown = value
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    if (parsed.length > 50_000) return null
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== "object") return null
  const envelope = parsed as Partial<EncryptedEnvelope>
  return envelope.v === 1 && typeof envelope.iv === "string" && typeof envelope.ciphertext === "string"
    ? envelope as EncryptedEnvelope
    : null
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadPrivateKey(userId: string): Promise<CryptoKey | undefined> {
  const db = await openKeyDb()
  return new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(userId)
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

async function savePrivateKey(userId: string, privateKey: CryptoKey) {
  const db = await openKeyDb()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(privateKey, userId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

async function savePublicJwk(userId: string, publicJwk: string) {
  const db = await openKeyDb()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(publicJwk, `${userId}:public`)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

async function localPublicJwk(userId: string) {
  const db = await openKeyDb()
  return new Promise<string | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(`${userId}:public`)
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

// Kept separate so a first generated pair persists both halves before use.
export async function publishPrivateChatIdentity(userId: string) {
  let publicJwk: string
  const stored = await loadPrivateKey(userId)
  const db = await openKeyDb()
  const savedPublic = await new Promise<string | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(`${userId}:public`)
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
  if (stored && savedPublic) {
    publicJwk = savedPublic
  } else {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"],
    ) as CryptoKeyPair
    await savePrivateKey(userId, pair.privateKey)
    publicJwk = JSON.stringify(await crypto.subtle.exportKey("jwk", pair.publicKey))
    await savePublicJwk(userId, publicJwk)
  }
  const response = await fetch("/api/keys", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey: publicJwk }),
  })
  if (!response.ok) throw new Error("Could not publish encryption key")
}

async function chatKey(userId: string, peerPublicKey: string, salt: string) {
  const privateKey = await loadPrivateKey(userId)
  if (!privateKey) throw new Error("Private encryption key is unavailable on this device")
  const peer = await crypto.subtle.importKey(
    "jwk", JSON.parse(peerPublicKey), { name: "ECDH", namedCurve: "P-256" }, false, [],
  )
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, privateKey, 256)
  const material = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: base64ToBytes(salt), info: INFO },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encryptPrivateText(userId: string, peerPublicKey: string, salt: string, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chatKey(userId, peerPublicKey, salt), new TextEncoder().encode(plaintext))
  return JSON.stringify({ v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) } satisfies EncryptedEnvelope)
}

export async function decryptPrivateText(userId: string, peerPublicKey: string, salt: string, encoded: string) {
  const envelope = parseEncryptedEnvelope(encoded)
  if (!envelope) throw new Error("Invalid encrypted message")
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
    await chatKey(userId, peerPublicKey, salt),
    base64ToBytes(envelope.ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}

async function encryptWithKey(key: CryptoKey, plaintext: BufferSource) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
  return JSON.stringify({ v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) } satisfies EncryptedEnvelope)
}

async function decryptWithKey(key: CryptoKey, encoded: string) {
  const envelope = parseEncryptedEnvelope(encoded)
  if (!envelope) throw new Error("Invalid encrypted message")
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext),
  )
}

/**
 * Creates a random AES key for a new closed group and wraps it once per
 * participant using ECDH. The server receives the wrappers, never the AES key.
 */
export async function createPrivateGroupSetup(creatorId: string, members: GroupParticipant[]) {
  const ownPublicKey = await localPublicJwk(creatorId)
  if (!ownPublicKey) throw new Error("Your encryption key is not ready yet. Try again in a moment.")
  const participants = [{ id: creatorId, encryptionPublicKey: ownPublicKey }, ...members]
  if (participants.some((member) => !member.encryptionPublicKey)) {
    throw new Error("Every group member must open KhatBar once to set up encryption")
  }
  const encryptionSalt = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
  const rawGroupKey = crypto.getRandomValues(new Uint8Array(32))
  const memberKeyEnvelopes: Record<string, string> = {}
  for (const member of participants) {
    memberKeyEnvelopes[member.id] = await encryptWithKey(
      await chatKey(creatorId, member.encryptionPublicKey!, encryptionSalt), rawGroupKey,
    )
  }
  return { encryptionSalt, memberKeyEnvelopes }
}

function privatePeer(chat: Chat, userId: string) {
  if (chat.type !== "PRIVATE" || !chat.encryptionSalt) throw new Error("This private chat has not been encrypted yet")
  const peer = chat.members.find((member) => member.user.id !== userId)?.user
  if (!peer?.encryptionPublicKey) throw new Error("The other participant has not set up encryption")
  return { publicKey: peer.encryptionPublicKey, salt: chat.encryptionSalt }
}

export async function encryptForPrivateChat(chat: Chat, userId: string, plaintext: string) {
  if (chat.type === "PRIVATE") {
    const peer = privatePeer(chat, userId)
    return encryptPrivateText(userId, peer.publicKey, peer.salt, plaintext)
  }
  return encryptWithKey(await privateGroupKey(chat, userId), new TextEncoder().encode(plaintext))
}

function isPrivateGroup(chat: Chat) {
  return chat.type === "GROUP" && !chat.isPublic && Boolean(chat.encryptionSalt)
}

async function privateGroupKey(chat: Chat, userId: string) {
  if (!isPrivateGroup(chat) || !chat.encryptionSalt || !chat.ownerId) {
    throw new Error("This private group has not been encrypted yet")
  }
  const mine = chat.members.find((member) => member.user.id === userId)
  const owner = chat.members.find((member) => member.user.id === chat.ownerId)?.user
  if (!mine?.encryptedChatKey || !owner?.encryptionPublicKey) throw new Error("Group encryption key is unavailable")
  const raw = await decryptWithKey(
    await chatKey(userId, owner.encryptionPublicKey, chat.encryptionSalt), mine.encryptedChatKey,
  )
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

/** Replaces ciphertext only in memory. Nothing decrypted is sent back to the server. */
export async function decryptPrivateChatMessages(chat: Chat, userId: string, messages: Message[]) {
  if (chat.type !== "PRIVATE" && !isPrivateGroup(chat)) return messages
  if (isPrivateGroup(chat)) {
    try {
      const key = await privateGroupKey(chat, userId)
      return Promise.all(messages.map(async (message) => {
        if (!message.content || (!message.isEncrypted && !isEncryptedEnvelope(message.content))) return message
        try {
          return { ...message, content: new TextDecoder().decode(await decryptWithKey(key, message.content)) }
        } catch {
          return { ...message, content: ENCRYPTED_MESSAGE_DECRYPT_FAILED }
        }
      }))
    } catch {
      return messages.map((message) =>
      message.isEncrypted || isEncryptedEnvelope(message.content)
        ? { ...message, content: ENCRYPTED_MESSAGE_KEY_UNAVAILABLE }
        : message,
    )
    }
  }
  let peer: { publicKey: string; salt: string }
  try {
    peer = privatePeer(chat, userId)
  } catch {
    return messages.map((message) =>
      message.isEncrypted || isEncryptedEnvelope(message.content)
        ? { ...message, content: ENCRYPTED_MESSAGE_KEY_UNAVAILABLE }
        : message,
    )
  }
  return Promise.all(messages.map(async (message) => {
    if (!message.content || (!message.isEncrypted && !isEncryptedEnvelope(message.content))) return message
    try {
      return { ...message, content: await decryptPrivateText(userId, peer.publicKey, peer.salt, message.content) }
    } catch {
      return { ...message, content: ENCRYPTED_MESSAGE_DECRYPT_FAILED }
    }
  }))
}

export function isEncryptedEnvelope(value: unknown): boolean {
  return parseEncryptedEnvelope(value) !== null
}
