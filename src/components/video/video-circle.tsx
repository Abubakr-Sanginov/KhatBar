"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_DURATION = 15

export function VideoCircle() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      chunksRef.current = []

      if (videoRef.current) videoRef.current.srcObject = stream

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" })
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        setRecordedBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setTimeLeft(MAX_DURATION)

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { stopRecording(); return 0 }
          return t - 1
        })
      }, 1000)
    } catch {
      // permission denied
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const cancelRecording = useCallback(() => {
    setRecordedBlob(null)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  return (
    <AnimatePresence>
      {recordedBlob ? (
        isExpanded ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              className="relative max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={URL.createObjectURL(recordedBlob)}
                className="w-full rounded-3xl"
                autoPlay
                loop
                muted
                playsInline
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-black/40 text-white"
                onClick={() => { setIsExpanded(false); cancelRecording() }}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square w-20 rounded-full overflow-hidden cursor-pointer ring-2 ring-primary/50"
            onClick={() => setIsExpanded(true)}
          >
            <video
              src={URL.createObjectURL(recordedBlob)}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </motion.div>
        )
      ) : isRecording ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-square w-40 rounded-full overflow-hidden border-4 border-destructive/50"
        >
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="text-white text-lg font-bold">{timeLeft}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-destructive text-white"
            onClick={stopRecording}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={startRecording}
        >
          <Camera className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </AnimatePresence>
  )
}