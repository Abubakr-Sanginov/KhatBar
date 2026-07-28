"use client"

import { useCallback, useRef, useState, useEffect } from "react"

interface UseWebRTCOptions {
  onRemoteStream?: (stream: MediaStream) => void
}

export function useWebRTC({ onRemoteStream }: UseWebRTCOptions = {}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const config: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  }

  const getLocalStream = useCallback(async (constraints: MediaStreamConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch {
      return null
    }
  }, [])

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(config)
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.oniceconnectionstatechange = () => {
      setIsConnected(pc.iceConnectionState === "connected")
    }

    pc.ontrack = (event) => {
      onRemoteStream?.(event.streams[0])
    }

    pcRef.current = pc
    return pc
  }, [onRemoteStream])

  const createOffer = useCallback(async (stream: MediaStream) => {
    const pc = createPeerConnection(stream)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }, [createPeerConnection])

  const createAnswer = useCallback(async (stream: MediaStream, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(stream)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }, [createPeerConnection])

  const setRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
  }, [])

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current = null
    setLocalStream(null)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    localStream,
    isConnected,
    getLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    cleanup,
  }
}