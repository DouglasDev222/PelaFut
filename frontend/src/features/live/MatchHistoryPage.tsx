import { useState } from "react"
import { useParams } from "react-router-dom"
import { History, Pencil } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { useMatchRounds } from "@/features/live/useMatchRounds"
import type { StatsRound, StatsTeam } from "@/features/stats/fetchRaw"
import type { GoalLite } from "@/features/stats/aggregate"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

const DECIDED_BY_LABEL: Record<string, string> = {
  regulation: "tempo normal",
  penalties: "pênaltis",
  direct: "vencedor direto",
}

function playerLabel(p: Player | undefined) {
  if (!p) return "Ninguém/contra"
  return (p.nickname ? `${p.name} (${p.nickname})` : p.name).toUpperCase()
}

function TeamDot({ color }: { color: string | undefined }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full border"
      style={{ backgroundColor: color }}
    />
  )
}

/** Picks the scorer / assister for one goal, among who was on court. */
function EditGoalDialog({
  open,
  onOpenChange,
  goal,
  squad,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: GoalLite | null
  squad: Player[]
  onSave: (playerId: string | null, assistPlayerId: string | null) => Promise<void>
}) {
  const [scorer, setScorer] = useState<string | null>(goal?.playerId ?? null)
  const [assist, setAssist] = useState<string | null>(goal?.assistPlayerId ?? null)
  const [saving, setSaving] = useState(false)

  // Re-seed whenever a different goal is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null)
  if (goal && seededFor !== goal.id) {
    setSeededFor(goal.id)
    setScorer(goal.playerId)
    setAssist(goal.assistPlayerId)
  }

  async function save() {
    setSaving(true)
    await onSave(scorer, scorer ? assist : null)
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-h-[85svh] flex-col gap-3 overflow-y-auto">
        <DialogTitle>Quem fez o gol?</DialogTitle>
        <div className="flex flex-col gap-1.5">
          {squad.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setScorer(p.id)}
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-left text-sm uppercase",
                scorer === p.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
              )}
            >
              {playerLabel(p)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setScorer(null)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-left text-sm",
              scorer === null ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
            )}
          >
            Ninguém / gol contra
          </button>
        </div>

        {scorer && (
          <>
            <DialogTitle className="text-base">Quem deu a assistência?</DialogTitle>
            <p className="-mt-2 text-xs text-muted-foreground">Opcional</p>
            <div className="flex flex-col gap-1.5">
              {squad
                .filter((p) => p.id !== scorer)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAssist(assist === p.id ? null : p.id)}
                    className={cn(
                      "min-h-11 rounded-md border px-3 py-2 text-left text-sm uppercase",
                      assist === p.id
                        ? "border-primary bg-primary/10 font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    {playerLabel(p)}
                  </button>
                ))}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="touch" className="flex-1" disabled={saving} onClick={save}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function RoundCard({
  round,
  teams,
  goals,
  playersById,
  onEditGoal,
}: {
  round: StatsRound
  teams: StatsTeam[]
  goals: GoalLite[]
  playersById: Map<string, Player>
  onEditGoal: (goal: GoalLite) => void
}) {
  const home = teams.find((t) => t.id === round.homeTeamId)
  const away = teams.find((t) => t.id === round.awayTeamId)
  const live = round.status !== "finished"

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Jogo {round.sequence}</span>
          {live ? (
            <StatusBadge label="Em andamento" tone="warning" pulse />
          ) : (
            round.decidedBy && <span>{DECIDED_BY_LABEL[round.decidedBy] ?? round.decidedBy}</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <TeamDot color={home?.color} /> Time {home?.number ?? "?"}
          </span>
          <span className="text-2xl font-extrabold tabular-nums">
            {round.homeScore} <span className="text-base text-muted-foreground">x</span>{" "}
            {round.awayScore}
          </span>
          <span className="flex items-center gap-1.5">
            <TeamDot color={away?.color} /> Time {away?.number ?? "?"}
          </span>
        </div>

        {goals.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">Nenhum gol nesse jogo.</p>
        ) : (
          <div className="flex flex-col gap-1.5 border-t pt-2">
            {goals.map((g) => {
              const team = g.teamId === round.homeTeamId ? home : away
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onEditGoal(g)}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span>⚽</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-foreground uppercase">
                      {playerLabel(g.playerId ? playersById.get(g.playerId) : undefined)}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {g.assistPlayerId
                        ? `assist. ${playerLabel(playersById.get(g.assistPlayerId))}`
                        : "sem assistência"}{" "}
                      · Time {team?.number ?? "?"}
                    </span>
                  </span>
                  <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MatchHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const { rounds, goals, teams, playersById, squadFor, updateGoalAuthorship, loading, error } =
    useMatchRounds(id!)
  const [editing, setEditing] = useState<GoalLite | null>(null)

  if (loading) return null

  // Most recent first — that's the one you usually need to fix.
  const ordered = [...rounds].sort((a, b) => b.sequence - a.sequence)

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {ordered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhum jogo ainda"
          description="Os jogos aparecem aqui assim que a pelada começar."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Toque num gol para corrigir quem fez ou quem deu a assistência. O placar e o resultado
            do jogo não mudam.
          </p>
          {ordered.map((r) => (
            <RoundCard
              key={r.id}
              round={r}
              teams={teams}
              goals={goals.filter((g) => g.roundId === r.id)}
              playersById={playersById}
              onEditGoal={setEditing}
            />
          ))}
        </>
      )}

      <EditGoalDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        goal={editing}
        squad={editing ? squadFor(editing.roundId, editing.teamId) : []}
        onSave={async (playerId, assistPlayerId) => {
          if (editing) await updateGoalAuthorship(editing.id, playerId, assistPlayerId)
        }}
      />
    </div>
  )
}
