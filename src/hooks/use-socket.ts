"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, type Socket } from "socket.io-client"

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
      transports: ["websocket"],
      autoConnect: false,
    })
    socketRef.current = socket
    return () => { socket.disconnect() }
  }, [])

  const connect = useCallback((token: string) => {
    const socket = socketRef.current
    if (!socket) return
    socket.auth = { token }
    socket.connect()
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler)
    return () => { socketRef.current?.off(event, handler) }
  }, [])

  return { socket: socketRef, connect, disconnect, emit, on }
}