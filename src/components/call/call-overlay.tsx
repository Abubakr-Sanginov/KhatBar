"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Minimize2,
  Maximize2,
  MonitorUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { CallAudioSink, CallVideo } from "@/components/call/call-media"
import { ParticipantTile } from "@/components/call/participant-tile"
import { CallTimer } from "@/components/call/call-timer"
import { useCallStore } from "@/stores/call-store"
import { useCall } from "@/hooks/use-call"
import { cn } from "@/lib/utils"
import { displayName } from "@/lib/chat-utils"
import type { CallParticipant } from "@/types/call"

/** Column count that keeps tiles roughly square for a mesh call. */
function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1"
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2"
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3"
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
}

export function CallOverlay() {
  const phase = useCallStore((s) => s.phase)
  const mode = useCallStore((s) => s.mode)
  const isGroup = useCallStore((s) => s.isGroup)
  const chatName = useCallStore((s) => s.chatName)
  const participantsMap = useCallStore((s) => s.participants)
  const localStream = useCallStore((s) => s.localStream)
  const isMicOn = useCallStore((s) => s.isMicOn)
  const isCameraOn = useCallStore((s) => s.isCameraOn)
  const isScreenSharing = useCallStore((s) => s.isScreenSharing)
  const isMinimized = useCallStore((s) => s.isMinimized)
  const answeredAt = useCallStore((s) => s.answeredAt)
  const error = useCallStore((s) => s.error)
  const setMinimized = useCallStore((s) => s.setMinimized)

  const { acceptCall, declineCall, hangUp, toggleMic, toggleCamera, toggleScreenShare } = useCall()

  const participants = useMemo<CallParticipant[]>(() => Object.values(participantsMap), [participantsMap])
  const audioStreams = useMemo(
    () => participants.map((p) => ({ id: p.id, stream: p.stream })),
    [participants],
  )

  if (phase === "idle") return null

  const isVideo = mode === "video"
  const primary = participants[0]
  const title = isGroup ? chatName || "Group call" : displayName(primary)
  const statusText =
    phase === "incoming"
      ? `Incoming ${isVideo ? "video" : "voice"} call`
      : phase === "outgoing"
        ? "Calling..."
        : participants.every((p) => p.connection === "connected")
          ? null
          : "Connecting..."

  return (
    <>
      {/* Audio is mounted for every phase so it survives minimize/expand. */}
      <CallAudioSink streams={audioStreams} />

      <AnimatePresence>
        {phase === "incoming" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="flex w-[90vw] max-w-sm flex-col items-center gap-5 rounded-3xl border bg-card p-8 text-center shadow-premium-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              >
                <UserAvatar
                  user={{
                    avatarUrl: primary?.avatarUrl ?? null,
                    displayName: primary?.displayName ?? null,
                    username: primary?.username ?? null,
                    status: "ONLINE",
                  }}
                  size="xl"
                  showStatus={false}
                />
              </motion.div>
              <div>
                <p className="text-lg font-semibold">{displayName(primary)}</p>
                <p className="text-sm text-muted-foreground">
                  {isGroup && chatName ? `${chatName} • ` : ""}
                  {statusText}
                </p>
              </div>
              <div className="flex items-center gap-8">
                <button
                  onClick={declineCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white transition-transform hover:scale-105"
                  aria-label="Decline call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
                <motion.button
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  onClick={acceptCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground transition-colors hover:opacity-90"
                  aria-label="Accept call"
                >
                  {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "outgoing" || phase === "active") && isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-premium-lg sm:bottom-[88px]"
          >
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-success" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">
                {answeredAt ? <CallTimer answeredAt={answeredAt} /> : statusText}
              </p>
            </div>
            <Button variant={isMicOn ? "ghost" : "destructive"} size="icon" className="h-8 w-8" onClick={toggleMic}>
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMinimized(false)} aria-label="Expand call">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={hangUp} aria-label="End call">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "outgoing" || phase === "active") && !isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-0 z-[60] flex flex-col bg-immersive sm:bottom-[72px]"
          >
            <div className="shrink-0 flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{title}</p>
                <p className="flex items-center gap-2 text-xs text-white/60">
                  {isGroup && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {participants.length + 1}
                    </span>
                  )}
                  {answeredAt ? <CallTimer answeredAt={answeredAt} /> : statusText}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setMinimized(true)}
                aria-label="Minimize call"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>

            {error && <p className="px-5 pb-2 text-center text-xs text-immersive-warning">{error}</p>}

            <div className="relative min-h-0 flex-1 px-4 pb-28">
              {isScreenSharing && localStream ? (
                <div className="relative h-full overflow-hidden rounded-2xl border border-white/15 bg-black">
                  <CallVideo stream={localStream} muted className="object-contain" />
                  <span className="absolute left-3 top-3 rounded-full bg-success/90 px-3 py-1.5 text-xs font-medium text-success-foreground shadow">
                    You are sharing your screen
                  </span>
                </div>
              ) : (
                <div className={cn("grid h-full gap-3", gridClass(participants.length))}>
                  {participants.map((p) => (
                    <ParticipantTile key={p.id} participant={p} />
                  ))}
                </div>
              )}

              {/* Keep the camera preview above the desktop taskbar. Screen sharing
                  is rendered as the main tile above, so the presenter can verify it. */}
              {localStream && isCameraOn && !isScreenSharing && (
                <div className="absolute bottom-24 right-6 h-40 w-28 overflow-hidden rounded-2xl border-2 border-white/20 bg-black sm:h-48 sm:w-36">
                  <CallVideo stream={localStream} muted mirrored />
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 flex shrink-0 items-center justify-center gap-3 bg-gradient-to-t from-immersive via-immersive/95 to-transparent pb-4 pt-10">
              <Button
                variant={isMicOn ? "secondary" : "destructive"}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={toggleMic}
                aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isCameraOn ? "secondary" : "destructive"}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={toggleCamera}
                aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
              >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                className="hidden h-14 w-14 rounded-full sm:flex"
                onClick={toggleScreenShare}
                aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
              >
                <MonitorUp className="h-5 w-5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={hangUp}
                aria-label="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
