"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores"

/** Landing page for invite links: joins the chat, then opens it. */
export default function JoinPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const code = params?.code
    if (!code) return
    let cancelled = false

    async function join() {
      try {
        const res = await fetch("/api/chats/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: code }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 401) {
          // Not signed in yet: come back here once they are.
          router.replace(`/login?next=${encodeURIComponent(`/join/${code}`)}`)
          return
        }
        if (!res.ok) {
          setError(data.error || "This invite link is not valid")
          return
        }
        // Refresh the list so the newly joined chat can be selected.
        const listRes = await fetch("/api/chats")
        const listData = await listRes.json()
        if (cancelled) return
        if (listData.chats) {
          useChatStore.getState().setChats(listData.chats)
          const joined = listData.chats.find((c: { id: string }) => c.id === data.chat?.id)
          if (joined) useChatStore.getState().setActiveChat(joined)
        }
        router.replace("/")
      } catch {
        if (!cancelled) setError("Something went wrong")
      }
    }

    void join()
    return () => {
      cancelled = true
    }
  }, [params?.code, router])

  return (
    <main className="flex h-full items-center justify-center bg-background p-6">
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium">{error}</p>
          <Button onClick={() => router.replace("/")}>Back to chats</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Joining...</p>
        </div>
      )}
    </main>
  )
}
