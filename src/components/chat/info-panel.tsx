"use client"

export function InfoPanel() {
  return (
    <aside className="hidden w-80 shrink-0 border-l border-border bg-card xl:flex xl:flex-col">
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Details</p>
      </div>
    </aside>
  )
}