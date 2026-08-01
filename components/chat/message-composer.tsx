'use client'

import { useState, useTransition } from 'react'
import { Gift, Mic, Send, Smile, Sticker } from 'lucide-react'

import type { ChatMessage } from '@/lib/messenger/types'

export function MessageComposer({
  conversationId,
  currentUserId,
  onOptimisticMessage,
}: {
  conversationId: string
  currentUserId: string
  onOptimisticMessage: (message: ChatMessage) => void
}) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) return

    const optimisticMessage: ChatMessage = {
      id: `optimistic_${Date.now()}`,
      conversationId,
      authorId: currentUserId,
      authorName: 'Abubakr',
      body: trimmed,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      optimistic: true,
      reactionSummary: [],
    }

    onOptimisticMessage(optimisticMessage)
    setBody('')

    startTransition(async () => {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, clientNonce: optimisticMessage.id }),
      })
    })
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-3 flex flex-wrap gap-2 text-slate-300">
        {[Smile, Gift, Sticker, Mic].map((Icon, index) => (
          <button key={index} className="rounded-full border border-slate-700 bg-slate-950 p-2 transition hover:border-emerald-500/50 hover:text-emerald-300" type="button">
            <Icon size={18} />
          </button>
        ))}
      </div>
      <div className="flex items-end gap-3">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a message, drop a GIF URL, or start a voice note flow…"
          className="min-h-[96px] flex-1 resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          type="button"
        >
          <Send size={16} />
          {isPending ? 'Sending' : 'Send'}
        </button>
      </div>
    </div>
  )
}
