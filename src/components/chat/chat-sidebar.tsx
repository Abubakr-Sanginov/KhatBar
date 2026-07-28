"use client"

export function ChatSidebar() {
  return (
    <aside className="hidden w-80 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Chats</p>
      </div>
    </aside>
  )
}