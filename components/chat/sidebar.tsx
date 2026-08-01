import type { SidebarConversation } from '@/lib/messenger/types'
import { cn, formatRelativeTime } from '@/lib/utils'

export function Sidebar({ items, activeId }: { items: SidebarConversation[]; activeId: string }) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/80">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">KhatBar</div>
        <h1 className="mt-2 text-xl font-semibold text-white">Messages</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              'mb-2 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition',
              item.id === activeId ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-transparent bg-slate-950/60 hover:border-slate-800',
            )}
            type="button"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200">
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium text-white">{item.name}</div>
                <div className="text-xs text-slate-400">{formatRelativeTime(item.lastMessageAt)}</div>
              </div>
              <div className="mt-1 truncate text-sm text-slate-400">{item.lastMessagePreview}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>{item.type}</span>
                <span>•</span>
                <span>{item.membersCount} members</span>
                {item.unreadCount > 0 ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{item.unreadCount} new</span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
