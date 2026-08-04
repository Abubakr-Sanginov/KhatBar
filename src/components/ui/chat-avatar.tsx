import { Users, Megaphone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"
import type { ChatType, User } from "@/types"

interface ChatAvatarProps {
  type: ChatType
  name: string
  /** The chat's own avatar; groups and channels never borrow a member's. */
  avatarUrl: string | null
  /** Only used for private chats, to show presence. */
  otherUser?: Pick<User, "avatarUrl" | "displayName" | "username" | "status"> | null
  size?: "sm" | "md" | "lg" | "xl"
  showStatus?: boolean
  className?: string
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
}

const iconSizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-7 w-7",
}

export function ChatAvatar({
  type,
  name,
  avatarUrl,
  otherUser,
  size = "md",
  showStatus = true,
  className,
}: ChatAvatarProps) {
  if (type === "PRIVATE") {
    return (
      <UserAvatar
        user={{
          avatarUrl: otherUser?.avatarUrl ?? null,
          displayName: otherUser?.displayName ?? name,
          username: otherUser?.username ?? null,
          status: otherUser?.status ?? "OFFLINE",
        }}
        size={size}
        showStatus={showStatus}
        className={className}
      />
    )
  }

  const Icon = type === "CHANNEL" ? Megaphone : Users
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn("ring-2 ring-background", sizeMap[size])}>
        <AvatarImage src={avatarUrl ?? undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials || <Icon className={iconSizeMap[size]} />}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
