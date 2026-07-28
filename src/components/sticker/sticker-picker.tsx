"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sticker as StickerIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

const STICKERS = [
  { id: "1", emoji: "🎉", label: "Party" },
  { id: "2", emoji: "🔥", label: "Fire" },
  { id: "3", emoji: "💀", label: "Skull" },
  { id: "4", emoji: "✨", label: "Sparkle" },
  { id: "5", emoji: "😭", label: "Cry" },
  { id: "6", emoji: "🚀", label: "Rocket" },
  { id: "7", emoji: "💯", label: "100" },
  { id: "8", emoji: "👀", label: "Eyes" },
]

interface StickerPickerProps {
  onStickerSelect: (sticker: string) => void
}

export function StickerPicker({ onStickerSelect }: StickerPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
        <StickerIcon className="h-4 w-4 text-muted-foreground" />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border bg-card shadow-premium-lg p-3"
            >
              <p className="text-xs font-medium text-muted-foreground mb-2">Stickers</p>
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onStickerSelect(s.emoji); setIsOpen(false) }}
                    className="flex aspect-square items-center justify-center rounded-xl bg-accent/50 text-2xl hover:bg-accent transition-colors"
                    title={s.label}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}