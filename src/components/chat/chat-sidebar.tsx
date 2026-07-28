"use client"

import { useState } from "react"
import { Search, Plus, ChevronDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"
import { useChatStore, useUIStore } from "@/stores"

const MOCK_CHATS = [
  { id: "1", name: "Alex Johnson", lastMessage: "Hey, how are you?", time: "2m", unread: 2, status: "ONLINE" },
  { id: "2", name: "Sarah Chen", lastMessage: "The design looks great!", time: "15m", unread: 0, status: "ONLINE" },
  { id: "3", name: "Design Team", lastMessage: "Mike: New mockups are ready", time: "1h", unread: 5, status: "IDLE" },
  { id: "4", name: "Mike Peters", lastMessage: "Sure, let me check", time: "2h", unread: 0, status: "OFFLINE" },
  { id: "5", name: "Emily Watson", lastMessage: "Thanks for the help!", time: "1d", unread: 0, status: "OFFLINE" },
]

export function ChatSidebar() {
  const [search, setSearch] = useState("")
  const { activeChat, setActiveChat } = useChatStore()
  const { isMobileSidebarOpen, toggleSidebar } = useUIStore()

  const filtered = MOCK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={toggleSidebar} />
      )}
      <aside
        className={cn(
          "flex w-80 shrink-0 flex-col border-r border-border bg-card",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:z-auto",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">KhatBar</h1>
          <Button variant="ghost" size="icon">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <Button variant="secondary" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-2">
            {filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => { setActiveChat(chat as any); if (isMobileSidebarOpen) toggleSidebar() }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  activeChat?.id === chat.id && "bg-accent",
                )}
              >
                <UserAvatar
                  user={{ avatarUrl: null, displayName: chat.name, username: chat.name, status: chat.status as any }}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{chat.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs text-muted-foreground">{chat.lastMessage}</span>
                    {chat.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}