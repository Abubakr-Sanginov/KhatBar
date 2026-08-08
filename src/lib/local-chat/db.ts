/**
 * Sync layer storage — IndexedDB.
 *
 * Stores:
 *   local-chats    — paired peer conversations
 *   local-messages — decrypted message history per chat
 *   local-outbox   — ciphertext waiting to be delivered
 */

import type { LocalChat, LocalMessage, OutboxItem } from "./types"

const DB_NAME = "khatbar-local"
// bumped so pre-existing DBs from earlier builds get the missing stores
const DB_VERSION = 2

const REQUIRED_STORES = ["chats", "messages", "outbox"]

let dbPromise: Promise<IDBDatabase> | null = null

function dropDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error("database blocked"))
  })
}

async function openDbInternal(): Promise<IDBDatabase> {
  const factory = globalThis.indexedDB as IDBFactory | undefined
  if (!factory) throw new Error("IndexedDB unavailable")
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const result = req.result
      if (!result.objectStoreNames.contains("chats")) {
        const chats = result.createObjectStore("chats", { keyPath: "id" })
        chats.createIndex("peerId", "peerId", { unique: true })
      }
      if (!result.objectStoreNames.contains("messages")) {
        const messages = result.createObjectStore("messages", { keyPath: "id" })
        messages.createIndex("chatId", "chatId")
        messages.createIndex("byChatTime", ["chatId", "createdAt"])
      }
      if (!result.objectStoreNames.contains("outbox")) {
        const outbox = result.createObjectStore("outbox", { keyPath: "id" })
        outbox.createIndex("peerId", "peerId")
        outbox.createIndex("state", "state")
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  // A DB left behind by an even older build may still lack the stores.
  if (!REQUIRED_STORES.every((s) => db.objectStoreNames.contains(s))) {
    db.close()
    await dropDatabase()
    return openDbInternal()
  }
  return db
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDbInternal()
  return dbPromise
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listLocalChats(): Promise<LocalChat[]> {
  const db = await openDb()
  const tx = db.transaction("chats", "readonly")
  const req = tx.objectStore("chats").getAll()
  const chats = (await reqToPromise(req)) as LocalChat[]
  await txDone(tx)
  return chats.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getLocalChat(id: string): Promise<LocalChat | undefined> {
  const db = await openDb()
  const tx = db.transaction("chats", "readonly")
  const chat = (await reqToPromise(tx.objectStore("chats").get(id))) as LocalChat | undefined
  await txDone(tx)
  return chat
}

export async function getLocalChatByPeer(peerId: string): Promise<LocalChat | undefined> {
  const db = await openDb()
  const tx = db.transaction("chats", "readonly")
  const index = tx.objectStore("chats").index("peerId")
  const chat = (await reqToPromise(index.get(peerId))) as LocalChat | undefined
  await txDone(tx)
  return chat
}

export async function putLocalChat(chat: LocalChat): Promise<void> {
  const db = await openDb()
  const tx = db.transaction("chats", "readwrite")
  tx.objectStore("chats").put(chat)
  await txDone(tx)
}

export async function deleteLocalChat(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(["chats", "messages", "outbox"], "readwrite")
  tx.objectStore("chats").delete(id)
  const messages = tx.objectStore("messages").index("chatId")
  const ids = (await reqToPromise(messages.getAllKeys(id))) as IDBValidKey[]
  ids.forEach((key) => tx.objectStore("messages").delete(key))
  const outbox = tx.objectStore("outbox").index("peerId")
  const outboxIds = (await reqToPromise(outbox.getAllKeys())) as IDBValidKey[]
  // outbox only stores chatId on items; filter via values below
  const allOutbox = (await reqToPromise(outbox.getAll())) as OutboxItem[]
  allOutbox
    .filter((item) => item.chatId === id)
    .forEach((item) => tx.objectStore("outbox").delete(item.id))
  void outboxIds
  await txDone(tx)
}

export async function listLocalMessages(chatId: string): Promise<LocalMessage[]> {
  const db = await openDb()
  const tx = db.transaction("messages", "readonly")
  const index = tx.objectStore("messages").index("byChatTime")
  const req = index.getAll(IDBKeyRange.bound([chatId, 0], [chatId, Date.now()]))
  const messages = (await reqToPromise(req)) as LocalMessage[]
  await txDone(tx)
  return messages
}

export async function putLocalMessage(message: LocalMessage): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(["messages", "chats"], "readwrite")
  tx.objectStore("messages").put(message)
  const chats = tx.objectStore("chats")
  const chat = (await reqToPromise(chats.get(message.chatId))) as LocalChat | undefined
  if (chat) chats.put({ ...chat, updatedAt: Math.max(chat.updatedAt, message.createdAt) })
  await txDone(tx)
}

export async function updateLocalMessage(id: string, patch: Partial<LocalMessage>): Promise<void> {
  const db = await openDb()
  const tx = db.transaction("messages", "readwrite")
  const store = tx.objectStore("messages")
  const existing = (await reqToPromise(store.get(id))) as LocalMessage | undefined
  if (existing) store.put({ ...existing, ...patch })
  await txDone(tx)
}

export async function listOutbox(state?: OutboxItem["state"]): Promise<OutboxItem[]> {
  const db = await openDb()
  const tx = db.transaction("outbox", "readonly")
  const store = tx.objectStore("outbox")
  const items = state
    ? ((await reqToPromise(store.index("state").getAll(state))) as OutboxItem[])
    : ((await reqToPromise(store.getAll())) as OutboxItem[])
  await txDone(tx)
  return items.sort((a, b) => a.createdAt - b.createdAt)
}

export async function putOutbox(item: OutboxItem): Promise<void> {
  const db = await openDb()
  const tx = db.transaction("outbox", "readwrite")
  tx.objectStore("outbox").put(item)
  await txDone(tx)
}

export async function updateOutbox(id: string, patch: Partial<OutboxItem>): Promise<void> {
  const db = await openDb()
  const tx = db.transaction("outbox", "readwrite")
  const store = tx.objectStore("outbox")
  const existing = (await reqToPromise(store.get(id))) as OutboxItem | undefined
  if (existing) store.put({ ...existing, ...patch })
  await txDone(tx)
}

export async function deleteOutbox(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction("outbox", "readwrite")
  tx.objectStore("outbox").delete(id)
  await txDone(tx)
}
