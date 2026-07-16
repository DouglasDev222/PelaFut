import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import type { Player } from "@pelafut/shared"
import { useLiveMatch, type BorrowCandidate, type LiveTeam, type PendingBorrowNeed } from "@/features/live/useLiveMatch"
import { elapsedSecondsFor } from "@/features/live/rotation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

function BackLink() {
  return (
    <Link to="/matches" className="text-sm text-muted-foreground underline">
      ← Peladas
    </Link>
  )
}

function TeamBadge({ team }: { team: LiveTeam }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: team.color }} />
      Time {team.number}
    </span>
  )
}

function GoalScorerPicker({
  players,
  onPick,
  onCancel,
}: {
  players: Player[]
  onPick: (playerId: string) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-2">
      <p className="text-xs text-muted-foreground">Quem fez o gol?</p>
      <div className="flex flex-wrap gap-1.5">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            {p.name}
          </button>
        ))}
        <button type="button" onClick={onCancel} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function BorrowPrompt({
  need,
  suggested,
  team,
  onConfirm,
}: {
  need: PendingBorrowNeed
  suggested: BorrowCandidate[]
  team: LiveTeam | undefined
  onConfirm: (selected: BorrowCandidate[]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(suggested.map((s) => s.player.id)))

  function toggle(playerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < need.count) {
        next.add(playerId)
      }
      return next
    })
  }

  const selected = need.candidates.filter((c) => selectedIds.has(c.player.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {team ? <TeamBadge team={team} /> : `Time`} vai jogar com menos jogadores
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Escolha {need.count} jogador{need.count === 1 ? "" : "es"} emprestado
          {need.count === 1 ? "" : "s"} do time que saiu de quadra para completar o time.
        </p>
        <div className="flex flex-col gap-1">
          {need.candidates.map((c) => (
            <label key={c.player.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.has(c.player.id)}
                onChange={() => toggle(c.player.id)}
              />
              {c.player.name}
              {c.player.nickname ? ` (${c.player.nickname})` : ""}
            </label>
          ))}
        </div>
        <Button disabled={selected.length !== need.count} onClick={() => onConfirm(selected)}>
          Confirmar e começar o jogo
        </Button>
      </CardContent>
    </Card>
  )
}

export function LiveMatchPage() {
  const { id } = useParams<{ id: string }>()
  const {
    match,
    teams,
    currentRound,
    pendingBorrows,
    conflictWarnings,
    pendingTieOrder,
    phase,
    loading,
    error,
    startLiveMatch,
    recordGoal,
    removeGoal,
    suggestedBorrowFor,
    confirmBorrow,
    endRound,
    confirmTieOrder,
    finishMatch,
    reopenMatch,
    pauseTimer,
    resumeTimer,
  } = useLiveMatch(id!)

  const [scoringForTeam, setScoringForTeam] = useState<string | null>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    setScoringForTeam(null)
  }, [currentRound?.id])

  const hasTimer =
    !!match && (match.end_condition === "time" || match.end_condition === "both") && phase === "live"
  const running = hasTimer && !currentRound?.pausedAt

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => forceTick((x) => x + 1), 1000)
    return () => clearInterval(interval)
  }, [running, currentRound?.id])

  if (loading) return null

  if (!match) {
    return <p className="text-sm text-destructive">{error ?? "Pelada não encontrada"}</p>
  }

  if (phase === "not_started") {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <BackLink />
        <h1 className="text-xl font-semibold">Partida ao vivo</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {teams.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            É preciso pelo menos 2 times formados para iniciar a partida ao vivo.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {teams[0] ? <TeamBadge team={teams[0]} /> : null} joga primeiro contra{" "}
              {teams[1] ? <TeamBadge team={teams[1]} /> : null}. Os demais times esperam a vez na fila.
            </p>
            <Button onClick={startLiveMatch}>Iniciar partida ao vivo</Button>
          </>
        )}
      </div>
    )
  }

  if (phase === "finished") {
    const finalOrder = [...teams].sort((a, b) => a.queuePosition - b.queuePosition)
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <BackLink />
        <h1 className="text-xl font-semibold">Partida ao vivo</h1>
        <p className="text-sm text-muted-foreground">
          Essa pelada foi encerrada. Ordem final da fila:
        </p>
        <div className="flex flex-col gap-1 text-sm">
          {finalOrder.map((t, i) => (
            <p key={t.id}>
              {i + 1}º <TeamBadge team={t} />
            </p>
          ))}
        </div>
        <Button variant="outline" className="self-start" onClick={reopenMatch}>
          Reabrir partida
        </Button>
      </div>
    )
  }

  const homeTeam = teams.find((t) => t.id === currentRound?.homeTeamId)
  const awayTeam = teams.find((t) => t.id === currentRound?.awayTeamId)
  const homeGoals = currentRound?.goals.filter((g) => g.teamId === currentRound.homeTeamId) ?? []
  const awayGoals = currentRound?.goals.filter((g) => g.teamId === currentRound.awayTeamId) ?? []

  const allPlayersById = new Map(
    [...teams.flatMap((t) => t.players), ...(currentRound?.borrowedPlayers.map((b) => b.player) ?? [])].map(
      (p) => [p.id, p] as const
    )
  )

  function onCourtPlayers(teamId: string | undefined): Player[] {
    if (!teamId) return []
    const team = teams.find((t) => t.id === teamId)
    const own = team?.players ?? []
    const borrowed = currentRound?.borrowedPlayers.filter((b) => b.teamId === teamId).map((b) => b.player) ?? []
    return [...own, ...borrowed]
  }

  const queue = teams
    .filter((t) => t.id !== currentRound?.homeTeamId && t.id !== currentRound?.awayTeamId)
    .sort((a, b) => a.queuePosition - b.queuePosition)

  const durationSeconds = (match.match_duration_minutes ?? 0) * 60
  const elapsed = currentRound ? elapsedSecondsFor(currentRound) : 0
  const remaining = durationSeconds - elapsed
  const inStoppage = hasTimer && remaining <= 0
  const clockLabel = inStoppage ? `+${formatClock(elapsed - durationSeconds)}` : formatClock(remaining)

  const goalsToWin = match.goals_to_win
  const reachedGoalTarget =
    (match.end_condition === "goals" || match.end_condition === "both") &&
    goalsToWin != null &&
    (homeGoals.length >= goalsToWin || awayGoals.length >= goalsToWin)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <BackLink />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Partida ao vivo</h1>
        <Button variant="outline" size="sm" onClick={finishMatch}>
          Encerrar pelada
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {conflictWarnings.map((w) => {
        const team = teams.find((t) => t.id === w.teamId)
        const lentTo = teams.find((t) => t.id === w.lentToTeamId)
        return (
          <p
            key={w.teamId}
            className="rounded-md border border-amber-600 bg-amber-50 p-2 text-sm text-amber-700 dark:bg-transparent dark:text-amber-500"
          >
            ⚠ {team ? `Time ${team.number}` : "Um time"} está com{" "}
            {w.players.map((p) => p.name).join(", ")} jogando emprestado
            {w.players.length === 1 ? "" : "s"} pelo {lentTo ? `Time ${lentTo.number}` : "outro time"}{" "}
            nesta rodada — ajuste manualmente quem vai jogar.
          </p>
        )
      })}

      {pendingTieOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empate! Qual time vai para o fim da fila?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Os dois times saem da quadra. Escolha qual dos dois fica mais atrás na fila (o outro
              volta um pouco mais cedo).
            </p>
            <div className="flex gap-2">
              {[pendingTieOrder.homeTeamId, pendingTieOrder.awayTeamId].map((teamId) => {
                const team = teams.find((t) => t.id === teamId)
                return (
                  <Button key={teamId} variant="outline" onClick={() => confirmTieOrder(teamId)}>
                    {team ? `Time ${team.number}` : "Time"} fica por último
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!pendingTieOrder && phase === "pending_borrow" &&
        pendingBorrows.map((need) => (
          <BorrowPrompt
            key={need.teamId}
            need={need}
            suggested={suggestedBorrowFor(need)}
            team={teams.find((t) => t.id === need.teamId)}
            onConfirm={(selected) => confirmBorrow(need.teamId, selected)}
          />
        ))}

      {!pendingTieOrder && phase === "live" && currentRound && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {homeTeam && <TeamBadge team={homeTeam} />}
                  <span className="font-mono text-lg">{homeGoals.length}</span>
                  <span className="text-muted-foreground">x</span>
                  <span className="font-mono text-lg">{awayGoals.length}</span>
                  {awayTeam && <TeamBadge team={awayTeam} />}
                </span>
                {hasTimer && (
                  <span className={cn("font-mono text-base", inStoppage && "text-amber-600 dark:text-amber-500")}>
                    {inStoppage ? "Acréscimos " : ""}
                    {clockLabel}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {hasTimer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => (running ? pauseTimer() : resumeTimer())}
                >
                  {running ? "Pausar cronômetro" : "Retomar cronômetro"}
                </Button>
              )}
              {reachedGoalTarget && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Meta de {goalsToWin} gols atingida — encerre o jogo quando quiser.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  {scoringForTeam === currentRound.homeTeamId ? (
                    <GoalScorerPicker
                      players={onCourtPlayers(currentRound.homeTeamId)}
                      onPick={(playerId) => {
                        recordGoal(currentRound.homeTeamId, playerId)
                        setScoringForTeam(null)
                      }}
                      onCancel={() => setScoringForTeam(null)}
                    />
                  ) : (
                    <Button variant="outline" onClick={() => setScoringForTeam(currentRound.homeTeamId)}>
                      +1 gol {homeTeam ? `Time ${homeTeam.number}` : ""}
                    </Button>
                  )}
                  {homeGoals.map((g) => (
                    <p key={g.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      ⚽ {allPlayersById.get(g.playerId)?.name ?? "?"}
                      <button type="button" className="underline" onClick={() => removeGoal(g.id)}>
                        remover
                      </button>
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {scoringForTeam === currentRound.awayTeamId ? (
                    <GoalScorerPicker
                      players={onCourtPlayers(currentRound.awayTeamId)}
                      onPick={(playerId) => {
                        recordGoal(currentRound.awayTeamId, playerId)
                        setScoringForTeam(null)
                      }}
                      onCancel={() => setScoringForTeam(null)}
                    />
                  ) : (
                    <Button variant="outline" onClick={() => setScoringForTeam(currentRound.awayTeamId)}>
                      +1 gol {awayTeam ? `Time ${awayTeam.number}` : ""}
                    </Button>
                  )}
                  {awayGoals.map((g) => (
                    <p key={g.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      ⚽ {allPlayersById.get(g.playerId)?.name ?? "?"}
                      <button type="button" className="underline" onClick={() => removeGoal(g.id)}>
                        remover
                      </button>
                    </p>
                  ))}
                </div>
              </div>

              <Button onClick={endRound}>Encerrar jogo</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fila de espera</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {queue.length === 0 && <p className="text-muted-foreground">Nenhum time esperando.</p>}
              {queue.map((t, i) => (
                <p key={t.id}>
                  {i + 1}º <TeamBadge team={t} />
                </p>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
