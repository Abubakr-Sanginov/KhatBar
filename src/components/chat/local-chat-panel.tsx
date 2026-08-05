"use client"

import { useEffect, useRef, useState } from "react"
import { Radio, Wifi, WifiOff } from "lucide-react"
import { useLocalChatStore } from "@/stores/local-chat-store"
import { useLocalChat } from "@/hooks/use-local-chat"
import { cn } from "@/lib/utils"
import { formatMessageTime } from "@/lib/chat-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LocalChatPanel() {
  const { activeChatId, chats, messages, peers, setActiveChatId } = useLocalChatStore()
  const local = useLocalChat()
  const chat = chats.find((c) => c.id === activeChatId)
  const peer = chat ? peers[chat.peerId] : undefined
  const chatMessages = activeChatId ? (messages[activeChatId] ?? []) : []
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages.length, activeChatId])

  if (!chat) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Radio className="h-8 w-8" />
        <p className="text-sm">Select a local chat</p>
      </main>
    )
  }

  async function handleSend() {
    const content = text.trim()
    if (!content || sending || !peer) return
    setSending(true)
    try {
      await local.sendLocalMessage(peer.id, content)
      setText("")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">{chat.peerName}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {peer?.online ? (
                <>
                  <Wifi className="h-3 w-3 text-success" /> local • online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> local • offline — messages queue
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (window.confirm(`Delete local chat with ${chat.peerName}?`)) {
              setActiveChatId(null)
            }
          }}
        >
          Delete
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {chatMessages.map((message) => {
            const mine = message.fromMe
            return (
              <div
                key={message.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {formatMessageTime(message.createdAt)}
                    {mine && (
                      <span className="ml-1">
                        {message.delivered === "delivered" ? "✓✓" : "•"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="border-t border-border p-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input
            placeholder={peer?.online ? `Message ${chat.peerName}…` : "Message (queued until device is in range)…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <Button onClick={() => void handleSend()} disabled={sending || !text.trim()}>
            Send
          </Button>
        </div>
      </footer>
    </main>
  )
}
