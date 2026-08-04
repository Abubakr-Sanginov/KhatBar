"use client"

import { X, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react"
import { useLocalChatStore } from "@/stores/local-chat-store"
import { deleteLocalChat } from "@/lib/local-chat/db"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

export function LocalInfoPanel() {
  const { activeChatId, chats, peers, setActiveChatId } = useLocalChatStore()
  const chat = chats.find((c) => c.id === activeChatId)
  const peer = chat ? peers[chat.peerId] : undefined

  if (!chat) return null

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card md:flex">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Local chat</h2>
        <Button variant="ghost" size="icon" onClick={() => setActiveChatId(null)}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Radio className="h-7 w-7" />
          </span>
          <p className="text-lg font-semibold">{chat.peerName}</p>
          <p
            className={`flex items-center gap-1 text-xs ${
              peer?.online ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {peer?.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {peer?.online ? "in range" : "out of range"}
          </p>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start gap-3 rounded-xl border border-border p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">End-to-end encrypted</p>
              <p className="mt-1">
                Messages are encrypted with AES-256-GCM using an ECDH P-256 key pair exchanged
                at pairing time. Nothing ever touches the server.
              </p>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              if (window.confirm(`Delete local chat with ${chat.peerName}?`)) {
                await deleteLocalChat(chat.id)
                setActiveChatId(null)
              }
            }}
          >
            Delete local chat
          </Button>
        </div>
      </ScrollArea>
    </aside>
  )
}
