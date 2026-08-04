import type { Chat, User } from "@/types"

export function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24 && now.getDate() === date.getDate()) return `${hours}h`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function getChatDisplayUser(chat: Chat, selfId: string | undefined): User | null {
  if (chat.type === "PRIVATE") {
    return chat.members.find((m) => m.user.id !== selfId)?.user ?? chat.members[0]?.user ?? null
  }
  return null
}

export function getChatDisplayName(chat: Chat, selfId: string | undefined): string {
  const other = getChatDisplayUser(chat, selfId)
  if (other) return other.displayName || other.username || other.email
  return chat.name || "Unknown"
}

export function getChatUsername(chat: Chat, selfId: string | undefined): string | null {
  const other = getChatDisplayUser(chat, selfId)
  if (other) return other.username
  // Groups and channels carry their own @username when public.
  return chat.username ?? null
}

/** Channels are broadcast-only: only OWNER/ADMIN may post. */
export function canPostToChat(chat: Chat, selfId: string | undefined): boolean {
  if (chat.type !== "CHANNEL") return true
  const me = chat.members.find((m) => m.user.id === selfId)
  return me?.role === "OWNER" || me?.role === "ADMIN"
}

export function displayName(
  user:
    | Pick<User, "displayName" | "username" | "email">
    | { displayName?: string | null; username?: string | null; email?: string | null }
    | null
    | undefined,
): string {
  if (!user) return "Unknown"
  return user.displayName || user.username || user.email || "Unknown"
}
