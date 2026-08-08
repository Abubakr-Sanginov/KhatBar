/**
 * Crypto layer for local chats.
 *
 * Identity keys: ECDH P-256. The public key is exchanged at pairing time
 * (over the beacon / WebRTC handshake). A shared secret is derived per peer
 * and used to encrypt every message with AES-256-GCM.
 */

const idb = () => globalThis.indexedDB as IDBFactory | undefined

const KEY_DB_NAME = "khatbar-local-keys"
// bumped so pre-existing DBs from earlier builds get the missing stores
const KEY_DB_VERSION = 2

const IDENTITY_STORE = "keys"
const SHARED_STORE = "shared"

const REQUIRED_STORES = [IDENTITY_STORE, SHARED_STORE]

function dropDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = idb()!.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error("database blocked"))
  })
}

async function openKeyDb(): Promise<IDBDatabase> {
  const factory = idb()
  if (!factory) throw new Error("IndexedDB unavailable in this browser")
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(KEY_DB_NAME, KEY_DB_VERSION)
    req.onupgradeneeded = () => {
      for (const store of REQUIRED_STORES) {
        if (!req.result.objectStoreNames.contains(store)) {
          req.result.createObjectStore(store)
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  // A DB left behind by an even older build may still lack the stores.
  if (!REQUIRED_STORES.every((s) => db.objectStoreNames.contains(s))) {
    db.close()
    await dropDatabase(KEY_DB_NAME)
    return openKeyDb()
  }
  return db
}

async function getRecord<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openKeyDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly")
      const req = tx.objectStore(storeName).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function putRecord(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openKeyDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite")
      tx.objectStore(storeName).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

const DEVICE_ID_KEY = "deviceId"
const IDENTITY_KEY = "identity"
const SHARED_PREFIX = "shared:"

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")
}

function isCryptoKey(value: CryptoKey | JsonWebKey): value is CryptoKey {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey
}

export async function getOrCreateDeviceIdentity(): Promise<{
  deviceId: string
  name: string
  publicKey: JsonWebKey
  privateKey: CryptoKey
}> {
  let deviceId = await getRecord<string>(IDENTITY_STORE, DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = generateId()
    await putRecord(IDENTITY_STORE, DEVICE_ID_KEY, deviceId)
  }
  const existing = await getRecord<{
    name: string
    publicKey: JsonWebKey
    privateKey: CryptoKey | JsonWebKey
  }>(IDENTITY_STORE, IDENTITY_KEY)
  if (existing) {
    try {
      const privateKey = isCryptoKey(existing.privateKey)
        ? existing.privateKey
        : await crypto.subtle.importKey(
            "jwk",
            existing.privateKey,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveBits"],
          )
      if (privateKey.type !== "private" || privateKey.algorithm.name !== "ECDH") {
        throw new Error("Incompatible identity key")
      }
      return { deviceId, name: existing.name, publicKey: existing.publicKey, privateKey }
    } catch {
      // Older builds could persist an invalid/non-exportable identity. Regenerate it
      // instead of leaving local chat permanently unable to start.
    }
  }
  // Web Crypto applies extractability to both halves of a generated pair. Generate
  // it exportable only long enough to serialize the public key and re-import the
  // private key as non-extractable before it leaves this function. IndexedDB then
  // persists that CryptoKey via structured clone, so later sessions need no export.
  const generated = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  ) as CryptoKeyPair
  const publicJwk = await crypto.subtle.exportKey("jwk", generated.publicKey)
  const privateJwk = await crypto.subtle.exportKey("jwk", generated.privateKey)
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  )
  const name = existing?.name ??
    ((typeof navigator !== "undefined" && navigator.language === "ru"
      ? "Локальное устройство"
      : "Local device") + " " + deviceId.slice(0, 4).toUpperCase())
  await putRecord(IDENTITY_STORE, IDENTITY_KEY, { name, publicKey: publicJwk, privateKey })
  return { deviceId, name, publicKey: publicJwk, privateKey }
}

/** Derive (or fetch cached) shared secret with a peer. */
async function getSharedSecret(
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: string | JsonWebKey,
  peerId: string,
): Promise<CryptoKey> {
  const cacheKey = SHARED_PREFIX + peerId
  const cached = await getRecord<CryptoKey | JsonWebKey>(SHARED_STORE, cacheKey)
  if (cached) {
    if (isCryptoKey(cached)) return cached
    const migrated = await crypto.subtle.importKey(
      "jwk",
      cached,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
    await putRecord(SHARED_STORE, cacheKey, migrated)
    return migrated
  }
  const publicJwk = typeof peerPublicKeyJwk === "string" ? (JSON.parse(peerPublicKeyJwk) as JsonWebKey) : peerPublicKeyJwk
  const peerPublicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peerPublicKey }, myPrivateKey, 256)
  const raw = await crypto.subtle.importKey(
    "raw",
    bits,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
  await putRecord(SHARED_STORE, cacheKey, raw)
  return raw
}

function toB64(buf: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromB64(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export interface EncryptedEnvelope {
  iv: string
  ciphertext: string
}

/** Encrypt a message for a peer. */
export async function encryptForPeer(
  content: string,
  peerId: string,
  peerPublicKeyJwk: string | JsonWebKey,
): Promise<EncryptedEnvelope> {
  const identity = await getOrCreateDeviceIdentity()
  const secret = await getSharedSecret(identity.privateKey, peerPublicKeyJwk, peerId)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    secret,
    new TextEncoder().encode(content),
  )
  return { iv: toB64(iv.buffer), ciphertext: toB64(encrypted) }
}

/** Decrypt a message from a peer. Returns null on failure. */
export async function decryptFromPeer(
  envelope: EncryptedEnvelope,
  peerId: string,
  peerPublicKeyJwk: string | JsonWebKey,
): Promise<string | null> {
  try {
    const identity = await getOrCreateDeviceIdentity()
    const secret = await getSharedSecret(identity.privateKey, peerPublicKeyJwk, peerId)
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(envelope.iv) },
      secret,
      fromB64(envelope.ciphertext),
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}
