"use client"

import { useEffect, useRef, useCallback } from "react"
import type { Socket } from "socket.io-client"
import { connectSocket, disconnectSocket } from "@/lib/socket-client"
import { useSocketStore } from "@/stores"

type Handler = (...args: unknown[]) => void

export function useSocket() {
  const token = useSocketStore((s) => s.token)
  const isConnected = useSocketStore((s) => s.isConnected)
  const setConnected = useSocketStore((s) => s.setConnected)
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map())
  const attachedRef = useRef<Map<string, Set<Handler>>>(new Map())

  useEffect(() => {
    if (!token) {
      disconnectSocket()
      socketRef.current = null
      attachedRef.current = new Map()
      setConnected(false)
      return
    }
    const socket = connectSocket(token)
    socketRef.current = socket
    attachedRef.current = new Map()
    setConnected(socket.connected)

    const attach = (event: string, handler: Handler) => {
      let attached = attachedRef.current.get(event)
      if (!attached) {
        attached = new Set()
        attachedRef.current.set(event, attached)
      }
      if (!attached.has(handler)) {
        attached.add(handler)
        socket.on(event, handler)
      }
    }

    const attachAll = () => {
      for (const [event, handlers] of handlersRef.current) {
        for (const h of handlers) attach(event, h)
      }
    }
    attachAll()

    const onConnect = () => {
      setConnected(true)
      attachAll()
    }
    const onDisconnect = () => setConnected(false)
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [token, setConnected])

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, handler: Handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set())
    handlersRef.current.get(event)!.add(handler)
    const socket = socketRef.current
    if (socket && socket.connected) {
      let attached = attachedRef.current.get(event)
      if (!attached) {
        attached = new Set()
        attachedRef.current.set(event, attached)
      }
      if (!attached.has(handler)) {
        attached.add(handler)
        socket.on(event, handler)
      }
    }
    return () => {
      handlersRef.current.get(event)?.delete(handler)
      attachedRef.current.get(event)?.delete(handler)
      socketRef.current?.off(event, handler)
    }
  }, [])

  return { isConnected, emit, on }
}
