"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { MeshConnection, type SignalPayload } from "@/lib/webrtc"
import { useCallStore, isCallBusy } from "@/stores/call-store"
import { useSocket } from "@/hooks/use-socket"
import { useAuth } from "@/hooks/use-auth"
import {
  playCallConnected,
  playCallEnded,
  startIncomingRing,
  startOutgoingRing,
  stopRing,
} from "@/lib/call-sounds"
import type { CallEndReason, CallMode, CallPeerInfo, IncomingCallInfo } from "@/types/call"

/** Enables a track. Kept at module scope so it is plainly not React state. */
function enableTrack(track: MediaStreamTrack) {
  track.enabled = true
}

interface CallContextValue {
  startCall: (args: {
    chatId: string
    chatName: string
    mode: CallMode
    isGroup: boolean
    peers: CallPeerInfo[]
  }) => Promise<void>
  acceptCall: () => Promise<void>
  declineCall: () => void
  hangUp: () => void
  toggleMic: () => void
  toggleCamera: () => Promise<void>
  toggleScreenShare: () => Promise<void>
}

const CallContext = createContext<CallContextValue | null>(null)

export function CallProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useSocket()
  const { user } = useAuth()
  const selfId = user?.id

  const meshRef = useRef<MeshConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Kept in a ref so socket handlers never read a stale callId. */
  const callIdRef = useRef<string | null>(null)
  const emitRef = useRef(emit)

  useEffect(() => {
    emitRef.current = emit
  }, [emit])

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }, [])

  const teardown = useCallback(
    (reason: CallEndReason | null) => {
      clearRingTimeout()
      stopRing()
      meshRef.current?.close()
      meshRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      cameraTrackRef.current = null
      callIdRef.current = null
      useCallStore.getState().reset(reason)
    },
    [clearRingTimeout],
  )

  const acquireStream = useCallback(async (mode: CallMode): Promise<MediaStream | null> => {
    const store = useCallStore.getState()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      })
      streamRef.current = stream
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null
      store.setLocalStream(stream)
      store.setMicOn(true)
      store.setCameraOn(mode === "video" && Boolean(cameraTrackRef.current))
      return stream
    } catch {
      // Audio-only fallback keeps a video call usable without a camera.
      if (mode === "video") {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = audioOnly
          cameraTrackRef.current = null
          store.setLocalStream(audioOnly)
          store.setMicOn(true)
          store.setCameraOn(false)
          store.setError("Camera unavailable — joined with audio only")
          return audioOnly
        } catch {
          /* fall through */
        }
      }
      store.setError("Microphone access denied")
      return null
    }
  }, [])

  const ensureMesh = useCallback(() => {
    if (!selfId) return null
    if (meshRef.current) return meshRef.current
    const mesh = new MeshConnection(selfId, {
      sendSignal: (peerId, payload) => {
        const callId = callIdRef.current
        if (!callId) return
        emitRef.current("call:signal", { callId, targetId: peerId, payload })
      },
      onRemoteStream: (peerId, stream) => {
        const hasVideo = stream.getVideoTracks().some((t) => t.readyState === "live")
        useCallStore.getState().patchParticipant(peerId, {
          stream,
          isRinging: false,
          // Participants start with isCameraOff: true; a live video track
          // means the peer's camera is on and the tile must show it.
          isCameraOff: !hasVideo,
        })
      },
      onPeerStateChange: (peerId, state) => {
        const store = useCallStore.getState()
        if (state === "connected") {
          store.patchParticipant(peerId, { connection: "connected", isRinging: false })
          if (store.phase !== "active") {
            store.markActive()
            playCallConnected()
          }
        } else if (state === "failed") {
          store.patchParticipant(peerId, { connection: "failed" })
        }
      },
    })
    meshRef.current = mesh
    return mesh
  }, [selfId])

  const startCall = useCallback(
    async ({
      chatId,
      chatName,
      mode,
      isGroup,
      peers,
    }: {
      chatId: string
      chatName: string
      mode: CallMode
      isGroup: boolean
      peers: CallPeerInfo[]
    }) => {
      if (isCallBusy() || !selfId || peers.length === 0) return
      const callId = `${chatId}:${selfId}:${Date.now()}`
      callIdRef.current = callId
      useCallStore.getState().startOutgoing({ callId, chatId, chatName, mode, isGroup, invitees: peers })

      const stream = await acquireStream(mode)
      if (!stream) {
        teardown("media-denied")
        return
      }
      if (callIdRef.current !== callId) return

      const mesh = ensureMesh()
      mesh?.setLocalStream(stream)
      emitRef.current("call:invite", { callId, chatId, mode, targetIds: peers.map((p) => p.id) })
      startOutgoingRing()

      // A call remains available until a participant explicitly declines or
      // hangs up. In particular, screen sharing must not make it expire.
    },
    [selfId, acquireStream, ensureMesh, teardown],
  )

  const acceptCall = useCallback(async () => {
    const store = useCallStore.getState()
    const incoming = store.incoming
    if (!incoming || store.phase !== "incoming") return
    stopRing()
    callIdRef.current = incoming.callId

    const stream = await acquireStream(incoming.mode)
    if (!stream) {
      emitRef.current("call:decline", { callId: incoming.callId, chatId: incoming.chatId, reason: "media-denied" })
      teardown("media-denied")
      return
    }
    if (callIdRef.current !== incoming.callId) return

    const mesh = ensureMesh()
    mesh?.setLocalStream(stream)
    // The accepting side is impolite-agnostic: the caller creates the offer.
    mesh?.addPeer(incoming.caller.id, false)
    useCallStore.getState().markActive()
    emitRef.current("call:accept", { callId: incoming.callId, chatId: incoming.chatId })
  }, [acquireStream, ensureMesh, teardown])

  const declineCall = useCallback(() => {
    const { incoming } = useCallStore.getState()
    if (incoming) {
      emitRef.current("call:decline", { callId: incoming.callId, chatId: incoming.chatId, reason: "declined" })
    }
    stopRing()
    teardown("declined")
  }, [teardown])

  const hangUp = useCallback(() => {
    const { callId, chatId, phase } = useCallStore.getState()
    if (callId && chatId) {
      const reason = phase === "outgoing" ? "canceled" : "hangup"
      emitRef.current("call:end", { callId, chatId, reason })
    }
    playCallEnded()
    teardown("hangup")
  }, [teardown])

  const toggleMic = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const store = useCallStore.getState()
    const next = !store.isMicOn
    stream.getAudioTracks().forEach((t) => {
      t.enabled = next
    })
    store.setMicOn(next)
    const { callId } = store
    if (callId) emitRef.current("call:media-state", { callId, isMuted: !next, isCameraOff: !store.isCameraOn })
  }, [])

  const publishTrack = useCallback((track: MediaStreamTrack | null) => {
    const mesh = meshRef.current
    const stream = streamRef.current
    if (!mesh || !stream) return
    if (track) {
      const existing = stream.getVideoTracks()[0]
      if (existing && existing !== track) {
        stream.removeTrack(existing)
        existing.stop()
      }
      if (!stream.getVideoTracks().includes(track)) stream.addTrack(track)
    }
    mesh.setLocalStream(stream)
  }, [])

  const toggleCamera = useCallback(async () => {
    const store = useCallStore.getState()
    const stream = streamRef.current
    if (!stream) return
    const next = !store.isCameraOn

    if (!next) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = false
      })
      store.setCameraOn(false)
    } else {
      const existing = cameraTrackRef.current
      let track: MediaStreamTrack | null = existing
      if (!existing || existing.readyState === "ended") {
        try {
          const fresh = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          track = fresh.getVideoTracks()[0] ?? null
          cameraTrackRef.current = track
        } catch {
          store.setError("Camera unavailable")
          return
        }
      }
      if (!track) return
      enableTrack(track)
      publishTrack(track)
      store.setCameraOn(true)
      store.setScreenSharing(false)
    }

    const { callId } = useCallStore.getState()
    if (callId) {
      emitRef.current("call:media-state", {
        callId,
        isMuted: !useCallStore.getState().isMicOn,
        isCameraOff: !next,
      })
    }
  }, [publishTrack])

  const toggleScreenShare = useCallback(async () => {
    const store = useCallStore.getState()
    const emitScreenMediaState = () => {
      const { callId } = useCallStore.getState()
      if (callId) {
        emitRef.current("call:media-state", {
          callId,
          isMuted: !useCallStore.getState().isMicOn,
          isCameraOff: !useCallStore.getState().isCameraOn,
        })
      }
    }
    if (!streamRef.current) return
      if (store.isScreenSharing) {
        const camera = cameraTrackRef.current
        if (camera && camera.readyState === "live") {
          enableTrack(camera)
          publishTrack(camera)
          store.setCameraOn(true)
        } else {
          streamRef.current.getVideoTracks().forEach((t) => {
            streamRef.current?.removeTrack(t)
            t.stop()
          })
          store.setCameraOn(false)
        }
        store.setScreenSharing(false)
        emitScreenMediaState()
        return
      }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = display.getVideoTracks()[0]
      if (!track) return
      // Cleanup when the browser ends the share (its own "Stop sharing" button).
      track.onended = () => {
        const s = useCallStore.getState()
        if (!s.isScreenSharing) return
        const camera = cameraTrackRef.current
        if (camera && camera.readyState === "live") {
          enableTrack(camera)
          publishTrack(camera)
          s.setCameraOn(true)
        } else {
          streamRef.current?.getVideoTracks().forEach((t) => {
            streamRef.current?.removeTrack(t)
            t.stop()
          })
          s.setCameraOn(false)
        }
        s.setScreenSharing(false)
      }
      publishTrack(track)
      store.setScreenSharing(true)
      store.setCameraOn(true)
      emitScreenMediaState()
    } catch {
      /* user dismissed the picker */
    }
  }, [publishTrack])

  // Socket wiring. Handlers read live state through the store, so this
  // subscribes once per connection instead of on every call state change.
  useEffect(() => {
    if (!selfId) return

    const offInvite = on("call:invite", (data) => {
      const d = data as {
        callId: string
        chatId: string
        chatName: string
        mode: CallMode
        isGroup: boolean
        caller: CallPeerInfo
      }
      if (d.caller.id === selfId) return
      if (isCallBusy()) {
        emitRef.current("call:busy", { callId: d.callId, chatId: d.chatId, callerId: d.caller.id })
        return
      }
      const info: IncomingCallInfo = {
        callId: d.callId,
        chatId: d.chatId,
        chatName: d.chatName,
        mode: d.mode,
        isGroup: d.isGroup,
        caller: d.caller,
      }
      useCallStore.getState().receiveIncoming(info)
      startIncomingRing()
      // Do not auto-decline incoming calls: the caller or recipient decides
      // when to end it.
    })

    const offAccepted = on("call:accepted", (data) => {
      const d = data as { callId: string; peer: CallPeerInfo }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      clearRingTimeout()
      stopRing()
      store.upsertParticipant(d.peer, { isRinging: false })
      store.markActive()
      // The inviter drives the offer for a deterministic first negotiation.
      ensureMesh()?.addPeer(d.peer.id, true)
    })

    const offDeclined = on("call:declined", (data) => {
      const d = data as { callId: string; peerId: string; reason?: CallEndReason }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      store.removeParticipant(d.peerId)
      meshRef.current?.removePeer(d.peerId)
      const remaining = Object.keys(useCallStore.getState().participants).length
      if (remaining === 0) {
        playCallEnded()
        teardown(d.reason === "busy" ? "busy" : "declined")
      }
    })

    const offPeerJoined = on("call:peer-joined", (data) => {
      const d = data as { callId: string; peer: CallPeerInfo; initiator: boolean }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      store.upsertParticipant(d.peer, { isRinging: false })
      store.markActive()
      ensureMesh()?.addPeer(d.peer.id, d.initiator)
    })

    const offPeerRinging = on("call:peer-ringing", (data) => {
      const d = data as { callId: string; peer: CallPeerInfo }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      store.upsertParticipant(d.peer, { isRinging: true })
    })

    const offPeerLeft = on("call:peer-left", (data) => {
      const d = data as { callId: string; peerId: string }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      store.removeParticipant(d.peerId)
      meshRef.current?.removePeer(d.peerId)
      if (Object.keys(useCallStore.getState().participants).length === 0) {
        playCallEnded()
        teardown("hangup")
      }
    })

    const offEnded = on("call:ended", (data) => {
      const d = data as { callId: string; reason?: CallEndReason }
      if (useCallStore.getState().callId !== d.callId) return
      playCallEnded()
      teardown(d.reason ?? "hangup")
    })

    const offSignal = on("call:signal", (data) => {
      const d = data as { callId: string; fromId: string; payload: SignalPayload }
      if (useCallStore.getState().callId !== d.callId) return
      void ensureMesh()?.handleSignal(d.fromId, d.payload)
    })

    const offMediaState = on("call:media-state", (data) => {
      const d = data as { callId: string; peerId: string; isMuted: boolean; isCameraOff: boolean }
      const store = useCallStore.getState()
      if (store.callId !== d.callId) return
      store.patchParticipant(d.peerId, { isMuted: d.isMuted, isCameraOff: d.isCameraOff })
    })

    return () => {
      offInvite()
      offAccepted()
      offDeclined()
      offPeerJoined()
      offPeerRinging()
      offPeerLeft()
      offEnded()
      offSignal()
      offMediaState()
    }
  }, [selfId, on, ensureMesh, teardown, clearRingTimeout])

  // Hang up when the tab closes so peers are not left ringing.
  useEffect(() => {
    const handler = () => {
      const { callId, chatId } = useCallStore.getState()
      if (callId && chatId) emitRef.current("call:end", { callId, chatId, reason: "hangup" })
    }
    window.addEventListener("pagehide", handler)
    return () => window.removeEventListener("pagehide", handler)
  }, [])

  useEffect(() => () => teardown(null), [teardown])

  const value = useMemo<CallContextValue>(
    () => ({ startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCamera, toggleScreenShare }),
    [startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCamera, toggleScreenShare],
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used within CallProvider")
  return ctx
}
