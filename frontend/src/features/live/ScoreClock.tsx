import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

export type ClockState = "not_started" | "running" | "paused" | "stoppage" | "finished"

const CLOCK_STATE_LABEL: Record<ClockState, string> = {
  not_started: "Não iniciado",
  running: "Em andamento",
  paused: "Pausado",
  stoppage: "Acréscimos",
  finished: "Encerrado",
}

const CLOCK_STATE_CLASS: Record<ClockState, string> = {
  not_started: "text-muted-foreground",
  running: "text-foreground",
  paused: "text-warning",
  stoppage: "text-warning",
  finished: "text-muted-foreground",
}

interface TeamSide {
  number: number
  color: string
}

/**
 * The one signature visual moment of the app: the live scoreboard. Nothing
 * else uses this type scale or this much surface — that's what makes it read
 * as "the thing that matters" at a glance, from arm's length, mid-game.
 */
export function ScoreClock({
  home,
  away,
  homeScore,
  awayScore,
  clockLabel,
  clockState,
  onEditClock,
}: {
  home: TeamSide | undefined
  away: TeamSide | undefined
  homeScore: number
  awayScore: number
  clockLabel?: string
  clockState?: ClockState
  /** When set, a subtle pencil beside the time opens the clock editor. */
  onEditClock?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex w-full items-center justify-between gap-3">
        <TeamColumn team={home} score={homeScore} />
        <span className="text-lg font-medium text-muted-foreground">x</span>
        <TeamColumn team={away} score={awayScore} align="end" />
      </div>

      {clockLabel && clockState && (
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex items-center">
            <span className="font-mono text-3xl leading-none font-bold tabular-nums">{clockLabel}</span>
            {onEditClock && (
              <button
                type="button"
                onClick={onEditClock}
                aria-label="Ajustar o cronômetro"
                className="absolute left-full ml-2 flex size-7 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", CLOCK_STATE_CLASS[clockState])}>
            {clockState === "running" && (
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-current" />
              </span>
            )}
            {CLOCK_STATE_LABEL[clockState]}
          </span>
        </div>
      )}
    </div>
  )
}

function TeamColumn({
  team,
  score,
  align = "start",
}: {
  team: TeamSide | undefined
  score: number
  align?: "start" | "end"
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-1", align === "end" ? "items-end" : "items-start")}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {align === "end" && `Time ${team?.number ?? "?"}`}
        <span
          className="inline-block size-3 shrink-0 rounded-full border border-white/10"
          style={{ backgroundColor: team?.color }}
        />
        {align === "start" && `Time ${team?.number ?? "?"}`}
      </span>
      <span className="text-display font-extrabold tabular-nums">{score}</span>
    </div>
  )
}
