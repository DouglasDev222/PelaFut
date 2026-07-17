import { User } from "lucide-react"
import { cn } from "@/lib/utils"

/** Consistent player photo (or a default person icon when there isn't one) everywhere a player appears. */
export function PlayerAvatar({
  photoUrl,
  name,
  size = "size-12",
  iconSize = "size-5",
  className,
}: {
  photoUrl: string | null | undefined
  name: string
  size?: string
  iconSize?: string
  className?: string
}) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={cn(size, "shrink-0 rounded-full object-cover", className)} />
  }
  return (
    <div className={cn(size, "flex shrink-0 items-center justify-center rounded-full bg-muted", className)}>
      <User className={cn(iconSize, "text-muted-foreground")} />
    </div>
  )
}
