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
import { useAuth } from "@/hooks/use-auth"
import { createPrivateGroupSetup } from "@/lib/e2ee"

interface NewGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewGroupDialog({ open, onOpenChange }: NewGroupDialogProps) {
  const [groupName, setGroupName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [groupUsername, setGroupUsername] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<User[]>([])
  const { setChats } = useChatStore()
  const { user: currentUser } = useAuth()
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
    setGroupName("")
    setIsPublic(false)
    setGroupUsername("")
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

  function toggleSelect(user: User) {
    setSelected((prev) => (prev.some((member) => member.id === user.id)
      ? prev.filter((member) => member.id !== user.id)
      : [...prev, user]))
  }

  async function createGroup() {
    if (creating || (!isPublic && selected.length === 0) || !currentUser) return
    if (isPublic && !groupUsername.trim()) {
      setError("Public groups need a link")
      return
    }
    setCreating(true)
    setError("")
    try {
      const body: Record<string, unknown> = {
        type: "GROUP",
        name: groupName.trim() || undefined,
        memberIds: selected.map((member) => member.id),
        isPublic,
        username: isPublic ? groupUsername.trim() : undefined,
      }
      if (!isPublic) {
        const encryption = await createPrivateGroupSetup(currentUser.id, selected)
        body.encryptionSalt = encryption.encryptionSalt
        body.memberKeyEnvelopes = encryption.memberKeyEnvelopes
      }
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create group")
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
          <DialogTitle>New Group</DialogTitle>
          <DialogDescription>Create a group chat with multiple people.</DialogDescription>
        </DialogHeader>

        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name (optional)"
          className="h-9"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={isPublic ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsPublic(true)}
          >
            <Globe className="h-4 w-4" />
            Public
          </Button>
          <Button
            type="button"
            variant={!isPublic ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsPublic(false)}
          >
            <Lock className="h-4 w-4" />
            Private
          </Button>
        </div>

        {isPublic ? (
          <>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={groupUsername}
                onChange={(e) => setGroupUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="group_link"
                autoCapitalize="none"
                autoComplete="off"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Public groups are found by @group_link and can be linked to a channel.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Private groups are end-to-end encrypted and joined by invite link only.
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
            placeholder="Search people to add..."
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
              const isSelected = selected.some((member) => member.id === user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleSelect(user)}
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
          <Button onClick={createGroup} disabled={creating || (!isPublic && selected.length === 0)}>
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Group ({selected.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
