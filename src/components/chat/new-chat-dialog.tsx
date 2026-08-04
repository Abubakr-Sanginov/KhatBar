"use client"

import { useRef, useState } from "react"
import { AtSign, Loader2, MessageCircle, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useChatStore } from "@/stores"
import { cn } from "@/lib/utils"
import type { User } from "@/types"
import { displayName } from "@/lib/chat-utils"

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const { setChats } = useChatStore()
  const requestRef = useRef(0)

  function runSearch(q: string) {
    const id = ++requestRef.current
    setLoading(true)
    fetch(`/api/users?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (id === requestRef.current) setResults(data.users || [])
      })
      .catch(() => {
        if (id === requestRef.current) setResults([])
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false)
      })
  }

  function resetState() {
    requestRef.current++
    setQuery("")
    setResults([])
    setError("")
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) runSearch("")
    else resetState()
    onOpenChange(next)
  }

  async function createPrivateChat(user: User) {
    if (creating) return
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PRIVATE", memberIds: [user.id] }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create chat")
      }
      const data = await res.json()
      const chatsRes = await fetch("/api/chats")
      const chatsData = await chatsRes.json()
      if (chatsData.chats) setChats(chatsData.chats)
      onOpenChange(false)
      resetState()
      const created = useChatStore.getState().chats.find((c: { id: string }) => c.id === data.chat.id)
      if (created) useChatStore.getState().setActiveChat(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Search for a person to start a private conversation.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              runSearch(v)
            }}
            placeholder="Search by name or @username..."
            autoCapitalize="none"
            autoComplete="off"
            className="pl-9"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !query.trim() ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Start typing a name to find people
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No users found
            </p>
          ) : (
            results.map((user) => {
              const setupReady = Boolean(user.encryptionPublicKey)
              return (
                <button
                  key={user.id}
                  onClick={() => setupReady && createPrivateChat(user)}
                  disabled={!setupReady}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    setupReady ? "hover:bg-accent" : "cursor-not-allowed opacity-60",
                  )}
                >
                  <UserAvatar
                    user={{ avatarUrl: user.avatarUrl, displayName: displayName(user), username: user.username, status: user.status }}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName(user)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.username ? `@${user.username}` : "no username yet"}
                    </p>
                    {!setupReady && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Lock className="h-3 w-3" /> Must open KhatBar once to set up encryption
                      </p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
