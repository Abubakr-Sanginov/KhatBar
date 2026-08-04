"use client"

import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone, Trash2, Check } from "lucide-react"
import { formatDuration } from "@/components/call/call-timer"
import { formatMessageTime } from "@/lib/chat-utils"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"

interface CallMessageProps {
  msg: Message
  isMine: boolean
  onCallBack?: (isVideo: boolean) => void
  onDelete?: () => void
  isSelected?: boolean
  selectionMode?: boolean
  onStartSelection?: () => void
  onExtendSelection?: () => void
  onToggleSelection?: () => void
}

/**
 * Call log entry, rendered centered in the timeline like a system event
 * rather than as a chat bubble.
 */
export function CallMessage({
  msg,
  isMine,
  onCallBack,
  onDelete,
  isSelected = false,
  selectionMode = false,
  onStartSelection,
  onExtendSelection,
  onToggleSelection,
}: CallMessageProps) {
  const call = msg.call
  const isVideo = call?.isVideo ?? false
  const status = call?.status ?? "ENDED"
  const durationSec = call?.durationSec ?? 0
  const missed = status === "MISSED" || status === "DECLINED" || status === "CANCELED"

  const label = (() => {
    if (status === "MISSED") return isMine ? "No answer" : "Missed call"
    if (status === "DECLINED") return isMine ? "Call declined" : "Declined call"
    if (status === "CANCELED") return isMine ? "Canceled call" : "Missed call"
    return isMine ? "Outgoing call" : "Incoming call"
  })()

  const Icon = missed ? PhoneMissed : isMine ? PhoneOutgoing : PhoneIncoming

  return (
    <div
      className={cn("group flex justify-center px-4 py-1.5", selectionMode && "cursor-pointer")}
      onClick={() => selectionMode && onToggleSelection?.()}
      onDoubleClick={onStartSelection}
      onMouseEnter={() => selectionMode && onExtendSelection?.()}
    >
      <div
        className={cn(
          "relative flex items-center gap-2.5 rounded-full border bg-card px-3.5 py-2 text-xs transition-shadow",
          missed && "border-destructive/30",
          isSelected && "ring-2 ring-primary",
        )}
      >
        {isSelected && (
          <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-3 w-3" />
          </span>
        )}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", missed ? "text-destructive" : "text-muted-foreground")} />
        <span className="font-medium">
          {isVideo ? "Video" : "Voice"} · {label}
        </span>
        {durationSec > 0 && <span className="text-muted-foreground">{formatDuration(durationSec)}</span>}
        <span className="text-muted-foreground">{formatMessageTime(msg.createdAt)}</span>
        {onCallBack && (
          <button
            onClick={(event) => { event.stopPropagation(); onCallBack(isVideo) }}
            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-primary transition-colors hover:bg-accent"
            title={isVideo ? "Call back with video" : "Call back"}
            aria-label={isVideo ? "Call back with video" : "Call back"}
          >
            {isVideo ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
          </button>
        )}
        {isMine && onDelete && (
          <button
            onClick={(event) => { event.stopPropagation(); onDelete() }}
            className="absolute -right-9 top-1/2 hidden -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent group-hover:flex"
            title="Delete call entry"
            aria-label="Delete call entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
