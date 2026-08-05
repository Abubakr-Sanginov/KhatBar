"use client"

import { useState } from "react"
import { Loader2, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { InterfaceSelector } from "@/components/settings/interface-selector"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

interface PrivacyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const

export function PrivacyDialog({ open, onOpenChange }: PrivacyDialogProps) {
  const { user, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()
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
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Choose how KhatBar looks and who can see your activity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Interface</h3>
              <p className="text-xs text-muted-foreground">
                Applies to this device instantly. Both interfaces share the same features.
              </p>
            </div>
            <InterfaceSelector />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => {
                const Icon = mode.icon
                const isActive = theme === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTheme(mode.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      isActive ? "border-primary bg-accent/60" : "hover:bg-accent/40",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Privacy</h3>
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
            {saved && <p className="text-center text-xs text-success">Settings saved</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
