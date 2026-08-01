'use client'

import { useMemo, useState } from 'react'

import { MessageComposer } from '@/components/chat/message-composer'
import { MessageList } from '@/components/chat/message-list'
import { Sidebar } from '@/components/chat/sidebar'
import { VoiceRoomPanel } from '@/components/chat/voice-room-panel'
import type { ChatBootstrap, ChatMessage } from '@/lib/messenger/types'

export function ChatShell({ bootstrap }: { bootstrap: ChatBootstrap }) {
  const [messages, setMessages] = useState(bootstrap.messages)

  const activeConversation = useMemo(
    () => bootstrap.conversations.find((item) => item.id === bootstrap.selectedConversationId) ?? bootstrap.conversations[0],
    [bootstrap.conversations, bootstrap.selectedConversationId],
  )

  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversationId === activeConversation?.id),
    [messages, activeConversation?.id],
  )

  const pushOptimistic = (message: ChatMessage) => {
    setMessages((current) => [...current, message])
  }

  if (!activeConversation) {
    return <div className="p-10 text-slate-400">No conversations available.</div>
  }

  return (
    <div className="grid min-h-screen grid-cols-12 bg-slate-950">
      <div className="col-span-12 md:col-span-4 xl:col-span-3">
        <Sidebar items={bootstrap.conversations} activeId={activeConversation.id} />
      </div>
      <main className="col-span-12 flex min-h-screen flex-col gap-5 px-4 py-4 md:col-span-8 xl:col-span-6 xl:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{activeConversation.type}</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">{activeConversation.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{activeConversation.membersCount} members • built for cursor pagination and optimistic UX</p>
            </div>
            <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{activeConversation.unreadCount} unread</div>
          </div>
        </div>

        <MessageList currentUserId={bootstrap.currentUserId} messages={activeMessages} />
        <MessageComposer conversationId={activeConversation.id} currentUserId={bootstrap.currentUserId} onOptimisticMessage={pushOptimistic} />
      </main>
      <div className="col-span-12 border-l border-slate-900 px-4 py-4 xl:col-span-3 xl:px-6">
        <VoiceRoomPanel roomId={`room_${activeConversation.id}`} />
      </div>
    </div>
  )
}
