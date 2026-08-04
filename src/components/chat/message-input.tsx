"use client"

import { useState, useRef } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceRecorder } from "@/components/voice/voice-recorder"
import { VideoCircle } from "@/components/video/video-circle"
import { EmojiPicker } from "@/components/emoji/emoji-picker"
import { GiphyPicker } from "@/components/giphy/giphy-picker"
import { StickerPicker } from "@/components/sticker/sticker-picker"
import { useChatStore } from "@/stores"
import { useSocket } from "@/hooks/use-socket"
import { useAuth } from "@/hooks/use-auth"
import { encryptForPrivateChat } from "@/lib/e2ee"

export function MessageInput() {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const { activeChat, addMessage } = useChatStore()
  const { isConnected, emit } = useSocket()
  const { user } = useAuth()

  function emitTyping(isTyping: boolean) {
    if (!activeChat) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (isTyping) {
      emit("typing", { chatId: activeChat.id, isTyping: true })
      typingTimer.current = setTimeout(() => {
        emit("typing", { chatId: activeChat.id, isTyping: false })
      }, 2500)
    } else {
      emit("typing", { chatId: activeChat.id, isTyping: false })
    }
  }

  async function sendMessage(payload: {
    content?: string
    type: string
    mediaUrl?: string
    replyToId?: string
  }) {
    if (!activeChat || sending || !user) return
    setSending(true)
    try {
      const isEncryptedChat = activeChat.type === "PRIVATE" ||
        (activeChat.type === "GROUP" && !activeChat.isPublic)
      const securedPayload = isEncryptedChat && payload.type === "TEXT" && payload.content
        ? { ...payload, content: await encryptForPrivateChat(activeChat, user.id, payload.content) }
        : payload
      if (isConnected) {
        emit("message:send", { chatId: activeChat.id, ...securedPayload })
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: activeChat.id, ...securedPayload }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.message) addMessage(activeChat.id, data.message)
        }
      }
    } catch {
      /* keep state on failure */
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleSend() {
    const content = message.trim()
    if (!content || sending) return
    setMessage("")
    await sendMessage({ content, type: "TEXT" })
  }

  async function handleAudioSend(blob: Blob) {
    const form = new FormData()
    form.append("file", blob, "voice.webm")
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) return
    const data = await res.json()
    await sendMessage({ type: "AUDIO", mediaUrl: data.url })
  }

  async function handleVideoSend(blob: Blob) {
    const form = new FormData()
    form.append("file", blob, "video.webm")
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) return
    const data = await res.json()
    await sendMessage({ type: "VIDEO", mediaUrl: data.url })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleEmojiSelect(emoji: string) {
    setMessage((m) => m + emoji)
    inputRef.current?.focus()
  }

  function handleGifSelect(url: string) {
    sendMessage({ type: "GIF", mediaUrl: url })
  }

  function handleStickerSelect(url: string) {
    sendMessage({ type: "STICKER", mediaUrl: url })
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        {(activeChat?.type !== "PRIVATE" && (activeChat?.type !== "GROUP" || activeChat.isPublic)) && <GiphyPicker onGifSelect={handleGifSelect} />}
        {(activeChat?.type !== "PRIVATE" && (activeChat?.type !== "GROUP" || activeChat.isPublic)) && <StickerPicker onStickerSelect={handleStickerSelect} />}
        <input
          ref={inputRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (e.target.value.trim()) emitTyping(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1">
          {(activeChat?.type !== "PRIVATE" && (activeChat?.type !== "GROUP" || activeChat.isPublic)) && <VoiceRecorder onSendAudio={handleAudioSend} />}
          {(activeChat?.type !== "PRIVATE" && (activeChat?.type !== "GROUP" || activeChat.isPublic)) && <VideoCircle onSendVideo={handleVideoSend} />}
          {message.trim() ? (
            <Button size="icon" className="h-8 w-8 shrink-0 rounded-xl" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
