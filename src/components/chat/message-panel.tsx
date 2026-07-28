"use client"

import { useRef, useCallback, useState } from "react"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { motion, AnimatePresence } from "framer-motion"
import { MoreHorizontal, Phone, Video, Search as SearchIcon } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { MessageInput } from "@/components/chat/message-input"
import { useChatStore } from "@/stores"

const MOCK_MESSAGES = [
  { id: "1", content: "Hey! How are you?", sender: "them", time: "10:30 AM" },
  { id: "2", content: "I'm doing great! Just finished the new design system.", sender: "me", time: "10:31 AM" },
  { id: "3", content: "That sounds amazing! Can I see it?", sender: "them", time: "10:32 AM" },
  { id: "4", content: "Sure! I'll send it over. It's based on the new design tokens we discussed.", sender: "me", time: "10:33 AM" },
  { id: "5", content: "Perfect, I've been looking forward to this!", sender: "them", time: "10:34 AM" },
]

export function MessagePanel() {
  const { activeChat } = useChatStore()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [messages] = useState(MOCK_MESSAGES)

  if (!activeChat) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Your messages</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            user={{ avatarUrl: null, displayName: activeChat.name!, username: activeChat.name!, status: "ONLINE" }}
            size="md"
          />
          <div>
            <p className="text-sm font-medium">{activeChat.name}</p>
            <p className="text-xs text-emerald-500">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><SearchIcon className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          className="h-full"
          data={messages}
          followOutput="smooth"
          initialTopMostItemIndex={messages.length - 1}
          itemContent={(index) => {
            const msg = messages[index]
            const isMine = msg.sender === "me"
            return (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={cn(
                    "flex px-4 py-1",
                    isMine ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md",
                    )}
                  >
                    <p>{msg.content}</p>
                    <p className={cn("mt-0.5 text-right text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )
          }}
          components={{
            Header: () => <div className="h-4" />,
            Footer: () => <div className="h-4" />,
          }}
        />
      </div>

      <MessageInput />
    </main>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}