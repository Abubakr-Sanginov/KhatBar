'use client'

import { useMemo, useState } from 'react'

import type { ChatMessage } from '@/lib/messenger/types'
import { cn, formatRelativeTime } from '@/lib/utils'

const ROW_HEIGHT = 92
const OVERSCAN = 8

export function MessageList({ currentUserId, messages }: { currentUserId: string; messages: ChatMessage[] }) {
  const [scrollTop, setScrollTop] = useState(0)
  const viewportHeight = 560

  const ordered = useMemo(() => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [messages])
  const totalHeight = ordered.length * ROW_HEIGHT
  const startIndex = Math.max(Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN, 0)
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
  const slice = ordered.slice(startIndex, startIndex + visibleCount)

  return (
    <div
      className="relative h-[560px] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950/70"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
          {slice.map((message) => {
            const mine = message.authorId === currentUserId
            return (
              <div key={message.id} className="px-4 py-3">
                <div className={cn('flex gap-3', mine && 'justify-end')}>
                  {!mine ? (
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                      {message.authorName.slice(0, 2).toUpperCase()}
                    </div>
                  ) : null}
                  <div className={cn('max-w-[78%] rounded-3xl border px-4 py-3 shadow-soft', mine ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900')}>
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-200">{message.authorName}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(message.createdAt)}</span>
                      {message.optimistic ? <span className="text-emerald-300">Sending…</span> : null}
                    </div>
                    {message.type === 'GIF' && message.body ? (
                      <img alt="GIF message" src={message.body} className="h-48 w-full rounded-2xl object-cover" />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{message.body}</p>
                    )}
                    {message.reactionSummary?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.reactionSummary.map((reaction) => (
                          <span key={`${message.id}-${reaction.emoji}`} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                            {reaction.emoji} {reaction.count}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
