import { Star } from "lucide-react"
import { fillFor, type StarFill } from "@/features/players/starScale"
import { cn } from "@/lib/utils"

/**
 * One star in a given fill state. The half is drawn by clipping a filled star
 * to 50% width over an outlined one — shared by the input and the read-only
 * display so they always look identical.
 */
export function StarShape({ fill, size = "size-4" }: { fill: StarFill; size?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0", size)}>
      <Star
        className={cn(size, fill === "full" ? "fill-primary text-primary" : "text-muted-foreground")}
      />
      {fill === "half" && (
        <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <Star className={cn(size, "fill-primary text-primary")} />
        </span>
      )}
    </span>
  )
}

/** Read-only rating, e.g. 3.5 renders as three full stars and one half. */
export function StarsDisplay({
  value,
  size = "size-4",
  className,
}: {
  value: number | null | undefined
  size?: string
  className?: string
}) {
  if (value == null) return null
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <StarShape key={i} fill={fillFor(value, i)} size={size} />
      ))}
    </span>
  )
}
