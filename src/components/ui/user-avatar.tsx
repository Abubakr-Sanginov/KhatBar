import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

interface UserAvatarProps {
  user: Pick<User, "avatarUrl" | "displayName" | "username" | "status">
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

const statusSizeMap = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
}

const statusColorMap: Record<string, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-400",
  DO_NOT_DISTURB: "bg-red-500",
  OFFLINE: "bg-muted-foreground",
}

export function UserAvatar({ user, size = "md", showStatus = true, className }: UserAvatarProps) {
  const initials = (user.displayName ?? user.username)
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn("ring-2 ring-background", sizeMap[size])}>
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName ?? user.username ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
            statusSizeMap[size],
            statusColorMap[user.status],
          )}
        />
      )}
    </div>
  )
}