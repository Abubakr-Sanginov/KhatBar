"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  ChevronDown,
  Shield,
  LogOut,
  Settings2,
  MessageCircle,
  Users,
  Megaphone,
  Loader2,
  Globe,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ChatAvatar } from "@/components/ui/chat-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewChatDialog } from "@/components/chat/new-chat-dialog"
import { NewGroupDialog } from "@/components/chat/new-group-dialog"
import { NewChannelDialog } from "@/components/chat/new-channel-dialog"
import { PrivacyDialog } from "@/components/settings/privacy-dialog"
import { cn } from "@/lib/utils"
import { useChatStore, useUIStore } from "@/stores"
import { useAuth } from "@/hooks/use-auth"
import { formatMessageTime, getChatDisplayName, getChatUsername } from "@/lib/chat-utils"
import { decryptPrivateChatMessages } from "@/lib/e2ee"
import type { ChatType } from "@/types"

interface PublicChatResult {
  id: string
  type: ChatType
  name: string | null
  username: string | null
  description: string | null
  avatarUrl: string | null
  memberCount: number
  isMember: boolean
}

export function ChatSidebar() {
  const [search, setSearch] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [publicSearch, setPublicSearch] = useState<{ query: string; results: PublicChatResult[] }>({
    query: "",
    results: [],
  })
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const publicRequestRef = useRef(0)
  const { chats, activeChat, setActiveChat, setChats, resetUnread, unreadCounts } = useChatStore()
  const { user, isAdmin, logout } = useAuth()
  const userId = user?.id
  const { isMobileSidebarOpen, toggleSidebar } = useUIStore()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch("/api/chats")
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled || !data.chats) return
        const decrypted = await Promise.all(data.chats.map(async (chat: import("@/types").Chat) => ({
          ...chat,
          messages: await decryptPrivateChatMessages(chat, userId, chat.messages || []),
        })))
        if (!cancelled) setChats(decrypted)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [setChats, userId])

  // Public discovery runs alongside the local filter, so a search finds both
  // chats you are in and public ones you could join. Results carry the query
  // they belong to, so a cleared or changed search invalidates them at render
  // instead of needing a state reset inside the effect.
  useEffect(() => {
    const q = search.trim()
    if (!q) return
    const id = ++publicRequestRef.current
    const timer = setTimeout(() => {
      fetch(`/api/chats/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (id === publicRequestRef.current) setPublicSearch({ query: q, results: data.chats || [] })
        })
        .catch(() => {
          if (id === publicRequestRef.current) setPublicSearch({ query: q, results: [] })
        })
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  function openChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    setActiveChat(chat)
    resetUnread(chatId)
    if (isMobileSidebarOpen) toggleSidebar()
    fetch(`/api/chats/${chatId}/read`, { method: "POST" }).catch(() => {})
  }

  async function joinPublicChat(target: PublicChatResult) {
    if (joiningId) return
    setJoiningId(target.id)
    try {
      const res = await fetch("/api/chats/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: target.id }),
      })
      if (!res.ok) return
      const listRes = await fetch("/api/chats")
      const listData = await listRes.json()
      if (listData.chats) {
        setChats(listData.chats)
        const joined = listData.chats.find((c: { id: string }) => c.id === target.id)
        if (joined) setActiveChat(joined)
      }
      setSearch("")
      if (isMobileSidebarOpen) toggleSidebar()
    } catch {
      /* keep the sidebar as-is on failure */
    } finally {
      setJoiningId(null)
    }
  }

  const filtered = chats.filter((c) => {
    const name = getChatDisplayName(c, user?.id).toLowerCase()
    const username = getChatUsername(c, user?.id)?.toLowerCase() || ""
    const q = search.toLowerCase()
    return name.includes(q) || username.includes(q)
  })

  const joinedIds = new Set(chats.map((c) => c.id))
  const trimmedSearch = search.trim()
  // Stale results (from a previous query) are ignored until the fetch lands.
  const publicFresh = publicSearch.query === trimmedSearch
  const discoverable = publicFresh
    ? publicSearch.results.filter((c) => !c.isMember && !joinedIds.has(c.id))
    : []
  const searchingPublic = trimmedSearch.length > 0 && !publicFresh

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <UserAvatar
                  user={{ avatarUrl: null, displayName: user?.username ?? null, username: user?.username ?? null, status: "ONLINE" }}
                  size="sm"
                  showStatus={false}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.username ?? "Me"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsPrivacyOpen(true)}>
                <Settings2 className="h-4 w-4" />
                Privacy & Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await logout(); router.push("/login") }}>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setIsNewChatOpen(true)}>
                <MessageCircle className="h-4 w-4" />
                New Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewGroupOpen(true)}>
                <Users className="h-4 w-4" />
                New Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewChannelOpen(true)}>
                <Megaphone className="h-4 w-4" />
                New Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-2">
            {filtered.length === 0 && discoverable.length === 0 && !searchingPublic && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {chats.length === 0 ? "No chats yet. Start a new chat by username." : "No matching chats"}
              </p>
            )}
            {filtered.map((chat) => {
              const name = getChatDisplayName(chat, user?.id)
              const username = getChatUsername(chat, user?.id)
              const lastMessage = chat.lastMessage ?? chat.messages?.[0] ?? null
              const other = chat.members.find((m) => m.user.id !== user?.id)?.user ?? chat.members[0]?.user
              return (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    activeChat?.id === chat.id && "bg-accent",
                  )}
                >
                  <ChatAvatar
                    type={chat.type}
                    name={name}
                    avatarUrl={chat.avatarUrl}
                    otherUser={other}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {chat.type === "CHANNEL" && <Megaphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        {chat.type === "GROUP" && <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className="truncate text-sm font-medium">{name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {lastMessage ? formatMessageTime(lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-muted-foreground">
                        {username ? `@${username}` : ""}
                        {lastMessage?.content ? ` — ${lastMessage.content}` : ""}
                      </span>
                      {(unreadCounts[chat.id] ?? chat.unreadCount ?? 0) > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                          {unreadCounts[chat.id] ?? chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {searchingPublic && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {discoverable.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-xs font-medium uppercase text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" /> Public
                </p>
                {discoverable.map((target) => {
                  const targetName = target.name || target.username || "Unnamed"
                  return (
                    <div
                      key={target.id}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    >
                      <ChatAvatar
                        type={target.type}
                        name={targetName}
                        avatarUrl={target.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {target.type === "CHANNEL" ? (
                            <Megaphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate text-sm font-medium">{targetName}</span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {target.username ? `@${target.username} • ` : ""}
                          {target.memberCount}{" "}
                          {target.type === "CHANNEL" ? "subscribers" : "members"}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        disabled={joiningId !== null}
                        onClick={() => joinPublicChat(target)}
                      >
                        {joiningId === target.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Join"}
                      </Button>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </aside>

      <NewChatDialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} />
      <NewGroupDialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen} />
      <NewChannelDialog open={isNewChannelOpen} onOpenChange={setIsNewChannelOpen} />
      <PrivacyDialog key={isPrivacyOpen ? "open" : "closed"} open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen} />
    </>
  )
}
