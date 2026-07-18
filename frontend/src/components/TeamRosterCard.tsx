import { useState, type ReactNode } from "react"
import { ChevronDown, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface TeamRosterPlayer {
  id: string
  name: string
  nickname?: string | null
  position?: string | null
}

export function TeamRosterCard({
  color,
  number,
  players,
  captainId,
  variant = "expanded",
  subtitle,
  headerRight,
  footer,
  highlighted,
  className,
}: {
  color: string | null | undefined
  number: number | string
  players: TeamRosterPlayer[]
  captainId?: string | null
  variant?: "expanded" | "collapsible"
  subtitle?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  highlighted?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(variant === "expanded")
  const showRoster = variant === "expanded" || open

  // Captain always shows first in the roster.
  const orderedPlayers =
    captainId && players.some((p) => p.id === captainId)
      ? [players.find((p) => p.id === captainId)!, ...players.filter((p) => p.id !== captainId)]
      : players

  const header = (
    <CardTitle className="flex items-center gap-2 text-base">
      <span
        className="inline-block size-3.5 shrink-0 rounded-full border"
        style={{ backgroundColor: color ?? undefined }}
      />
      <span className="flex-1">Time {number}</span>
      {headerRight}
      {variant === "collapsible" && (
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      )}
    </CardTitle>
  )

  return (
    <Card className={cn(highlighted && "ring-2 ring-primary", className)}>
      <CardHeader
        className={variant === "collapsible" ? "cursor-pointer select-none" : undefined}
        onClick={variant === "collapsible" ? () => setOpen((v) => !v) : undefined}
      >
        {header}
        {subtitle}
      </CardHeader>
      {showRoster && (
        <CardContent className="flex flex-col gap-1 text-sm">
          {players.length === 0 && <p className="text-muted-foreground">Nenhum jogador ainda.</p>}
          {orderedPlayers.map((p) => (
            <p key={p.id} className="flex items-center gap-1">
              {p.id === captainId && <Star className="size-3.5 shrink-0 fill-primary text-primary" />}
              <span className="uppercase">
                {p.name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </span>
              {p.position === "goleiro" ? " 🧤" : ""}
            </p>
          ))}
        </CardContent>
      )}
      {showRoster && footer && (
        <CardContent className="flex flex-col gap-2 border-t pt-3">{footer}</CardContent>
      )}
    </Card>
  )
}
