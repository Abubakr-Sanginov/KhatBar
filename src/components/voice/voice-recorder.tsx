"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Square, Trash2, Send, Play, Pause, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VoiceRecorderProps {
  onSendAudio: (blob: Blob, duration: number) => Promise<void>
}

const WAVE_HEIGHTS = Array.from({ length: 20 }, () => Math.floor(Math.random() * 24) + 4)

export function VoiceRecorder({ onSendAudio }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= 60) {
            stopRecording()
            return 60
          }
          return d + 1
        })
      }, 1000)
    } catch {
      // permission denied
    }
  }, [stopRecording])

  const cancelRecording = useCallback(() => {
    setAudioBlob(null)
    setDuration(0)
  }, [])

  const togglePlayback = useCallback(() => {
    if (!audioBlob) return
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url) }
      audioRef.current = audio
      audio.play()
      setIsPlaying(true)
    }
  }, [audioBlob, isPlaying])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  const sendRecording = useCallback(async () => {
    if (!audioBlob) return
    setIsSending(true)
    await onSendAudio(audioBlob, duration)
    setIsSending(false)
    setAudioBlob(null)
    setDuration(0)
  }, [audioBlob, duration, onSendAudio])

  if (audioBlob) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 rounded-2xl bg-card border px-3 py-2"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayback}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" style={{ width: isPlaying ? "60%" : "100%" }} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={cancelRecording} disabled={isSending}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8 rounded-xl" onClick={sendRecording} disabled={isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {isRecording ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-2"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-3 w-3 rounded-full bg-destructive"
          />
          <span className="text-sm font-medium tabular-nums text-destructive">{formatTime(duration)}</span>
          <div className="flex-1 flex items-center gap-0.5">
            {WAVE_HEIGHTS.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, h, 4] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                className="w-1 rounded-full bg-destructive/60"
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={stopRecording}>
            <Square className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startRecording}>
          <Mic className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </AnimatePresence>
  )
}