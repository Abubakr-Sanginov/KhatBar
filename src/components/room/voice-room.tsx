"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useWebRTC } from "@/hooks/use-webrtc"

interface VoiceRoomProps {
  roomId: string
  onLeave: () => void
}

export function VoiceRoom({ roomId, onLeave }: VoiceRoomProps) {
  const [isMicOn, setIsMicOn] = useState(true)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const { localStream, isConnected, getLocalStream, createOffer, cleanup } = useWebRTC({
    onRemoteStream: setRemoteStream,
  })

  const joinRoom = useCallback(async () => {
    const stream = await getLocalStream({ audio: true, video: false })
    if (!stream) return
    await createOffer(stream)
  }, [getLocalStream, createOffer])

  useEffect(() => {
    joinRoom()
    return () => cleanup()
  }, [joinRoom, cleanup])

  const toggleMic = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
    setIsMicOn((m) => !m)
  }, [localStream])

  const handleLeave = useCallback(() => {
    cleanup()
    onLeave()
  }, [cleanup, onLeave])

  const MOCK_PARTICIPANTS = [
    { id: "1", name: "You", status: "ONLINE" as const },
    { id: "2", name: "Alex", status: "ONLINE" as const },
    { id: "3", name: "Sarah", status: "ONLINE" as const },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md rounded-3xl border bg-card shadow-premium-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Voice Room</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Connecting..."}</span>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        {MOCK_PARTICIPANTS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="relative">
              <UserAvatar user={{ avatarUrl: null, displayName: p.name, username: p.name, status: p.status }} size="lg" />
              {p.id === "2" && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background"
                />
              )}
            </div>
            <span className="text-xs font-medium">{p.name}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button
          variant={isMicOn ? "secondary" : "destructive"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleMic}
        >
          {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={handleLeave}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  )
}