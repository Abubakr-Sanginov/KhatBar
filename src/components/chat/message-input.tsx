"use client"

import { useState, useRef } from "react"
import { Send, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceRecorder } from "@/components/voice/voice-recorder"
import { VideoCircle } from "@/components/video/video-circle"
import { EmojiPicker } from "@/components/emoji/emoji-picker"
import { GiphyPicker } from "@/components/giphy/giphy-picker"
import { StickerPicker } from "@/components/sticker/sticker-picker"

export function MessageInput() {
  const [message, setMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSend() {
    if (!message.trim()) return
    setMessage("")
    inputRef.current?.focus()
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
    console.log("GIF selected:", url)
  }

  function handleStickerSelect(sticker: string) {
    setMessage((m) => m + sticker)
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <GiphyPicker onGifSelect={handleGifSelect} />
        <StickerPicker onStickerSelect={handleStickerSelect} />
        <input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1">
          <VoiceRecorder />
          <VideoCircle />
          {message.trim() ? (
            <Button size="icon" className="h-8 w-8 shrink-0 rounded-xl" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}