"use client"

import { useRef, useState } from "react"
import { AtSign, Loader2, Check, Globe, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useChatStore } from "@/stores"
import { cn } from "@/lib/utils"
import type { User } from "@/types"
import { displayName } from "@/lib/chat-utils"

interface NewChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewChannelDialog({ open, onOpenChange }: NewChannelDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [channelUsername, setChannelUsername] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<string[]>([])
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
    setName("")
    setDescription("")
    setIsPublic(true)
    setChannelUsername("")
    setQuery("")
    setResults([])
    setError("")
    setLoading(false)
    setSelected([])
  }

  function handleOpenChange(next: boolean) {
    if (next) runSearch("")
    else resetState()
    onOpenChange(next)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function createChannel() {
    if (creating || !name.trim()) return
    if (isPublic && !channelUsername.trim()) {
      setError("Public channels need a link")
      return
    }
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CHANNEL",
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          username: isPublic ? channelUsername.trim() : undefined,
          memberIds: selected,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create channel")
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
          <DialogTitle>New Channel</DialogTitle>
          <DialogDescription>
            Channels broadcast to an unlimited audience. Only admins can post.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name (required)"
          className="h-9"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="flex w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isPublic ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsPublic(true)}
          >
            <Globe className="h-4 w-4" />
            Public
          </Button>
          <Button
            variant={!isPublic ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsPublic(false)}
          >
            <Lock className="h-4 w-4" />
            Private
          </Button>
        </div>

        {isPublic ? (
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={channelUsername}
              onChange={(e) => setChannelUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="channel_link"
              autoCapitalize="none"
              autoComplete="off"
              className="pl-9"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Private channels are joined by invite link only. You can share it after creating.
          </p>
        )}

        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              runSearch(v)
            }}
            placeholder="Add subscribers (optional)..."
            autoCapitalize="none"
            autoComplete="off"
            className="pl-9"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="max-h-48 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !query.trim() ? null : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No users found</p>
          ) : (
            results.map((user) => {
              const isSelected = selected.includes(user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleSelect(user.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
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
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={createChannel} disabled={creating || !name.trim()}>
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Channel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
