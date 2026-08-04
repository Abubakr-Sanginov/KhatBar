"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"

interface PrivacyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrivacyDialog({ open, onOpenChange }: PrivacyDialogProps) {
  const { user, updateUser } = useAuth()
  const [showStatus, setShowStatus] = useState(user?.privacyShowStatus ?? true)
  const [showLastSeen, setShowLastSeen] = useState(user?.privacyShowLastSeen ?? true)
  const [readReceipts, setReadReceipts] = useState(user?.privacyReadReceipts ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(next: Partial<{ showStatus: boolean; showLastSeen: boolean; readReceipts: boolean }>) {
    setSaving(true)
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacyShowStatus: next.showStatus ?? showStatus,
          privacyShowLastSeen: next.showLastSeen ?? showLastSeen,
          privacyReadReceipts: next.readReceipts ?? readReceipts,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) updateUser(data.user)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {}
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy & Settings</DialogTitle>
          <DialogDescription>Control who can see your activity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Online status</p>
              <p className="text-xs text-muted-foreground">Show when you&apos;re online or offline to others</p>
            </div>
            <Switch
              checked={showStatus}
              disabled={saving}
              onCheckedChange={(v) => { setShowStatus(v); save({ showStatus: v }) }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Last seen</p>
              <p className="text-xs text-muted-foreground">Show your last seen time to others</p>
            </div>
            <Switch
              checked={showLastSeen}
              disabled={saving}
              onCheckedChange={(v) => { setShowLastSeen(v); save({ showLastSeen: v }) }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Read receipts</p>
              <p className="text-xs text-muted-foreground">Let others see when you&apos;ve read their messages</p>
            </div>
            <Switch
              checked={readReceipts}
              disabled={saving}
              onCheckedChange={(v) => { setReadReceipts(v); save({ readReceipts: v }) }}
            />
          </div>
          {saving && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
          {saved && <p className="text-center text-xs text-emerald-500">Settings saved</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
