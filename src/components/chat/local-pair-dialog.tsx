import { useState } from "react"
import { Radio, Smartphone, Loader2, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLocalChatStore } from "@/stores/local-chat-store"
import { useLocalChat } from "@/hooks/use-local-chat"
import type { LocalPeer } from "@/lib/local-chat/types"

export function LocalPairDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { ready, peers, chats, deviceId } = useLocalChatStore()
  const { pair } = useLocalChat()
  const [code, setCode] = useState("")
  const [pairingPeer, setPairingPeer] = useState<LocalPeer | null>(null)
  const [pairingState, setPairingState] = useState<"idle" | "waiting" | "done">("idle")

  const pairedIds = new Set(chats.map((c) => c.peerId))
  const discoverable = Object.values(peers).filter((p) => p.id !== deviceId && !pairedIds.has(p.id))

  function pairPeer(peer: LocalPeer) {
    setPairingPeer(peer)
    setPairingState("waiting")
    setTimeout(async () => {
      await pair(peer)
      setPairingState("done")
    }, 400)
  }

  function openChange(next: boolean) {
    if (!next) {
      setCode("")
      setPairingState("idle")
      setPairingPeer(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Local chat
          </DialogTitle>
          <DialogDescription>
            Pair with a device on your local network. Messages never leave it.
          </DialogDescription>
        </DialogHeader>

        {!ready && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Starting local engine…
          </div>
        )}

        {ready && discoverable.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No nearby devices found. Make sure the other device has KhatBar open.
          </p>
        )}

        {ready && discoverable.length > 0 && (
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {discoverable.map((peer) => (
                <div
                  key={peer.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                >
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{peer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {peer.online ? "online" : "last seen recently"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pairingState === "waiting" || pairingState === "done"}
                    onClick={() => pairPeer(peer)}
                  >
                    {pairingState === "done" && pairingPeer?.id === peer.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : pairingState === "waiting" && pairingPeer?.id === peer.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Pair"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Pairing code (from other device)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button
            variant="secondary"
            disabled={code.length < 6}
            onClick={() => {
              const peer = Object.values(peers).find((p) => p.name.includes(code.slice(0, 4)))
              if (peer) pairPeer(peer)
            }}
          >
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
