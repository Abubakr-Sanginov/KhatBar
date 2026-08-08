"use client"

import { useEffect, useRef, useState } from "react"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { motion } from "framer-motion"
import {
  MoreHorizontal,
  Phone,
  Video,
  Search as SearchIcon,
  Trash2,
  FileText,
  Pin,
  PinOff,
  Flag,
  PanelRight,
  X,
  Check,
  Loader2,
} from "lucide-react"
import { ChatAvatar } from "@/components/ui/chat-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageInput } from "@/components/chat/message-input"
import { CallMessage } from "@/components/chat/call-message"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useChatStore, useUIStore } from "@/stores"
import { useAuth } from "@/hooks/use-auth"
import { useSocket } from "@/hooks/use-socket"
import { useCall } from "@/hooks/use-call"
import { cn } from "@/lib/utils"
import { decryptPrivateChatMessages } from "@/lib/e2ee"
import { normalizeIncomingMessage } from "@/lib/incoming-message"
import { getChatDisplayName, getChatUsername, formatMessageTime, canPostToChat } from "@/lib/chat-utils"
import type { Message } from "@/types"

function MessageBubble({
  msg,
  isMine,
  onDelete,
  onTogglePin,
  isRead,
  isSelected,
  selectionMode,
  onStartSelection,
  onExtendSelection,
  onToggleSelection,
}: {
  msg: Message
  isMine: boolean
  onDelete: () => void
  onTogglePin: () => void
  isRead: boolean
  isSelected: boolean
  selectionMode: boolean
  onStartSelection: () => void
  onExtendSelection: () => void
  onToggleSelection: () => void
}) {
  const senderUsername = msg.sender?.username
  const [hovered, setHovered] = useState(false)
  const isDeleted = msg.content === null && !msg.mediaUrl

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex px-4 py-1 group",
        isMine ? "justify-end" : "justify-start",
        selectionMode && "cursor-pointer",
      )}
      onMouseEnter={() => {
        setHovered(true)
        if (selectionMode) onExtendSelection()
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectionMode && onToggleSelection()}
      onDoubleClick={onStartSelection}
    >
      <div
        className={cn(
          "relative min-w-0 max-w-[min(75%,42rem)] rounded-2xl px-4 py-2 text-sm transition-shadow",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md",
          isSelected && "ring-2 ring-primary",
        )}
      >
        {isSelected && (
          <span
            className={cn(
              "absolute -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow",
              isMine ? "-left-2" : "-right-2",
            )}
          >
            <Check className="h-3 w-3" />
          </span>
        )}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin() }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-lg p-1.5 opacity-60 hover:bg-accent hover:opacity-100",
              isMine ? "-left-9" : "-right-9",
            )}
            title={msg.isPinned ? "Unpin" : "Pin"}
          >
            {msg.isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
          </button>
        )}
        {isMine && hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground opacity-60 hover:bg-accent hover:opacity-100",
              isMine ? "-left-[4.5rem]" : "-right-[4.5rem]",
            )}
            title={isDeleted ? "Delete forever" : "Delete"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {msg.isPinned && (
          <Pin className="absolute -top-2 right-2 h-3 w-3 text-primary" />
        )}
        {!isMine && senderUsername && (
          <p className="mb-0.5 text-xs font-medium text-primary">@{senderUsername}</p>
        )}

        {isDeleted ? (
          <p className="italic opacity-60">Message deleted</p>
        ) : msg.type === "TEXT" ? (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
        ) : msg.type === "IMAGE" ? (
          <img src={msg.mediaUrl!} alt="" className="max-h-80 rounded-xl" />
        ) : msg.type === "GIF" ? (
          <img src={msg.mediaUrl!} alt="" className="w-56 rounded-xl" loading="lazy" />
        ) : msg.type === "STICKER" ? (
          <img src={msg.mediaUrl!} alt="" className="w-36 rounded-xl" loading="lazy" />
        ) : msg.type === "VIDEO" ? (
          <video src={msg.mediaUrl!} controls className="max-h-80 rounded-xl" />
        ) : msg.type === "AUDIO" ? (
          <audio src={msg.mediaUrl!} controls className="w-64" />
        ) : msg.type === "FILE" ? (
          <a href={msg.mediaUrl!} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
            <FileText className="h-4 w-4" />
            {msg.content || "File"}
          </a>
        ) : msg.type === "SYSTEM" ? (
          <p className="text-xs italic opacity-70">{msg.content}</p>
        ) : (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
        )}

        <p className={cn("mt-0.5 text-right text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {msg.content !== null || msg.mediaUrl ? formatMessageTime(msg.createdAt) : ""}
          {isRead && <span className="ml-1 font-medium text-primary-foreground">✓ Read</span>}
        </p>
      </div>
    </motion.div>
  )
}

export function MessagePanel() {
  const { activeChat, chats, messages, setMessages, prependMessages, addMessage, removeMessage, redactMessage, touchChat, incrementUnread, updateMemberStatus, updateMemberLastRead, resetUnread } = useChatStore()
  const { toggleInfoPanel } = useUIStore()
  const { user, encryptionReady } = useAuth()
  const { isConnected, emit, on } = useSocket()
  const { startCall: beginCall } = useCall()
  const [isTyping, setIsTyping] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Message[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const lastSelectedIndexRef = useRef<number | null>(null)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chatId = activeChat?.id
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  useEffect(() => {
    if (!chatId) return
    let cancelled = false
    fetch(`/api/messages?chatId=${chatId}&limit=50`)
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled || !data.messages || !activeChat || !user?.id) return
        const decrypted = await decryptPrivateChatMessages(activeChat, user.id, data.messages)
        if (!cancelled) {
          setMessages(chatId, decrypted)
          setHasMore(Boolean(data.nextCursor))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [chatId, activeChat, setMessages, user?.id, encryptionReady])

  async function loadOlder() {
    if (!chatId || loadingOlder) return
    const firstId = (messages[chatId] || [])[0]?.id
    if (!firstId) return
    setLoadingOlder(true)
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}&limit=50&cursor=${encodeURIComponent(firstId)}`)
      const data = await res.json()
      const msgs = data.messages || []
      if (activeChat && user?.id) {
        const decrypted = await decryptPrivateChatMessages(activeChat, user.id, msgs)
        if (decrypted.length) prependMessages(chatId, decrypted)
      }
      setHasMore(Boolean(data.nextCursor))
    } catch {
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    if (!chatId) return
    emit("join:chat", chatId)
    return () => emit("leave:chat", chatId)
  }, [chatId, isConnected, emit])

  useEffect(() => {
    const offNew = on("message:new", (data) => {
      const msg = data as Message
      const chat = chats.find((item) => item.id === msg.chatId) ?? (activeChat?.id === msg.chatId ? activeChat : undefined)
      void normalizeIncomingMessage(chat, user?.id, msg).then((decrypted) => {
        touchChat(msg.chatId, decrypted)
        if (msg.chatId === chatId) addMessage(chatId!, decrypted)
        else if (msg.senderId !== user?.id) incrementUnread(msg.chatId)
      })
    })
    const offDeleted = on("message:deleted", (data) => {
      const d = data as { chatId: string; messageId: string }
      redactMessage(d.chatId, d.messageId)
      setDeletingIds((prev) => prev.filter((id) => id !== d.messageId))
    })
    const offDeletedHard = on("message:deleted-hard", (data) => {
      const d = data as { chatId: string; messageId: string }
      setSelectedIds((prev) => prev.filter((id) => id !== d.messageId))
      setDeletingIds((prev) => prev.filter((id) => id !== d.messageId))
      removeMessage(d.chatId, d.messageId)
    })
    const offTyping = on("typing", (data) => {
      const d = data as { chatId: string; userId: string; isTyping: boolean }
      if (d.chatId === chatId && d.userId !== user?.id) {
        setIsTyping(d.isTyping)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        if (d.isTyping) {
          typingTimer.current = setTimeout(() => setIsTyping(false), 4000)
        }
      }
    })
    const offPresence = on("presence:update", (data) => {
      const d = data as { userId: string; status: "ONLINE" | "OFFLINE" }
      updateMemberStatus(d.userId, d.status)
    })
    const offRead = on("chat:read", (data) => {
      const d = data as { chatId: string; userId: string; lastReadAt: string }
      if (d.userId === user?.id) {
        resetUnread(d.chatId)
      } else {
        updateMemberLastRead(d.chatId, d.userId, d.lastReadAt)
      }
    })
    return () => {
      offNew()
      offDeleted()
      offDeletedHard()
      offTyping()
      offPresence()
      offRead()
    }
  }, [chatId, chats, activeChat, on, addMessage, removeMessage, redactMessage, touchChat, incrementUnread, updateMemberStatus, updateMemberLastRead, resetUnread, user?.id])

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

  const chatMessages = messages[activeChat.id] || []
  const name = getChatDisplayName(activeChat, user?.id)
  const username = getChatUsername(activeChat, user?.id)
  const other = activeChat.members.find((m) => m.user.id !== user?.id)?.user ?? activeChat.members[0]?.user
  const otherReadAt = activeChat.members.find((m) => m.user.id !== user?.id)?.lastReadAt
  const showRead = Boolean(other?.privacyReadReceipts !== false && otherReadAt)
  const isChannel = activeChat.type === "CHANNEL"
  const isGroupChat = activeChat.type !== "PRIVATE"
  const memberCount = activeChat.memberCount ?? activeChat.members.length
  const canPost = canPostToChat(activeChat, user?.id)

  async function handleDelete(msgId: string) {
    if (!activeChat || deletingIds.includes(msgId)) return
    const msg = chatMessages.find((message) => message.id === msgId)
    if (!msg || msg.senderId !== user?.id) return
    const hard = msg.content === null && !msg.mediaUrl
    if (hard && !confirm("Delete this message permanently?")) return
    setDeletingIds((prev) => [...prev, msgId])
    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(msgId)}?chatId=${encodeURIComponent(activeChat.id)}&hard=${hard}`,
        { method: "DELETE" },
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || "Could not delete message")
      }
      if (hard) removeMessage(activeChat.id, msgId)
      else redactMessage(activeChat.id, msgId)
    } catch (cause) {
      console.error(cause instanceof Error ? cause.message : "Could not delete message")
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== msgId))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function startSelection(index: number) {
    const msg = chatMessages[index]
    if (!msg) return
    lastSelectedIndexRef.current = index
    setSelectedIds([msg.id])
  }

  function extendSelection(index: number) {
    const anchor = lastSelectedIndexRef.current
    if (anchor === null) return
    const from = Math.min(anchor, index)
    const to = Math.max(anchor, index)
    setSelectedIds(chatMessages.slice(from, to + 1).map((message) => message.id))
  }

  function clearSelection() {
    setSelectedIds([])
    lastSelectedIndexRef.current = null
  }

  function deleteSelected() {
    if (!activeChat) return
    for (const id of selectedIds) {
      const msg = chatMessages.find((m) => m.id === id)
      if (!msg || msg.senderId !== user?.id) continue
      const hard = msg.content === null && !msg.mediaUrl
      if (hard && !confirm("Delete this message permanently?")) continue
      emit("message:delete", { chatId: activeChat.id, messageId: id, hard })
    }
    clearSelection()
  }

  function runSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    fetch(`/api/messages?chatId=${activeChat?.id}&limit=200`)
      .then((r) => r.json())
      .then(async (data) => {
        const msgs: Message[] = await decryptPrivateChatMessages(activeChat!, user?.id ?? "", data.messages || [])
        setSearchResults(msgs.filter((m) => m.content?.toLowerCase().includes(query.toLowerCase())))
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }

  async function submitReport() {
    if (!activeChat) return
    setReportSending(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeChat.id, reason: "Reported from chat header" }),
      })
      if (res.ok) setReportSent(true)
    } catch {}
    setReportSending(false)
  }

  function handleStartCall(mode: "voice" | "video") {
    if (!activeChat) return
    void beginCall({
      chatId: activeChat.id,
      mode,
      isGroup: activeChat.type !== "PRIVATE",
      chatName: name,
      peers: activeChat.members
        .filter((m) => m.user.id !== user?.id)
        .map((m) => ({
          id: m.user.id,
          username: m.user.username,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
        })),
    })
  }

  async function handleTogglePin(msg: Message) {
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !msg.isPinned }),
      })
      if (res.ok) {
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [msg.chatId]: (state.messages[msg.chatId] || []).map((m) =>
              m.id === msg.id ? { ...m, isPinned: !msg.isPinned } : m,
            ),
          },
        }))
      }
    } catch {}
  }

  return (
    <main className="flex flex-1 flex-col bg-background relative">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <ChatAvatar
            type={activeChat.type}
            name={name}
            avatarUrl={activeChat.avatarUrl}
            otherUser={other}
            size="md"
          />
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="text-primary">Typing...</span>
              ) : isGroupChat ? (
                <>
                  {username ? `@${username} • ` : ""}
                  {memberCount} {isChannel
                    ? memberCount === 1 ? "subscriber" : "subscribers"
                    : memberCount === 1 ? "member" : "members"}
                </>
              ) : username ? (
                <>
                  @{username}
                  {other?.status === "ONLINE" && <span className="text-success"> • Online</span>}
                </>
              ) : (
                other?.status === "ONLINE" && <span className="text-success">Online</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Channels are broadcast-only, so calling them makes no sense. */}
          {!isChannel && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleStartCall("voice")} aria-label="Start voice call">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleStartCall("video")} aria-label="Start video call">
                <Video className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSearchOpen(true); setSearchQuery(""); setSearchResults(null) }}
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => { setSearchOpen(true); setSearchQuery(""); setSearchResults(null) }}
              >
                <SearchIcon className="h-4 w-4" /> Search in conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleInfoPanel}>
                <PanelRight className="h-4 w-4" /> Conversation details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { setReportSent(false); setReportOpen(true) }}
              >
                <Flag className="h-4 w-4" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {chatMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            className="h-full"
            data={chatMessages}
            followOutput="smooth"
            initialTopMostItemIndex={chatMessages.length - 1}
            startReached={hasMore ? loadOlder : undefined}
            components={{
              Header: () => (
                <div className="h-4">
                  {hasMore && (
                    <div className="flex items-center justify-center py-1">
                      {loadingOlder ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Scroll up for older messages</span>
                      )}
                    </div>
                  )}
                </div>
              ),
              Footer: () => <div className="h-4" />,
            }}
            itemContent={(index) => {
              const msg = chatMessages[index]
              const isMine = msg.senderId === user?.id
              if (msg.type === "CALL") {
                return (
                  <CallMessage
                    msg={msg}
                    isMine={isMine}
                    onCallBack={isChannel ? undefined : (isVideo) => handleStartCall(isVideo ? "video" : "voice")}
                    onDelete={() => handleDelete(msg.id)}
                    isSelected={selectedIds.includes(msg.id)}
                    selectionMode={selectedIds.length > 0}
                    onStartSelection={() => startSelection(index)}
                    onExtendSelection={() => extendSelection(index)}
                    onToggleSelection={() => toggleSelect(msg.id)}
                  />
                )
              }
              return (
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  isRead={showRead && new Date(otherReadAt!) > new Date(msg.createdAt)}
                  onDelete={() => handleDelete(msg.id)}
                  onTogglePin={() => handleTogglePin(msg)}
                  isSelected={selectedIds.includes(msg.id)}
                  selectionMode={selectedIds.length > 0}
                  onStartSelection={() => startSelection(index)}
                  onExtendSelection={() => extendSelection(index)}
                  onToggleSelection={() => toggleSelect(msg.id)}
                />
              )
            }}
          />
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2">
          <p className="text-sm font-medium">
            {selectedIds.length} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {canPost ? (
        <MessageInput />
      ) : (
        <div className="border-t border-border px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Only admins can post in this channel.
          </p>
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Search in conversation</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearchOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <Input
            value={searchQuery}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Type to search messages..."
            autoFocus
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {searching && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
            {!searching && searchResults !== null && searchResults.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">No matches</p>
            )}
            {!searching &&
              searchResults?.map((m) => (
                <button
                  key={m.id}
                  className="block w-full rounded-xl bg-accent/50 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => setSearchOpen(false)}
                >
                  <span className="block truncate">{m.content || m.mediaUrl || "(media)"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTime(m.createdAt)} • {m.sender?.username ? `@${m.sender.username}` : "You"}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report {name}</DialogTitle>
          </DialogHeader>
          {reportSent ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Flag className="h-10 w-10 text-success" />
              <p className="font-medium">Report submitted</p>
              <p className="text-sm text-muted-foreground">Moderators will review it shortly.</p>
              <Button className="mt-2" onClick={() => setReportOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This conversation will be sent to moderators for review. Abusing reports may lead to restrictions.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button variant="destructive" disabled={reportSending} onClick={submitReport}>
                  {reportSending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
