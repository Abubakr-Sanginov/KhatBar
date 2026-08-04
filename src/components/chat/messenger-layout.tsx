"use client"

import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { MessagePanel } from "@/components/chat/message-panel"
import { InfoPanel } from "@/components/chat/info-panel"
import { LocalChatPanel } from "@/components/chat/local-chat-panel"
import { LocalInfoPanel } from "@/components/chat/local-info-panel"
import { useChatStore } from "@/stores"
import { useLocalChatStore } from "@/stores/local-chat-store"

export function MessengerLayout() {
  const chatId = useChatStore((s) => s.activeChat?.id)
  const localActiveChatId = useLocalChatStore((s) => s.activeChatId)
  if (localActiveChatId) {
    return (
      <div className="flex h-full">
        <ChatSidebar />
        <LocalChatPanel />
        <LocalInfoPanel />
      </div>
    )
  }
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <MessagePanel />
      <InfoPanel key={chatId ?? "none"} />
    </div>
  )
}
