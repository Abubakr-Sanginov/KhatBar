"use client"

import { X, Bell, Search, Image, Paperclip, Pin, Shield, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useChatStore, useUIStore } from "@/stores"
import { cn } from "@/lib/utils"

export function InfoPanel() {
  const { activeChat } = useChatStore()
  const { isInfoPanelOpen, toggleInfoPanel } = useUIStore()

  return (
    <aside
      className={cn(
        "hidden w-80 shrink-0 border-l border-border bg-card xl:flex xl:flex-col",
      )}
    >
      {activeChat ? (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Details</h2>
            <Button variant="ghost" size="icon" onClick={toggleInfoPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <UserAvatar
                user={{ avatarUrl: null, displayName: activeChat.name!, username: activeChat.name!, status: "ONLINE" }}
                size="xl"
                showStatus
              />
              <h3 className="mt-3 text-lg font-semibold">{activeChat.name}</h3>
              <p className="text-sm text-emerald-500">Online</p>
            </div>

            <div className="space-y-1 px-3 pb-4">
              <p className="px-3 text-xs font-medium uppercase text-muted-foreground">Actions</p>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Bell className="h-4 w-4 text-muted-foreground" /> Mute notifications
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Search className="h-4 w-4 text-muted-foreground" /> Search in conversation
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Image className="h-4 w-4 text-muted-foreground" /> Media & files
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Pin className="h-4 w-4 text-muted-foreground" /> Pinned messages
              </button>
            </div>

            <div className="space-y-1 px-3 pb-4">
              <p className="px-3 text-xs font-medium uppercase text-muted-foreground">Privacy & support</p>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Shield className="h-4 w-4 text-muted-foreground" /> Encryption
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
                <Flag className="h-4 w-4" /> Report
              </button>
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">No conversation selected</p>
        </div>
      )}
    </aside>
  )
}