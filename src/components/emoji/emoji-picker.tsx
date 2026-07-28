"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😂", "🥹", "😊", "😍", "🤩", "😎", "🤗", "😶", "😤", "😱", "🥳"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "💪", "✌️", "🤟", "👋", "🖐️", "🤙", "👌"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💝", "💖", "💗", "💘"],
  },
  {
    name: "Objects",
    emojis: ["🎉", "🎊", "✨", "🔥", "⭐", "💯", "🎯", "🎁", "💎", "🔮", "📎", "🖇️"],
  },
]

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EmojiPicker({ onEmojiSelect, open, onOpenChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState(0)

  const actualOpen = open ?? isOpen
  const setActualOpen = onOpenChange ?? setIsOpen

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActualOpen(!actualOpen)}>
        <Smile className="h-4 w-4 text-muted-foreground" />
      </Button>
      <AnimatePresence>
        {actualOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActualOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-12 left-0 z-50 w-72 rounded-2xl border bg-card shadow-premium-lg p-3"
            >
              <div className="flex gap-1 mb-3">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(i)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                      category === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onEmojiSelect(emoji); setActualOpen(false) }}
                    className="flex aspect-square items-center justify-center rounded-lg text-xl hover:bg-accent transition-colors"
                  >
                    {emoji}
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