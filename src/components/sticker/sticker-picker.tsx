"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sticker as StickerIcon, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StickerItem {
  id: string
  url: string
  preview: string
}

interface StickerPickerProps {
  onStickerSelect: (url: string) => void
}

export function StickerPicker({ onStickerSelect }: StickerPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<StickerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const requestRef = useRef(0)

  function load(q: string) {
    const id = ++requestRef.current
    setLoading(true)
    setError("")
    const params = new URLSearchParams({ type: "stickers", offset: "0" })
    if (q.trim()) {
      params.set("q", q)
    } else {
      params.set("trending", "1")
    }
    fetch(`/api/giphy?${params}`)
      .then((r) => r.json())
      .then((data: { error?: string; items?: StickerItem[] }) => {
        if (id !== requestRef.current) return
        if (data.error) {
          setError(data.error)
          setItems([])
        } else {
          setItems(data.items || [])
        }
      })
      .catch(() => {
        if (id === requestRef.current) {
          setError("Failed to load stickers")
          setItems([])
        }
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false)
      })
  }

  function handleOpen() {
    if (!isOpen) load(query)
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpen}>
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
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stickers..."
                  value={query}
                  onChange={(e) => {
                    const v = e.target.value
                    setQuery(v)
                    if (v.trim()) load(v)
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {loading && items.length === 0 && (
                  <div className="col-span-3 flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && items.length === 0 && !error && (
                  <p className="col-span-3 py-8 text-center text-xs text-muted-foreground">
                    No stickers found
                  </p>
                )}
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onStickerSelect(s.url); setIsOpen(false) }}
                    className="flex aspect-square items-center justify-center rounded-xl bg-accent/50 p-1 hover:bg-accent transition-colors"
                  >
                    <img src={s.preview} alt="" className="h-full w-full object-contain" loading="lazy" />
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
