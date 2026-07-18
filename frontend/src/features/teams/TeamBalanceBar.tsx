import { Star } from "lucide-react"
import type { TeamBalance } from "@/features/teams/teamStrength"
import { cn } from "@/lib/utils"

/**
 * The team "nota": average stars as a labelled bar. Shown only during
 * formation (draft roster cards and the board) so the organizer can eyeball
 * whether the teams are even. Colour follows the balance `tone` — green when
 * the team is in line with the others, amber when it's pulling away.
 */
export function TeamBalanceBar({ balance }: { balance: TeamBalance }) {
  if (balance.average <= 0) {
    return <p className="text-xs text-muted-foreground">Nota: sem jogadores ainda</p>
  }

  const tone =
    balance.tone === "off"
      ? { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-500" }
      : { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone.bar)}
          style={{ width: `${Math.round(balance.fillPct * 100)}%` }}
        />
      </div>
      <span className={cn("flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums", tone.text)}>
        {balance.average.toFixed(1)}
        <Star className="size-3 fill-current" />
      </span>
    </div>
  )
}
