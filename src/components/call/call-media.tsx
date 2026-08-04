"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Remote audio is played by dedicated hidden elements rather than by the video
 * tiles, so muting a tile's video never silences the peer.
 */
export function CallAudioSink({ streams }: { streams: { id: string; stream?: MediaStream }[] }) {
  return (
    <div className="hidden">
      {streams.map(({ id, stream }) => (stream ? <PeerAudio key={id} stream={stream} /> : null))}
    </div>
  )
}

function PeerAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || el.srcObject === stream) return
    el.srcObject = stream
    void el.play().catch(() => {})
  }, [stream])

  return <audio ref={ref} autoPlay playsInline />
}

interface CallVideoProps {
  stream: MediaStream | null | undefined
  /** Local previews must stay muted to avoid feedback. */
  muted?: boolean
  mirrored?: boolean
  className?: string
}

export function CallVideo({ stream, muted = false, mirrored = false, className }: CallVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!stream) {
      el.srcObject = null
      return
    }
    if (el.srcObject === stream) return
    el.srcObject = stream
    void el.play().catch(() => {})
  }, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]", className)}
    />
  )
}
