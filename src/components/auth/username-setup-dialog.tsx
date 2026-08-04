"use client"

import { useState } from "react"
import { AtSign } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export function UsernameSetupDialog() {
  const { user, isLoading, setUsername } = useAuth()
  const [username, setValue] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const needsUsername = !!user && !user.username

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await setUsername(username)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !needsUsername) return null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Choose your username</DialogTitle>
          <DialogDescription>
            Pick a unique username so others can find and message you by @username.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Abubakr"
              autoCapitalize="none"
              autoComplete="off"
              className="pl-9"
              disabled={saving}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving || !username.trim()}>
            {saving ? "Saving..." : "Save username"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
