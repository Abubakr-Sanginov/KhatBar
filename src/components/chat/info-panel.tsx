"use client"

import { useEffect, useState } from "react"
import {
  X,
  Bell,
  BellOff,
  Search,
  Image,
  Pin,
  Shield,
  ShieldCheck,
  Flag,
  FileText,
  Loader2,
  CheckCircle2,
  MoreHorizontal,
  Users,
  Check,
  Link as LinkIcon,
  LogOut,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ChatAvatar } from "@/components/ui/chat-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useChatStore, useUIStore } from "@/stores"
import { useAuth } from "@/hooks/use-auth"
import { getChatDisplayName, getChatUsername, displayName } from "@/lib/chat-utils"
import { cn } from "@/lib/utils"
import type { MemberRole, Message } from "@/types"

const REPORT_REASONS = ["Spam", "Harassment", "Impersonation", "Inappropriate content", "Other"]

function RoleBadge({ role }: { role: MemberRole }) {
  const styles: Record<MemberRole, string> = {
    OWNER: "bg-primary/10 text-primary",
    ADMIN: "bg-warning/15 text-warning",
    MODERATOR: "bg-info/15 text-info",
    MEMBER: "bg-muted text-muted-foreground",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", styles[role])}>{role}</span>
  )
}

export function InfoPanel() {
  const { activeChat, chats } = useChatStore()
  const { toggleInfoPanel } = useUIStore()
  const { user } = useAuth()
  const [media, setMedia] = useState<Message[]>([])
  const [pinned, setPinned] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false
    const chatId = useChatStore.getState().activeChat?.id
    return chatId ? localStorage.getItem(`mute:${chatId}`) === "1" : false
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [mediaOpen, setMediaOpen] = useState(false)
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [encryptionOpen, setEncryptionOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportNote, setReportNote] = useState("")
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkChannelId, setLinkChannelId] = useState("")

  const chatId = activeChat?.id

  useEffect(() => {
    if (!chatId) return
    fetch(`/api/messages?chatId=${chatId}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: Message[] = data.messages || []
        setMedia(msgs.filter((m) => m.mediaUrl))
        setPinned(msgs.filter((m) => m.isPinned))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [chatId])

  useEffect(() => {
    if (!searchOpen || !chatId || !searchQuery.trim()) return
    fetch(`/api/messages?chatId=${chatId}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: Message[] = data.messages || []
        setSearchResults(
          msgs.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      })
      .catch(() => {})
  }, [searchOpen, searchQuery, chatId])

  if (!activeChat) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-card xl:flex xl:flex-col">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">No conversation selected</p>
        </div>
      </aside>
    )
  }

  const name = getChatDisplayName(activeChat, user?.id)
  const username = getChatUsername(activeChat, user?.id)
  const other = activeChat.members.find((m) => m.user.id !== user?.id)?.user ?? activeChat.members[0]?.user
  const myRole = activeChat.members.find((m) => m.user.id === user?.id)?.role ?? "MEMBER"
  const isGroupChat = activeChat.type !== "PRIVATE"
  const isChannel = activeChat.type === "CHANNEL"
  const memberCount = activeChat.memberCount ?? activeChat.members.length
  const canLeave = isGroupChat && myRole !== "OWNER"
  const canManageLink = activeChat.type === "GROUP" && myRole !== "MEMBER" && myRole !== "MODERATOR"
  const myChannels = chats.filter(
    (c) =>
      c.type === "CHANNEL" &&
      c.members.some((m) => m.user.id === user?.id && (m.role === "OWNER" || m.role === "ADMIN")),
  )
  const inviteLink =
    isGroupChat && activeChat.inviteCode
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${activeChat.inviteCode}`
      : null

  function toggleMute() {
    const next = !isMuted
    setIsMuted(next)
    if (chatId) localStorage.setItem(`mute:${chatId}`, next ? "1" : "0")
  }

  async function refreshChats() {
    const res = await fetch("/api/chats")
    const data = await res.json()
    if (data.chats) {
      useChatStore.getState().setChats(data.chats)
      if (chatId) {
        const updated = data.chats.find((c: { id: string }) => c.id === chatId)
        if (updated) useChatStore.getState().setActiveChat(updated)
      }
    }
  }

  async function changeRole(memberId: string, role: MemberRole) {
    if (!chatId) return
    try {
      const res = await fetch(`/api/chats/${chatId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      })
      if (res.ok) refreshChats()
    } catch {}
  }

  async function kickMember(memberId: string) {
    if (!chatId) return
    if (!confirm("Remove this member from the chat?")) return
    try {
      const res = await fetch(`/api/chats/${chatId}/members?memberId=${memberId}`, { method: "DELETE" })
      if (res.ok) refreshChats()
    } catch {}
  }

  async function leaveChat() {
    if (!chatId) return
    if (!confirm(isChannel ? "Leave this channel?" : "Leave this group?")) return
    try {
      const res = await fetch(`/api/chats/${chatId}/leave`, { method: "POST" })
      if (!res.ok) return
      useChatStore.getState().setActiveChat(null)
      const listRes = await fetch("/api/chats")
      const listData = await listRes.json()
      if (listData.chats) useChatStore.getState().setChats(listData.chats)
    } catch {}
  }

  async function deleteChat() {
    if (!chatId) return
    const hint =
      activeChat?.type === "PRIVATE"
        ? "This deletes the whole conversation for both sides."
        : myRole === "OWNER"
          ? "You own this chat. Deleting removes it for everyone."
          : "You are not the owner — this only removes the chat from your list."
    if (!confirm(`Delete this chat?\n\n${hint}`)) return
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
      if (!res.ok) return
      useChatStore.getState().removeChat(chatId)
    } catch {}
  }

  function copyInviteLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(
      () => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      },
      () => {},
    )
  }

  async function setLinkedChannel(channelId: string) {
    if (!chatId || linking) return
    setLinking(true)
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedChannelId: channelId || null }),
      })
      if (res.ok) {
        setLinkChannelId("")
        await refreshChats()
      }
    } catch {}
    setLinking(false)
  }

  function availableRoles(target: MemberRole): MemberRole[] {
    if (myRole === "OWNER") return target === "MEMBER" ? ["ADMIN", "MODERATOR", "MEMBER"] : ["MODERATOR", "MEMBER"]
    if (myRole === "ADMIN") return target === "MODERATOR" || target === "MEMBER" ? ["MODERATOR", "MEMBER"] : []
    if (myRole === "MODERATOR") return target === "MEMBER" ? ["MEMBER"] : []
    return []
  }

  return (
    <aside className="hidden w-80 shrink-0 border-l border-border bg-card xl:flex xl:flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
        <Button variant="ghost" size="icon" onClick={toggleInfoPanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <ChatAvatar
            type={activeChat.type}
            name={name}
            avatarUrl={activeChat.avatarUrl}
            otherUser={other}
            size="xl"
          />
          <h3 className="mt-3 text-lg font-semibold">{name}</h3>
          {username && <p className="text-sm text-muted-foreground">@{username}</p>}
          {isGroupChat ? (
            <>
              <p className="text-sm text-muted-foreground">
                {isChannel
                  ? `${memberCount} ${memberCount === 1 ? "subscriber" : "subscribers"}`
                  : `${memberCount} ${memberCount === 1 ? "member" : "members"}`}
                {activeChat.isPublic ? " • Public" : " • Private"}
              </p>
              {activeChat.description && (
                <p className="mt-2 text-sm text-muted-foreground">{activeChat.description}</p>
              )}
            </>
          ) : (
            <p className={cn("text-sm", other?.status === "ONLINE" ? "text-success" : "text-muted-foreground")}>
              {other?.status === "ONLINE" ? "Online" : "Offline"}
            </p>
          )}
        </div>

        {inviteLink && (
          <div className="px-3 pb-4">
            <p className="px-3 pb-1 text-xs font-medium uppercase text-muted-foreground">Invite link</p>
            <button
              onClick={copyInviteLink}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              {linkCopied ? (
                <Check className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{inviteLink}</span>
            </button>
          </div>
        )}

        {isChannel && activeChat.linkedGroups && activeChat.linkedGroups.length > 0 && (
          <div className="px-3 pb-4">
            <p className="px-3 pb-1 text-xs font-medium uppercase text-muted-foreground">
              Linked {activeChat.linkedGroups.length === 1 ? "group" : "groups"}
            </p>
            {activeChat.linkedGroups.map((group) => (
              <button
                key={group.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  const target = chats.find((c) => c.id === group.id)
                  if (target) useChatStore.getState().setActiveChat(target)
                }}
              >
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {group.name || (group.username ? `@${group.username}` : "Group")}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeChat.type === "GROUP" && activeChat.isPublic && canManageLink && (
          <div className="px-3 pb-4">
            <p className="px-3 pb-1 text-xs font-medium uppercase text-muted-foreground">Linked channel</p>
            {activeChat.linkedChannel ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
                  <LinkIcon className="h-4 w-4 shrink-0 text-success" />
                  <span className="min-w-0 flex-1 truncate">
                    {activeChat.linkedChannel.name ||
                      (activeChat.linkedChannel.username ? `@${activeChat.linkedChannel.username}` : "Channel")}
                  </span>
                </div>
                <div className="flex gap-2 px-3">
                  <select
                    value={linkChannelId}
                    onChange={(e) => setLinkChannelId(e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Choose channel…</option>
                    {myChannels
                      .filter((c) => c.id !== activeChat.linkedChannelId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || (c.username ? `@${c.username}` : "Channel")}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={linking || !linkChannelId}
                    onClick={() => setLinkedChannel(linkChannelId)}
                  >
                    {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Link"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={linking} onClick={() => setLinkedChannel("")}>
                    Unlink
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 px-3">
                <select
                  value={linkChannelId}
                  onChange={(e) => setLinkChannelId(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choose channel…</option>
                  {myChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || (c.username ? `@${c.username}` : "Channel")}
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={linking || !linkChannelId} onClick={() => setLinkedChannel(linkChannelId)}>
                  {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Link"}
                </Button>
              </div>
            )}
            {myChannels.length === 0 && !activeChat.linkedChannel && (
              <p className="px-3 text-xs text-muted-foreground">
                You need to own or admin a channel to link it here.
              </p>
            )}
          </div>
        )}

        {isGroupChat && (
          <div className="space-y-1 px-3 pb-4">
            <p className="flex items-center gap-1 px-3 text-xs font-medium uppercase text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {isChannel ? "Subscribers" : "Members"} ({activeChat.members.length})
            </p>
            {activeChat.members.map((m) => {
              const roles = availableRoles(m.role)
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-accent/50">
                  <UserAvatar
                    user={{ avatarUrl: m.user.avatarUrl, displayName: m.user.displayName, username: m.user.username, status: m.user.status }}
                    size="sm"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {displayName(m.user)}
                    {m.user.id === user?.id && <span className="text-muted-foreground"> (you)</span>}
                  </p>
                  <RoleBadge role={m.role} />
                  {roles.length > 0 && m.user.id !== user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {roles.map((r) => (
                          <DropdownMenuItem key={r} onClick={() => changeRole(m.user.id, r)}>
                            Set {r}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => kickMember(m.user.id)}>
                          Remove from chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-1 px-3 pb-4">
          <p className="px-3 text-xs font-medium uppercase text-muted-foreground">Actions</p>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent" onClick={toggleMute}>
            {isMuted ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
            {isMuted ? "Unmute notifications" : "Mute notifications"}
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => setSearchOpen((o) => !o)}
          >
            <Search className="h-4 w-4 text-muted-foreground" /> Search in conversation
          </button>
          {searchOpen && (
            <div className="px-3 pb-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="h-9 text-xs"
                autoFocus
              />
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {searchResults.map((m) => (
                  <p key={m.id} className="rounded-lg bg-accent/50 px-2 py-1.5 text-xs">
                    {m.content || m.mediaUrl || "(media)"}
                  </p>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p>
                )}
              </div>
            </div>
          )}
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => setMediaOpen((o) => !o)}
          >
            <Image className="h-4 w-4 text-muted-foreground" /> Media & files ({media.length})
          </button>
          {mediaOpen && (
            <div className="px-3">
              <div className="mt-2 grid grid-cols-3 gap-2">
                {loading && <Loader2 className="col-span-3 mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
                {media.slice(0, 9).map((m) =>
                  m.type === "AUDIO" ? (
                    <audio key={m.id} src={m.mediaUrl!} controls className="h-16 w-full" />
                  ) : m.type === "VIDEO" ? (
                    <video key={m.id} src={m.mediaUrl!} className="aspect-square rounded-lg object-cover" muted />
                  ) : m.type === "FILE" ? (
                    <a key={m.id} href={m.mediaUrl!} target="_blank" rel="noreferrer" className="flex aspect-square items-center justify-center rounded-lg bg-accent/50 hover:bg-accent">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </a>
                  ) : (
                    <img key={m.id} src={m.mediaUrl!} alt="Media" className="aspect-square rounded-lg object-cover" loading="lazy" />
                  ),
                )}
              </div>
              {!loading && media.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No media yet</p>}
            </div>
          )}
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => setPinnedOpen((o) => !o)}
          >
            <Pin className="h-4 w-4 text-muted-foreground" /> Pinned messages ({pinned.length})
          </button>
          {pinnedOpen && (
            <div className="px-3">
              {pinned.map((m) => (
                <p key={m.id} className="mb-1 rounded-lg bg-accent/50 px-2 py-1.5 text-xs">
                  {m.content || m.mediaUrl || "(media)"}
                </p>
              ))}
              {pinned.length === 0 && <p className="text-xs text-muted-foreground">Nothing pinned</p>}
            </div>
          )}
        </div>

        <div className="space-y-1 px-3 pb-4">
          <p className="px-3 text-xs font-medium uppercase text-muted-foreground">Privacy & support</p>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => setEncryptionOpen(true)}
          >
            <Shield className="h-4 w-4 text-muted-foreground" /> Encryption
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            onClick={() => { setReportReason(REPORT_REASONS[0]); setReportNote(""); setReportSent(false); setReportOpen(true) }}
          >
            <Flag className="h-4 w-4" /> Report
          </button>
          {canLeave && (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={leaveChat}
            >
              <LogOut className="h-4 w-4" /> {isChannel ? "Leave channel" : "Leave group"}
            </button>
          )}
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            onClick={deleteChat}
          >
            <Trash2 className="h-4 w-4" /> Delete chat
          </button>
        </div>
      </ScrollArea>

      <Dialog open={encryptionOpen} onOpenChange={setEncryptionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" /> End-to-end encrypted
            </DialogTitle>
            <DialogDescription>
              Messages in this chat are protected with TLS in transit and stored securely. Keys are generated per chat,
              and only the participants can access this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <span className="font-medium text-foreground">TLS transport:</span> all traffic between you and the server is encrypted</p>
            <p>• <span className="font-medium text-foreground">Secure storage:</span> media is served over HTTPS only</p>
            <p>• <span className="font-medium text-foreground">Session auth:</span> your session is protected with a signed cookie</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report {name}</DialogTitle>
            <DialogDescription>This report is sent to our moderators for review.</DialogDescription>
          </DialogHeader>
          {reportSent ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="font-medium">Report submitted</p>
              <p className="text-sm text-muted-foreground">Thanks for helping keep KhatBar safe. Moderators will review it shortly.</p>
              <Button className="mt-2" onClick={() => setReportOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reportReason === reason}
                      onChange={() => setReportReason(reason)}
                      className="accent-primary"
                    />
                    {reason}
                  </label>
                ))}
              </div>
              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Add details (optional)"
                rows={3}
                className="flex min-h-[60px] w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={reportSending}
                  onClick={async () => {
                    setReportSending(true)
                    try {
                      const res = await fetch("/api/reports", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          chatId: activeChat?.id,
                          reason: reportNote ? `${reportReason} — ${reportNote}` : reportReason,
                        }),
                      })
                      if (res.ok) setReportSent(true)
                    } catch {}
                    setReportSending(false)
                  }}
                >
                  {reportSending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  )
}
