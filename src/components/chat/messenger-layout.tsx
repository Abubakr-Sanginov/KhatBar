"use client"

import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { MessagePanel } from "@/components/chat/message-panel"
import { InfoPanel } from "@/components/chat/info-panel"
import { useChatStore } from "@/stores"

export function MessengerLayout() {
  const chatId = useChatStore((s) => s.activeChat?.id)
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <MessagePanel />
      <InfoPanel key={chatId ?? "none"} />
    </div>
  )
}
