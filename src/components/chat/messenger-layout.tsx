"use client"

import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { MessagePanel } from "@/components/chat/message-panel"
import { InfoPanel } from "@/components/chat/info-panel"

export function MessengerLayout() {
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <MessagePanel />
      <InfoPanel />
    </div>
  )
}
