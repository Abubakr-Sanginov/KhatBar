"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MOCK_GIFS = [
  { id: "1", url: "https://media.tenor.com/abc123/giphy.gif", preview: "https://media.tenor.com/abc123/preview.gif" },
  { id: "2", url: "https://media.tenor.com/def456/giphy.gif", preview: "https://media.tenor.com/def456/preview.gif" },
  { id: "3", url: "https://media.tenor.com/ghi789/giphy.gif", preview: "https://media.tenor.com/ghi789/preview.gif" },
]

interface GiphyPickerProps {
  onGifSelect: (url: string) => void
}

export function GiphyPicker({ onGifSelect }: GiphyPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-12 left-0 z-50 w-80 rounded-2xl border bg-card shadow-premium-lg p-3"
            >
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search GIFs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {MOCK_GIFS.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => { onGifSelect(gif.url); setIsOpen(false) }}
                    className="aspect-video rounded-xl overflow-hidden bg-muted hover:ring-2 ring-primary transition-all"
                  >
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">GIF</span>
                    </div>
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