"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface GifItem {
  id: string
  url: string
  preview: string
}

interface GiphyPickerProps {
  onGifSelect: (url: string) => void
}

export function GiphyPicker({ onGifSelect }: GiphyPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const requestRef = useRef(0)

  function load(q: string) {
    const id = ++requestRef.current
    setLoading(true)
    setError("")
    const params = new URLSearchParams({ type: "gifs", offset: "0" })
    if (q.trim()) {
      params.set("q", q)
    } else {
      params.set("trending", "1")
    }
    fetch(`/api/giphy?${params}`)
      .then((r) => r.json())
      .then((data: { error?: string; items?: GifItem[] }) => {
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
          setError("Failed to load GIFs")
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
                  onChange={(e) => {
                    const v = e.target.value
                    setQuery(v)
                    if (v.trim()) load(v)
                  }}
                  className="pl-9"
                />
              </div>
              {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {loading && items.length === 0 && (
                  <div className="col-span-2 flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && items.length === 0 && !error && (
                  <p className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                    No GIFs found
                  </p>
                )}
                {items.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => { onGifSelect(gif.url); setIsOpen(false) }}
                    className="aspect-video rounded-xl overflow-hidden bg-muted hover:ring-2 ring-primary transition-all"
                  >
                    <img src={gif.preview} alt="" className="h-full w-full object-cover" loading="lazy" />
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
