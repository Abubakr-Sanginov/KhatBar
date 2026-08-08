import { getOrCreateDeviceIdentity } from "@/lib/local-chat/crypto"
import { listLocalChats, listLocalMessages } from "@/lib/local-chat/db"
import { LocalSyncEngine } from "@/lib/local-chat/sync"
import { useLocalChatStore } from "@/stores/local-chat-store"

const BOOT_TIMEOUT_MS = 12_000
let engine: LocalSyncEngine | null = null
let bootPromise: Promise<LocalSyncEngine> | null = null
let consumers = 0
let disposeTimer: ReturnType<typeof setTimeout> | null = null

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Local engine startup timed out")), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function boot(): Promise<LocalSyncEngine> {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("Local chat is not supported in this browser")
  }
  const store = useLocalChatStore
  store.getState().setStatus("starting")
  const identity = await getOrCreateDeviceIdentity()
  store.getState().setDeviceId(identity.deviceId)

  const chats = await listLocalChats()
  store.getState().setChats(chats)
  await Promise.all(chats.map(async (chat) => {
    store.getState().setMessages(chat.id, await listLocalMessages(chat.id))
    if (!store.getState().peers[chat.peerId]) {
      store.getState().upsertPeer({
        id: chat.peerId,
        name: chat.peerName,
        publicKey: chat.peerPublicKey,
        lastSeen: chat.updatedAt,
        online: false,
      })
    }
  }))

  const peerKeys = Object.fromEntries(chats.map((chat) => [chat.peerId, chat.peerPublicKey]))
  const next = new LocalSyncEngine({
    onIncoming: (message) => store.getState().appendMessage(message),
    onPeerOnline: (peerId) => store.getState().setPeerOnline(peerId, true),
    onPeerOffline: (peerId) => store.getState().setPeerOnline(peerId, false),
  })
  await next.start({
    deviceId: identity.deviceId,
    name: identity.name,
    publicKey: JSON.stringify(identity.publicKey),
  }, peerKeys)
  engine = next
  store.getState().setStatus("ready")
  return next
}

export function startLocalEngine(force = false): Promise<LocalSyncEngine> {
  if (force) {
    engine?.dispose()
    engine = null
    bootPromise = null
  }
  if (engine) return Promise.resolve(engine)
  if (!bootPromise) {
    bootPromise = withTimeout(boot(), BOOT_TIMEOUT_MS).catch((error: unknown) => {
      engine?.dispose()
      engine = null
      bootPromise = null
      const message = error instanceof Error ? error.message : "Local engine failed to start"
      useLocalChatStore.getState().setStatus("error", message)
      throw error
    })
  }
  return bootPromise
}

export function acquireLocalEngine(): () => void {
  consumers += 1
  if (disposeTimer) {
    clearTimeout(disposeTimer)
    disposeTimer = null
  }
  void startLocalEngine().catch(() => {})
  return () => {
    consumers = Math.max(0, consumers - 1)
    if (consumers !== 0) return
    disposeTimer = setTimeout(() => {
      if (consumers !== 0) return
      engine?.dispose()
      engine = null
      bootPromise = null
      useLocalChatStore.getState().setStatus("idle")
    }, 0)
  }
}

export function getLocalEngine(): LocalSyncEngine | null {
  return engine
}
