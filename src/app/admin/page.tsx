"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Users as UsersIcon,
  MessageSquare,
  Trash2,
  Shield,
  User,
  Loader2,
  ArrowLeft,
  Eye,
  Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { formatMessageTime, displayName } from "@/lib/chat-utils"
import type { Report } from "@/types"

interface AdminUser {
  id: string
  email: string
  username: string | null
  displayName: string | null
  role: string
  status: string
  createdAt: string
  lastSeen: string
}

interface AdminChat {
  id: string
  type: string
  name: string | null
  members: { user: { id: string; username: string | null; displayName: string | null; email: string } }[]
  _count: { messages: number }
  updatedAt: string
}

interface AdminMessage {
  id: string
  content: string | null
  type: string
  mediaUrl: string | null
  createdAt: string
  sender: { id: string; username: string | null; displayName: string | null; email: string }
  chat: { id: string; type: string; name: string | null }
}

interface ChatDetail {
  chat: AdminChat
  messages: AdminMessage[]
}

type Tab = "users" | "chats" | "messages" | "reports"

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [tab, setTab] = useState<Tab>("users")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [chats, setChats] = useState<AdminChat[]>([])
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [viewChat, setViewChat] = useState<ChatDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  function urlFor(t: Tab, q = "") {
    const qs = t === "users" && q ? `?q=${encodeURIComponent(q)}` : ""
    return t === "users"
      ? `/api/admin/users${qs}`
      : t === "chats"
        ? "/api/admin/chats"
        : t === "messages"
          ? "/api/admin/messages"
          : "/api/admin/reports"
  }

  function applyData(t: Tab, data: { error?: string; users?: AdminUser[]; chats?: AdminChat[]; messages?: AdminMessage[]; reports?: Report[] }) {
    if (data.error) {
      setError(data.error)
      if (data.error === "Forbidden") router.replace("/")
    } else if (t === "users") setUsers(data.users || [])
    else if (t === "chats") setChats(data.chats || [])
    else if (t === "messages") setMessages(data.messages || [])
    else setReports(data.reports || [])
  }

  function load(t: Tab, q = "", showSpinner = false) {
    if (showSpinner) setLoading(true)
    setError("")
    fetch(urlFor(t, q))
      .then((r) => r.json())
      .then((data) => applyData(t, data))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
      return
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetch(urlFor(tab, query))
        .then((r) => r.json())
        .then((data) => applyData(tab, data))
        .catch(() => {})
    }
  }, [tab, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  async function del(path: string, id: string) {
    if (!confirm("Delete this item?")) return
    const res = await fetch(`${path}?id=${id}`, { method: "DELETE" })
    if (res.ok) load(tab, query, true)
  }

  async function toggleRole(u: AdminUser) {
    const role = u.role === "ADMIN" ? "USER" : "ADMIN"
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role }),
    })
    if (res.ok) load(tab, query, true)
  }

  async function openChat(id: string) {
    setViewLoading(true)
    setViewChat(null)
    try {
      const res = await fetch(`/api/admin/chats/${id}`)
      const data = await res.json()
      if (data.chat) setViewChat({ chat: data.chat, messages: data.messages || [] })
      else setError(data.error || "Failed to load chat")
    } catch {
      setError("Failed to load chat")
    }
    setViewLoading(false)
  }

  async function updateReportStatus(r: Report, status: Report["status"]) {
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, status }),
    })
    if (res.ok) load("reports", "", true)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Admin access only</p>
        <Button onClick={() => router.replace("/")}>Back to chat</Button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof UsersIcon }[] = [
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: Flag },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Admin Panel</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" /> Back to chat
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-5 py-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Button>
        ))}
        {tab === "users" && (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load("users", query) }}
            placeholder="Search users..."
            className="ml-auto h-8 w-56 text-xs"
          />
        )}
      </div>

      {error && <p className="px-5 py-2 text-sm text-destructive">{error}</p>}

      <ScrollArea className="flex-1">
        {tab === "users" && (
          <div className="divide-y divide-border">
            {loading && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {displayName(u)}
                    {u.username && <span className="text-muted-foreground"> • @{u.username}</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} • {u.status} • joined {formatMessageTime(u.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    u.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {u.role}
                </span>
                <Button variant="outline" size="sm" onClick={() => toggleRole(u)} disabled={u.id === user.id}>
                  {u.role === "ADMIN" ? "Demote" : "Promote"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => del("/api/admin/users", u.id)} disabled={u.id === user.id}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!loading && users.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No users</p>
            )}
          </div>
        )}

        {tab === "chats" && (
          <div className="divide-y divide-border">
            {loading && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
            {chats.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name || c.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.members.map((m) => displayName(m.user)).join(", ")} • {c._count.messages} messages
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openChat(c.id)}>
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
                <Button variant="destructive" size="sm" onClick={() => del("/api/admin/chats", c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!loading && chats.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No chats</p>
            )}
          </div>
        )}

        {tab === "messages" && (
          <div className="divide-y divide-border">
            {loading && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
            {messages.map((m) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/50"
                onClick={() => openChat(m.chat.id)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault()
                    openChat(m.chat.id)
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">@{m.sender.username ?? m.sender.email}</span>{" "}
                    <span className="text-muted-foreground">in {m.chat.name || m.chat.type}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    [{m.type}] {m.content || m.mediaUrl || "(media)"} • {formatMessageTime(m.createdAt)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(event) => { event.stopPropagation(); void del("/api/admin/messages", m.id) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!loading && messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No messages</p>
            )}
          </div>
        )}

        {tab === "reports" && (
          <div className="divide-y divide-border">
            {loading && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
            {reports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                  <Flag className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.reason}
                    <span className="text-muted-foreground"> • by {r.reporter.username || r.reporter.email}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.chatId ? `Chat: ${r.chatId.slice(0, 8)}…` : "User report"} • {formatMessageTime(r.createdAt)}
                    {r.chatId && (
                      <button className="ml-2 text-primary underline" onClick={() => openChat(r.chatId!)}>
                        open chat
                      </button>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    r.status === "OPEN" ? "bg-destructive/10 text-destructive"
                    : r.status === "RESOLVED" ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                  )}
                >
                  {r.status}
                </span>
                {r.status === "OPEN" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updateReportStatus(r, "RESOLVED")}>
                      Resolve
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => updateReportStatus(r, "DISMISSED")}>
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            ))}
            {!loading && reports.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No reports</p>
            )}
          </div>
        )}
      </ScrollArea>

      <Dialog open={viewLoading || viewChat !== null} onOpenChange={(open) => { if (!open) setViewChat(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {viewChat ? viewChat.chat.name || viewChat.chat.type : "Loading chat..."}
            </DialogTitle>
          </DialogHeader>
          {viewLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
          {viewChat && (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Members: {viewChat.chat.members.map((m) => displayName(m.user)).join(", ")} •{" "}
                  {viewChat.messages.length} messages
                </p>
                {viewChat.messages.map((m) => (
                  <div key={m.id} className="rounded-xl bg-accent/50 px-3 py-2 text-sm">
                    <p className="text-xs font-medium text-primary">
                      {m.sender.username ? `@${m.sender.username}` : m.sender.email}
                      <span className="ml-2 font-normal text-muted-foreground">{formatMessageTime(m.createdAt)}</span>
                    </p>
                    {m.mediaUrl ? (
                      m.type === "IMAGE" || m.type === "GIF" || m.type === "STICKER" ? (
                        <img src={m.mediaUrl} alt="Media" className="mt-1 max-h-48 rounded-lg" />
                      ) : m.type === "VIDEO" ? (
                        <video src={m.mediaUrl} controls className="mt-1 max-h-48 rounded-lg" />
                      ) : m.type === "AUDIO" ? (
                        <audio src={m.mediaUrl} controls className="mt-1 w-full" />
                      ) : (
                        <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mt-1 block text-primary underline">
                          {m.content || "Open file"}
                        </a>
                      )
                    ) : (
                      <p className="mt-0.5">{m.content || "(deleted)"}</p>
                    )}
                  </div>
                ))}
                {viewChat.messages.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No messages in this chat</p>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
