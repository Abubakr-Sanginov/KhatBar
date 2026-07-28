"use client"

export function MessagePanel() {
  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome to KhatBar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    </main>
  )
}