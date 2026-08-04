"use client"

import { MicOff, Loader2, WifiOff } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { CallVideo } from "@/components/call/call-media"
import { cn } from "@/lib/utils"
import { displayName } from "@/lib/chat-utils"
import type { CallParticipant } from "@/types/call"

interface ParticipantTileProps {
  participant: CallParticipant
  className?: string
}

export function ParticipantTile({ participant, className }: ParticipantTileProps) {
  const name = displayName(participant)
  const hasVideo = !participant.isCameraOff && Boolean(participant.stream)

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/5",
        className,
      )}
    >
      {hasVideo ? (
        <CallVideo stream={participant.stream} muted />
      ) : (
        <div className="flex flex-col items-center gap-2 p-4">
          <UserAvatar
            user={{
              avatarUrl: participant.avatarUrl,
              displayName: participant.displayName,
              username: participant.username,
              status: "ONLINE",
            }}
            size="xl"
            showStatus={false}
          />
          <span className="max-w-full truncate text-sm font-medium text-white/90">{name}</span>
          {participant.isRinging && (
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              <Loader2 className="h-3 w-3 animate-spin" /> Ringing...
            </span>
          )}
          {!participant.isRinging && participant.connection === "connecting" && (
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
            </span>
          )}
        </div>
      )}

      {hasVideo && (
        <span className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          {name}
        </span>
      )}

      <div className="absolute right-2 top-2 flex items-center gap-1">
        {participant.connection === "failed" && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90" title="Connection lost">
            <WifiOff className="h-3 w-3 text-white" />
          </span>
        )}
        {participant.isMuted && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60" title="Muted">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
      </div>
    </div>
  )
}
