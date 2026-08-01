'use client'

import { useCallback, useMemo, useState } from 'react'

export function useVoiceRoom(roomId: string) {
  const [isJoining, setIsJoining] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const join = useCallback(async () => {
    setIsJoining(true)
    await new Promise((resolve) => setTimeout(resolve, 350))
    setIsConnected(true)
    setIsJoining(false)
  }, [])

  const leave = useCallback(() => {
    setIsConnected(false)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((value) => !value)
  }, [])

  return useMemo(
    () => ({ roomId, isJoining, isConnected, isMuted, join, leave, toggleMute }),
    [roomId, isJoining, isConnected, isMuted, join, leave, toggleMute],
  )
}
