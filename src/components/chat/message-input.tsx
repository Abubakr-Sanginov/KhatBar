"use client"

import { useState, useRef } from "react"
import { Smile, Paperclip, Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Smile className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>
        <input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {message.trim() ? (
          <Button size="icon" className="h-8 w-8 shrink-0 rounded-xl" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Mic className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  )
}