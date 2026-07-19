import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { AlertTriangle, ListOrdered, Trophy, Undo2 } from "lucide-react"
import type { Player } from "@pelafut/shared"
import {
  useLiveMatch,
  type BorrowCandidate,
  type LiveTeam,
  type PendingBorrowNeed,
  type PendingTieOrder,
  type PenaltyShootoutState,
  type TieResolutionMode,
  type TransitionInfo,
} from "@/features/live/useLiveMatch"
import { elapsedSecondsFor } from "@/features/live/rotation"
import { penaltyKickStakes, type PenaltyState } from "@/features/live/penalties"
import { ScoreClock, type ClockState } from "@/features/live/ScoreClock"
import { MatchFinishedSummary } from "@/features/live/MatchFinishedSummary"
import { QueueEditorDialog } from "@/features/live/QueueEditorDialog"
import { useGamesPlayed } from "@/features/live/useGamesPlayed"
import { useMatchTeamPlayerStats } from "@/features/live/useMatchTeamPlayerStats"
import { readableTextColor } from "@/features/teams/teamColors"
import type { QueueState } from "@/features/live/queueEdit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button"
import { toastManager } from "@/components/ui/toast"
import { TeamRosterCard } from "@/components/TeamRosterCard"
import { cn } from "@/lib/utils"

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

function TeamBadge({ team }: { team: LiveTeam }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: team.color }} />
      Time {team.number}
    </span>
  )
}

/**
 * The "GOL TIME N" button, tinted to the team's own color so which button
 * scores for which team reads at a glance. Falls back to the default primary
 * style for the "sem cor" team (transparent) or an unparseable color, and
 * while disabled — a tinted-but-dead button would look active.
 */
function GoalButton({
  color,
  number,
  disabled,
  onClick,
}: {
  color: string | null | undefined
  number: number
  disabled: boolean
  onClick: () => void
}) {
  const textColor = disabled ? null : readableTextColor(color)
  return (
    <Button
      size="touch"
      className="w-full"
      disabled={disabled}
      onClick={onClick}
      // A thin border in the button's own text color (white on a dark fill,
      // black on a light one) gives it a defined edge — without it the black
      // team's button melts into the dark interface.
      style={
        textColor
          ? { backgroundColor: color ?? undefined, color: textColor, border: `1px solid ${textColor}` }
          : undefined
      }
    >
      GOL TIME {number}
    </Button>
  )
}

/**
 * Sets the clock to an exact minute:second value. Opens prefilled with the
 * current time so a small correction is a couple of taps. Always leaves the
 * clock paused (the hook does), so the operator starts it when ready.
 */
function ClockEditDialog({
  open,
  onOpenChange,
  initialSeconds,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSeconds: number
  onSave: (seconds: number) => void
}) {
  const [minutes, setMinutes] = useState("0")
  const [seconds, setSeconds] = useState("0")

  useEffect(() => {
    if (open) {
      const total = Math.max(0, Math.floor(initialSeconds))
      setMinutes(String(Math.floor(total / 60)))
      setSeconds(String(total % 60))
    }
  }, [open, initialSeconds])

  function save() {
    const m = Math.max(0, Math.floor(Number(minutes) || 0))
    const s = Math.min(59, Math.max(0, Math.floor(Number(seconds) || 0)))
    onSave(m * 60 + s)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>Ajustar o cronômetro</DialogTitle>
        <p className="-mt-2 text-sm text-muted-foreground">
          Defina o tempo e toque em salvar — o cronômetro fica pausado nesse valor, pronto para você
          continuar quando quiser.
        </p>
        <div className="flex items-end justify-center gap-2">
          <label className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            Minutos
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-20 text-center text-lg tabular-nums"
            />
          </label>
          <span className="pb-2 text-2xl font-bold text-muted-foreground">:</span>
          <label className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            Segundos
            <Input
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-20 text-center text-lg tabular-nums"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="touch" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="touch" className="flex-1" onClick={save}>
            Salvar tempo
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function GoalScorerDialog({
  open,
  teamLabel,
  players,
  onPick,
  onNoScorer,
  onOpenChange,
}: {
  open: boolean
  teamLabel: string
  players: Player[]
  onPick: (playerId: string) => void
  onNoScorer: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>Quem fez o gol? — {teamLabel}</DialogTitle>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm uppercase hover:bg-muted"
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onNoScorer}
            className="min-h-11 rounded-lg border border-dashed px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            NINGUÉM/CONTRA
          </button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function AssistDialog({
  open,
  teamLabel,
  players,
  onPick,
  onSkip,
  onOpenChange,
}: {
  open: boolean
  teamLabel: string
  players: Player[]
  onPick: (playerId: string) => void
  onSkip: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>Quem deu a assistência? — {teamLabel}</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">Opcional</p>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm uppercase hover:bg-muted"
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 rounded-lg border border-dashed px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            SEM ASSISTÊNCIA
          </button>
        </div>
      </DialogPopup>
    </Dialog>
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
    <Card className="border-warning/40">
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
            <label key={c.player.id} className="flex min-h-11 items-center gap-2 rounded-md border p-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={selectedIds.has(c.player.id)}
                onChange={() => toggle(c.player.id)}
              />
              {c.player.name}
              {c.player.nickname ? ` (${c.player.nickname})` : ""}
            </label>
          ))}
        </div>
        <Button size="touch" className="w-full" disabled={selected.length !== need.count} onClick={() => onConfirm(selected)}>
          Confirmar e começar o jogo
        </Button>
      </CardContent>
    </Card>
  )
}

function TieDecisionPrompt({
  decision,
  teams,
  allowBothLeave,
  onChoose,
  onCancel,
}: {
  decision: PendingTieOrder
  teams: LiveTeam[]
  allowBothLeave: boolean
  onChoose: (mode: TieResolutionMode) => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogPopup>
        <DialogTitle>
          Empate entre {teamLabel(teams, decision.homeTeamId)} e {teamLabel(teams, decision.awayTeamId)}! Como decidir?
        </DialogTitle>
        <div className="flex flex-col gap-2">
          {allowBothLeave && (
            <Button size="touch" variant="outline" className="w-full" onClick={() => onChoose("both_leave")}>
              Ambos saem
            </Button>
          )}
          <Button size="touch" variant="outline" className="w-full" onClick={() => onChoose("penalties")}>
            Decidir nos pênaltis
          </Button>
          <Button size="touch" variant="outline" className="w-full" onClick={() => onChoose("direct")}>
            Marcar vencedor direto
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function TwoTeamChoicePrompt({
  title,
  buttonLabel,
  decision,
  teams,
  onCourtPlayers,
  onChoose,
  onCancel,
}: {
  title: string
  buttonLabel: string
  decision: PendingTieOrder
  teams: LiveTeam[]
  onCourtPlayers: (teamId: string) => Player[]
  onChoose: (teamId: string) => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogPopup>
        <DialogTitle>{title}</DialogTitle>
        <div className="flex flex-col gap-3">
          {[decision.homeTeamId, decision.awayTeamId].map((teamId) => {
            const team = teams.find((t) => t.id === teamId)
            if (!team) return null
            return (
              <TeamRosterCard
                key={teamId}
                color={team.color}
                number={team.number}
                captainId={team.captainId}
                players={onCourtPlayers(teamId)}
                footer={
                  <Button size="touch" variant="outline" className="w-full" onClick={() => onChoose(teamId)}>
                    {buttonLabel}
                  </Button>
                }
              />
            )
          })}
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function PenaltyKickCircles({
  kicks,
  teamId,
  bestOf,
}: {
  kicks: PenaltyShootoutState["kicks"]
  teamId: string
  bestOf: number
}) {
  const teamKicks = kicks.filter((k) => k.teamId === teamId)
  const regulation = teamKicks.slice(0, bestOf)
  const suddenDeath = teamKicks.slice(bestOf)
  const isSuddenDeath = suddenDeath.length > 0

  const circle = (k: PenaltyShootoutState["kicks"][number], compact: boolean) => (
    <span
      key={k.id}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        compact ? "size-4 text-[9px]" : "size-6 text-xs",
        k.scored ? "bg-success" : "bg-destructive"
      )}
    >
      {k.scored ? "✓" : "✕"}
    </span>
  )

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {regulation.map((k) => circle(k, isSuddenDeath))}
      {isSuddenDeath && <span className="mx-0.5 text-muted-foreground/50">|</span>}
      {suddenDeath.map((k) => circle(k, false))}
    </div>
  )
}

function PenaltyTeamColumn({
  team,
  players,
  score,
  isNextKicker,
  kicks,
  bestOf,
}: {
  team: LiveTeam | undefined
  players: Player[]
  score: number
  isNextKicker: boolean
  kicks: PenaltyShootoutState["kicks"]
  bestOf: number
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
        isNextKicker ? "border-primary bg-primary/5" : "border-transparent"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: team?.color }} />
        Time {team?.number}
      </span>
      <span className="text-display text-5xl font-extrabold tabular-nums">{score}</span>
      {team && <PenaltyKickCircles kicks={kicks} teamId={team.id} bestOf={bestOf} />}
      <div className="flex flex-col items-center gap-0.5">
        {players.map((p) => (
          <span key={p.id} className="text-[10px] leading-tight text-muted-foreground uppercase">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function PenaltyShootoutPanel({
  shootout,
  state,
  teams,
  bestOf,
  busy,
  onCourtPlayers,
  onKick,
  onUndo,
  onConfirmWinner,
}: {
  shootout: PenaltyShootoutState
  state: PenaltyState
  teams: LiveTeam[]
  bestOf: number
  busy: boolean
  onCourtPlayers: (teamId: string) => Player[]
  onKick: (teamId: string, scored: boolean) => void
  onUndo: () => void
  onConfirmWinner: () => void
}) {
  const homeTeam = teams.find((t) => t.id === shootout.homeTeamId)
  const awayTeam = teams.find((t) => t.id === shootout.awayTeamId)
  const stakes = penaltyKickStakes(shootout.kicks, shootout.homeTeamId, shootout.awayTeamId, shootout.firstKickerTeamId, bestOf)

  return (
    <Card className="border-2 border-warning/40 bg-card">
      <CardHeader>
        <CardTitle className="text-center text-base">⚽ Disputa de pênaltis (melhor de {bestOf})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <PenaltyTeamColumn
            team={homeTeam}
            players={onCourtPlayers(shootout.homeTeamId)}
            score={state.homeScore}
            isNextKicker={!state.decided && state.nextKickerTeamId === shootout.homeTeamId}
            kicks={shootout.kicks}
            bestOf={bestOf}
          />
          <span className="text-lg font-medium text-muted-foreground">x</span>
          <PenaltyTeamColumn
            team={awayTeam}
            players={onCourtPlayers(shootout.awayTeamId)}
            score={state.awayScore}
            isNextKicker={!state.decided && state.nextKickerTeamId === shootout.awayTeamId}
            kicks={shootout.kicks}
            bestOf={bestOf}
          />
        </div>

        {!state.decided && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm font-medium">
              Cobrança de {teamLabel(teams, state.nextKickerTeamId)}
            </p>
            {stakes.winsIfScored && (
              <p className="text-center text-xs font-semibold text-success">Se marcar, vence a disputa!</p>
            )}
            {stakes.eliminatedIfMissed && (
              <p className="text-center text-xs font-semibold text-destructive">Se perder, a disputa acaba!</p>
            )}
            <div className="flex gap-2">
              <Button
                size="touch"
                variant="success"
                className="flex-1"
                disabled={busy}
                onClick={() => onKick(state.nextKickerTeamId, true)}
              >
                Marcou
              </Button>
              <Button
                size="touch"
                variant="destructive"
                className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                disabled={busy}
                onClick={() => onKick(state.nextKickerTeamId, false)}
              >
                Perdeu
              </Button>
            </div>
          </div>
        )}

        {state.decided && state.winnerTeamId && (
          <Button size="touch" className="w-full" disabled={busy} onClick={onConfirmWinner}>
            Confirmar {teamLabel(teams, state.winnerTeamId)} venceu nos pênaltis
          </Button>
        )}

        {shootout.kicks.length > 0 && (
          <Button variant="ghost" size="sm" className="self-center text-muted-foreground" disabled={busy} onClick={onUndo}>
            Desfazer última cobrança
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function TransitionDialog({
  transition,
  onContinue,
  onAdjustQueue,
}: {
  transition: TransitionInfo
  onContinue: () => void
  /** "Wait, that's not who's entering" — the moment a manual queue fix is most needed. */
  onAdjustQueue: () => void
}) {
  return (
    <Dialog open onOpenChange={() => {}} disablePointerDismissal>
      <DialogPopup showClose={false}>
        <DialogTitle>Troca de times</DialogTitle>
        <div className="flex flex-col gap-4">
          {transition.leaving.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-destructive">Saindo de quadra</p>
              {transition.leaving.map((t) => (
                <TeamRosterCard
                  key={t.id}
                  color={t.color}
                  number={t.number}
                  players={t.players}
                  captainId={t.captainId}
                />
              ))}
            </div>
          )}
          {transition.entering.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-primary">Entrando em quadra</p>
              {transition.entering.map((t) => (
                <TeamRosterCard
                  key={t.id}
                  color={t.color}
                  number={t.number}
                  players={t.players}
                  captainId={t.captainId}
                />
              ))}
            </div>
          )}
        </div>
        <Button size="touch" className="w-full" onClick={onContinue}>
          Continuar
        </Button>
        <button
          type="button"
          className="self-center text-xs text-muted-foreground underline"
          onClick={onAdjustQueue}
        >
          Não é esse time? Ajustar a fila
        </button>
      </DialogPopup>
    </Dialog>
  )
}

interface RoundGoalLite {
  id: string
  teamId: string
  playerId: string | null
  assistPlayerId: string | null
}

function GoalHistoryRow({
  goal,
  playersById,
  onOpen,
}: {
  goal: RoundGoalLite
  playersById: Map<string, Player>
  onOpen: (goal: RoundGoalLite) => void
}) {
  const scorerName = goal.playerId ? playersById.get(goal.playerId)?.name ?? "?" : "NINGUÉM/CONTRA"
  const assistName = goal.assistPlayerId ? playersById.get(goal.assistPlayerId)?.name ?? "?" : null

  return (
    <button
      type="button"
      onClick={() => onOpen(goal)}
      className="flex min-w-0 flex-col rounded-md border px-2 py-1.5 text-left hover:bg-muted"
    >
      <span className="truncate text-xs font-medium uppercase">{scorerName}</span>
      {assistName && (
        <span className="truncate text-[11px] text-muted-foreground uppercase">assist. {assistName}</span>
      )}
    </button>
  )
}

function GoalActionsDialog({
  open,
  goal,
  scorerName,
  onOpenChange,
  onRemove,
  onChangeScorer,
  onChangeAssist,
}: {
  open: boolean
  goal: RoundGoalLite | null
  scorerName: string
  onOpenChange: (open: boolean) => void
  onRemove: () => void
  onChangeScorer: () => void
  onChangeAssist: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>
          Gol de <span className="uppercase">{scorerName}</span>
        </DialogTitle>
        <div className="flex flex-col gap-2">
          <Button size="touch" variant="outline" className="w-full" onClick={onChangeScorer}>
            Trocar autor do gol
          </Button>
          {goal?.playerId && (
            <Button size="touch" variant="outline" className="w-full" onClick={onChangeAssist}>
              {goal.assistPlayerId ? "Trocar assistência" : "Adicionar assistência"}
            </Button>
          )}
          <Button
            size="touch"
            variant="destructive"
            className="w-full bg-destructive text-white hover:bg-destructive/90"
            onClick={onRemove}
          >
            Remover gol
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function ConfirmHoldDialog({
  open,
  title,
  description,
  confirmLabel,
  holdMs,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  holdMs?: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>{title}</DialogTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-col gap-2">
          <HoldToConfirmButton
            variant="destructive"
            className="bg-destructive text-white hover:bg-destructive/90"
            holdMs={holdMs}
            onConfirm={onConfirm}
          >
            {confirmLabel}
          </HoldToConfirmButton>
          <Button size="touch" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function PenaltyFirstKickerPrompt({
  decision,
  teams,
  defaultBestOf,
  onCourtPlayers,
  onChoose,
  onCancel,
}: {
  decision: PendingTieOrder
  teams: LiveTeam[]
  defaultBestOf: number
  onCourtPlayers: (teamId: string) => Player[]
  onChoose: (teamId: string, bestOf: number) => void
  onCancel: () => void
}) {
  const [bestOf, setBestOf] = useState(defaultBestOf)

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogPopup>
        <DialogTitle>Qual time bate primeiro nos pênaltis?</DialogTitle>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Melhor de</span>
            <div className="flex gap-2">
              {[3, 4, 5].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="touch"
                  variant={bestOf === n ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setBestOf(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[decision.homeTeamId, decision.awayTeamId].map((teamId) => {
              const team = teams.find((t) => t.id === teamId)
              if (!team) return null
              return (
                <TeamRosterCard
                  key={teamId}
                  color={team.color}
                  number={team.number}
                  captainId={team.captainId}
                  players={onCourtPlayers(teamId)}
                  footer={
                    <Button size="touch" variant="outline" className="w-full" onClick={() => onChoose(teamId, bestOf)}>
                      Começa
                    </Button>
                  }
                />
              )
            })}
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function teamLabel(teams: LiveTeam[], teamId: string | undefined): string {
  const team = teams.find((t) => t.id === teamId)
  return team ? `Time ${team.number}` : "Time"
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
    pendingTieDecision,
    pendingDirectWinner,
    pendingPenaltyFirstKicker,
    penaltyShootout,
    penaltyState,
    defaultPenaltyBestOf,
    pendingTransition,
    canUndoLastRound,
    canFinishMatch,
    roundUnderway,
    currentQueueState,
    applyQueueEdit,
    phase,
    loading,
    error,
    roundRecoveryNeeded,
    startLiveMatch,
    recoverActiveRound,
    recordGoal,
    removeGoal,
    suggestedBorrowFor,
    confirmBorrow,
    endRound,
    cancelTieFlow,
    chooseTieResolution,
    confirmTieOrder,
    declareDirectWinner,
    startPenaltyShootout,
    recordPenaltyKick,
    undoLastPenaltyKick,
    confirmPenaltyWinner,
    confirmTransition,
    undoLastRound,
    finishMatch,
    reopenMatch,
    pauseTimer,
    resumeTimer,
    restartTimer,
    setClock,
  } = useLiveMatch(id!)

  const [scoringForTeam, setScoringForTeam] = useState<string | null>(null)
  const [pendingAssistFor, setPendingAssistFor] = useState<{ teamId: string; scorerId: string } | null>(null)
  const [goalActionsFor, setGoalActionsFor] = useState<RoundGoalLite | null>(null)
  const [endRoundConfirmOpen, setEndRoundConfirmOpen] = useState(false)
  const [undoRoundConfirmOpen, setUndoRoundConfirmOpen] = useState(false)
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false)
  const [queueEditorOpen, setQueueEditorOpen] = useState(false)
  const [clockEditOpen, setClockEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // Keyed on the current round so the counts move forward as games end.
  const gamesPlayed = useGamesPlayed(id!, true, currentRound?.id ?? null)
  const teamPlayerStats = useMatchTeamPlayerStats(id!, currentRound?.id ?? null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    setScoringForTeam(null)
    setPendingAssistFor(null)
  }, [currentRound?.id])

  const hasTimer =
    !!match && (match.end_condition === "time" || match.end_condition === "both") && phase === "live"
  const running = hasTimer && !currentRound?.pausedAt

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => forceTick((x) => x + 1), 1000)
    return () => clearInterval(interval)
  }, [running, currentRound?.id])

  // A single lock across every async round-affecting action — a live game is
  // exactly the situation where a double-tap (two goals from one press) is
  // costly and easy to make by accident.
  async function guarded(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  // Like `guarded`, but hands the result back — the queue editor only closes
  // itself once the edit actually landed.
  async function handleApplyQueueEdit(draft: QueueState): Promise<{ error: string | null }> {
    if (busy) return { error: "Aguarde a ação anterior terminar" }
    setBusy(true)
    try {
      return await applyQueueEdit(draft)
    } finally {
      setBusy(false)
    }
  }

  function handleRemoveGoal(goal: RoundGoalLite) {
    removeGoal(goal.id)
    // The undo action must fire at most once — otherwise a double-tap on
    // "Desfazer" (or any other double-invocation) recreates the goal twice.
    let undone = false
    let toastId = ""
    toastId = toastManager.add({
      title: "Gol removido",
      type: "success",
      actionProps: {
        children: "Desfazer",
        onClick: () => {
          if (undone) return
          undone = true
          toastManager.close(toastId)
          recordGoal(goal.teamId, goal.playerId, goal.assistPlayerId)
        },
      },
    })
  }

  function handleConfirmEndRound() {
    setEndRoundConfirmOpen(false)
    guarded(endRound)
  }

  function handleConfirmUndoRound() {
    setUndoRoundConfirmOpen(false)
    guarded(undoLastRound)
  }

  function handleConfirmFinishMatch() {
    setFinishConfirmOpen(false)
    finishMatch()
    let undone = false
    let toastId = ""
    toastId = toastManager.add({
      title: "Pelada encerrada",
      actionProps: {
        children: "Reabrir",
        onClick: () => {
          if (undone) return
          undone = true
          toastManager.close(toastId)
          reopenMatch()
        },
      },
    })
  }

  if (loading) return null

  if (!match) {
    return <p className="text-sm text-destructive">{error ?? "Pelada não encontrada"}</p>
  }

  if (roundRecoveryNeeded) {
    return (
      <div className="flex w-full flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <EmptyState
          icon={AlertTriangle}
          title="Partida sem rodada ativa"
          description="A troca de rodada foi interrompida. Toque abaixo para retomar a partida com os dois primeiros times da fila."
          action={
            <Button size="touch" disabled={busy} onClick={() => guarded(recoverActiveRound)}>
              Retomar partida
            </Button>
          }
        />
      </div>
    )
  }

  if (phase === "not_started") {
    const ordered = [...teams].sort((a, b) => a.queuePosition - b.queuePosition)
    const [first, second, ...rest] = ordered
    return (
      <div className="flex w-full flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {teams.length < 2 ? (
          <EmptyState
            icon={Trophy}
            title="Times ainda não formados"
            description="É preciso pelo menos 2 times formados para iniciar a partida ao vivo."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Jogam primeiro:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {first && (
                <TeamRosterCard color={first.color} number={first.number} captainId={first.captainId} players={first.players} />
              )}
              {second && (
                <TeamRosterCard color={second.color} number={second.number} captainId={second.captainId} players={second.players} />
              )}
            </div>
            {rest.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Aguardando na fila</p>
                {rest.map((t, i) => (
                  <TeamRosterCard
                    key={t.id}
                    variant="collapsible"
                    color={t.color}
                    number={t.number}
                    captainId={t.captainId}
                    players={t.players}
                    headerRight={<span className="text-xs text-muted-foreground">{i + 1}º na fila</span>}
                  />
                ))}
              </div>
            )}
            <Button size="touch" className="w-full" disabled={busy} onClick={() => guarded(startLiveMatch)}>
              Iniciar partida ao vivo
            </Button>
          </>
        )}
      </div>
    )
  }

  if (phase === "finished") {
    return (
      <MatchFinishedSummary
        matchId={match.id}
        teams={teams}
        busy={busy}
        onReopen={() => guarded(reopenMatch)}
      />
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

  const queueInitialState = currentQueueState()

  const durationSeconds = (match.match_duration_minutes ?? 0) * 60
  const elapsed = currentRound ? elapsedSecondsFor(currentRound) : 0
  const remaining = durationSeconds - elapsed
  const inStoppage = hasTimer && remaining <= 0
  const clockLabel = hasTimer ? (inStoppage ? `+${formatClock(elapsed - durationSeconds)}` : formatClock(remaining)) : undefined
  const neverStarted = currentRound?.pausedAt === currentRound?.startedAt
  // Goals-only matches have no clock concept to "start" — only gate recording
  // on the clock when there actually is one.
  const canRecordGoals = !hasTimer || !neverStarted
  const clockState: ClockState | undefined = !hasTimer
    ? undefined
    : inStoppage
      ? "stoppage"
      : running
        ? "running"
        : neverStarted
          ? "not_started"
          : "paused"

  const goalsToWin = match.goals_to_win
  const reachedGoalTarget =
    (match.end_condition === "goals" || match.end_condition === "both") &&
    goalsToWin != null &&
    (homeGoals.length >= goalsToWin || awayGoals.length >= goalsToWin)

  const tieFlowActive = !!(
    pendingTieDecision ||
    pendingTieOrder ||
    pendingDirectWinner ||
    pendingPenaltyFirstKicker ||
    penaltyShootout
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {pendingTransition && (
        <TransitionDialog
          transition={pendingTransition}
          onContinue={confirmTransition}
          onAdjustQueue={async () => {
            // Confirm first so the new round is loaded — the editor edits the
            // queue as it stands after the rotation, not before it.
            await confirmTransition()
            setQueueEditorOpen(true)
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {conflictWarnings.map((w) => {
        const team = teams.find((t) => t.id === w.teamId)
        const lentTo = teams.find((t) => t.id === w.lentToTeamId)
        return (
          <p
            key={w.teamId}
            className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {team ? `Time ${team.number}` : "Um time"} está com{" "}
              {w.players.map((p) => p.name).join(", ")} jogando emprestado
              {w.players.length === 1 ? "" : "s"} pelo {lentTo ? `Time ${lentTo.number}` : "outro time"}{" "}
              nesta rodada — ajuste manualmente quem vai jogar.
            </span>
          </p>
        )
      })}

      {pendingTieDecision && (
        <TieDecisionPrompt
          decision={pendingTieDecision}
          teams={teams}
          allowBothLeave={match.tie_both_leave_allowed}
          onChoose={chooseTieResolution}
          onCancel={cancelTieFlow}
        />
      )}

      {pendingTieOrder && (
        <Dialog open onOpenChange={(next) => { if (!next) cancelTieFlow() }}>
          <DialogPopup>
            <DialogTitle>Qual time vai para o fim da fila?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Os dois times saem da quadra. Escolha qual dos dois fica mais atrás na fila (o outro
              volta um pouco mais cedo).
            </p>
            <div className="flex flex-col gap-3">
              {[pendingTieOrder.homeTeamId, pendingTieOrder.awayTeamId].map((teamId) => {
                const team = teams.find((t) => t.id === teamId)
                if (!team) return null
                return (
                  <TeamRosterCard
                    key={teamId}
                    color={team.color}
                    number={team.number}
                    captainId={team.captainId}
                    players={onCourtPlayers(teamId)}
                    footer={
                      <Button size="touch" variant="outline" className="w-full" onClick={() => confirmTieOrder(teamId)}>
                        Fica por último
                      </Button>
                    }
                  />
                )
              })}
            </div>
          </DialogPopup>
        </Dialog>
      )}

      {pendingDirectWinner && (
        <TwoTeamChoicePrompt
          title="Qual time venceu?"
          buttonLabel="Venceu"
          decision={pendingDirectWinner}
          teams={teams}
          onCourtPlayers={onCourtPlayers}
          onChoose={declareDirectWinner}
          onCancel={cancelTieFlow}
        />
      )}

      {pendingPenaltyFirstKicker && (
        <PenaltyFirstKickerPrompt
          decision={pendingPenaltyFirstKicker}
          teams={teams}
          defaultBestOf={defaultPenaltyBestOf}
          onCourtPlayers={onCourtPlayers}
          onChoose={startPenaltyShootout}
          onCancel={cancelTieFlow}
        />
      )}

      {penaltyShootout && penaltyState && (
        <PenaltyShootoutPanel
          shootout={penaltyShootout}
          state={penaltyState}
          teams={teams}
          bestOf={penaltyShootout.regulationKicks}
          busy={busy}
          onCourtPlayers={onCourtPlayers}
          onKick={(teamId, scored) => guarded(() => recordPenaltyKick(teamId, scored))}
          onUndo={() => guarded(undoLastPenaltyKick)}
          onConfirmWinner={() => guarded(confirmPenaltyWinner)}
        />
      )}

      {!tieFlowActive && phase === "pending_borrow" &&
        pendingBorrows.map((need) => (
          <BorrowPrompt
            key={need.teamId}
            need={need}
            suggested={suggestedBorrowFor(need)}
            team={teams.find((t) => t.id === need.teamId)}
            onConfirm={(selected) => guarded(() => confirmBorrow(need.teamId, selected))}
          />
        ))}

      {phase === "live" && currentRound && (
        <>
          <ScoreClock
            home={homeTeam && { number: homeTeam.number, color: homeTeam.color }}
            away={awayTeam && { number: awayTeam.number, color: awayTeam.color }}
            homeScore={homeGoals.length}
            awayScore={awayGoals.length}
            clockLabel={clockLabel}
            clockState={clockState}
            onEditClock={hasTimer ? () => setClockEditOpen(true) : undefined}
          />

          {hasTimer && (
            <>
              {running ? (
                <Button
                  size="touch"
                  variant="outline"
                  className="w-full border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                  disabled={busy}
                  onClick={() => guarded(pauseTimer)}
                >
                  Pausar
                </Button>
              ) : neverStarted ? (
                <Button size="touch" className="w-full" disabled={busy} onClick={() => guarded(resumeTimer)}>
                  Iniciar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="touch" className="flex-1" disabled={busy} onClick={() => guarded(resumeTimer)}>
                    Retomar
                  </Button>
                  <Button
                    size="touch"
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => guarded(restartTimer)}
                  >
                    Recomeçar
                  </Button>
                </div>
              )}
              {neverStarted && (
                <p className="text-center text-xs text-muted-foreground">
                  Inicie o cronômetro para poder registrar gols.
                </p>
              )}
            </>
          )}

          {reachedGoalTarget && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Meta de {goalsToWin} gols atingida — encerre o jogo quando quiser.
            </p>
          )}

          {/* Team + roster + goal button live in one card each, side by side —
              so which button belongs to which team is never ambiguous, even
              when the team numbers themselves (Time 3 vs Time 4) are easy to
              mix up mid-game. */}
          <div className="grid grid-cols-2 gap-2">
            {homeTeam && (
              <TeamRosterCard
                color={homeTeam.color}
                number={homeTeam.number}
                captainId={homeTeam.captainId}
                players={onCourtPlayers(homeTeam.id)}
                footer={
                  <>
                    <GoalButton
                      color={homeTeam.color}
                      number={homeTeam.number}
                      disabled={!canRecordGoals}
                      onClick={() => setScoringForTeam(currentRound.homeTeamId)}
                    />
                    {homeGoals.map((g) => (
                      <GoalHistoryRow key={g.id} goal={g} playersById={allPlayersById} onOpen={setGoalActionsFor} />
                    ))}
                  </>
                }
              />
            )}
            {awayTeam && (
              <TeamRosterCard
                color={awayTeam.color}
                number={awayTeam.number}
                captainId={awayTeam.captainId}
                players={onCourtPlayers(awayTeam.id)}
                footer={
                  <>
                    <GoalButton
                      color={awayTeam.color}
                      number={awayTeam.number}
                      disabled={!canRecordGoals}
                      onClick={() => setScoringForTeam(currentRound.awayTeamId)}
                    />
                    {awayGoals.map((g) => (
                      <GoalHistoryRow key={g.id} goal={g} playersById={allPlayersById} onOpen={setGoalActionsFor} />
                    ))}
                  </>
                }
              />
            )}
          </div>

          <GoalScorerDialog
            open={scoringForTeam !== null}
            teamLabel={teamLabel(teams, scoringForTeam ?? undefined)}
            players={scoringForTeam ? onCourtPlayers(scoringForTeam) : []}
            onPick={(playerId) => {
              const teamId = scoringForTeam!
              setScoringForTeam(null)
              setPendingAssistFor({ teamId, scorerId: playerId })
            }}
            onNoScorer={() => {
              if (!scoringForTeam) return
              recordGoal(scoringForTeam, null)
              setScoringForTeam(null)
            }}
            onOpenChange={(next) => {
              if (!next) setScoringForTeam(null)
            }}
          />

          <AssistDialog
            open={pendingAssistFor !== null}
            teamLabel={teamLabel(teams, pendingAssistFor?.teamId)}
            players={
              pendingAssistFor
                ? onCourtPlayers(pendingAssistFor.teamId).filter((p) => p.id !== pendingAssistFor.scorerId)
                : []
            }
            onPick={(assistId) => {
              if (!pendingAssistFor) return
              recordGoal(pendingAssistFor.teamId, pendingAssistFor.scorerId, assistId)
              setPendingAssistFor(null)
            }}
            onSkip={() => {
              if (!pendingAssistFor) return
              recordGoal(pendingAssistFor.teamId, pendingAssistFor.scorerId, null)
              setPendingAssistFor(null)
            }}
            onOpenChange={(next) => {
              if (!next) setPendingAssistFor(null)
            }}
          />

          <GoalActionsDialog
            open={goalActionsFor !== null}
            goal={goalActionsFor}
            scorerName={
              goalActionsFor
                ? goalActionsFor.playerId
                  ? allPlayersById.get(goalActionsFor.playerId)?.name ?? "?"
                  : "NINGUÉM/CONTRA"
                : ""
            }
            onOpenChange={(next) => {
              if (!next) setGoalActionsFor(null)
            }}
            onRemove={() => {
              if (!goalActionsFor) return
              handleRemoveGoal(goalActionsFor)
              setGoalActionsFor(null)
            }}
            onChangeScorer={() => {
              if (!goalActionsFor) return
              removeGoal(goalActionsFor.id)
              setScoringForTeam(goalActionsFor.teamId)
              setGoalActionsFor(null)
            }}
            onChangeAssist={() => {
              if (!goalActionsFor || !goalActionsFor.playerId) return
              removeGoal(goalActionsFor.id)
              setPendingAssistFor({ teamId: goalActionsFor.teamId, scorerId: goalActionsFor.playerId })
              setGoalActionsFor(null)
            }}
          />

          {/* Secondary/admin actions live below, visually quieter, so a rushed
              thumb reaching for "+1 gol" can't land on "Encerrar" by mistake. */}
          <Button
            size="touch"
            variant="destructive"
            className="w-full bg-destructive text-white hover:bg-destructive/90"
            disabled={busy}
            onClick={() => setEndRoundConfirmOpen(true)}
          >
            Encerrar jogo
          </Button>

          <ConfirmDialog
            open={endRoundConfirmOpen}
            title="Encerrar o jogo?"
            description="Isso encerra esse jogo e passa pro próximo da fila."
            confirmLabel="Encerrar jogo"
            confirmVariant="destructive"
            onOpenChange={setEndRoundConfirmOpen}
            onConfirm={handleConfirmEndRound}
          />

          {canUndoLastRound && (
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 self-center text-xs text-muted-foreground underline"
              disabled={busy}
              onClick={() => setUndoRoundConfirmOpen(true)}
            >
              <Undo2 className="size-3.5" /> Voltar para o jogo anterior
            </button>
          )}

          <ConfirmDialog
            open={undoRoundConfirmOpen}
            title="Voltar para o jogo anterior?"
            description="Isso desfaz o encerramento do último jogo — o placar e a fila voltam a como estavam antes."
            confirmLabel="Voltar para o jogo anterior"
            onOpenChange={setUndoRoundConfirmOpen}
            onConfirm={handleConfirmUndoRound}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">Fila de espera</p>
              {teams.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setQueueEditorOpen(true)}
                >
                  <ListOrdered className="size-4" /> Ajustar fila
                </Button>
              )}
            </div>
            {queue.length === 0 && <p className="text-sm text-muted-foreground">Nenhum time esperando.</p>}
            {queue.map((t, i) => (
              <TeamRosterCard
                key={t.id}
                variant="collapsible"
                color={t.color}
                number={t.number}
                captainId={t.captainId}
                players={t.players}
                statsById={teamPlayerStats[t.id]}
                headerRight={
                  <span className="text-xs text-muted-foreground">
                    {i + 1}º na fila · jogou {gamesPlayed[t.id] ?? 0}
                  </span>
                }
              />
            ))}
          </div>

          {/* Blocked only while a game is actually underway (running, paused,
              already with goals, or in penalties). A round that exists but was
              never started doesn't block. Same flag the hook enforces. */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className="text-xs text-muted-foreground underline disabled:no-underline disabled:opacity-50"
              disabled={busy || !canFinishMatch}
              onClick={() => setFinishConfirmOpen(true)}
            >
              Encerrar pelada
            </button>
            {!canFinishMatch && (
              <p className="text-center text-xs text-muted-foreground">
                Encerre o jogo atual para poder encerrar a pelada.
              </p>
            )}
          </div>

          <ConfirmHoldDialog
            open={finishConfirmOpen}
            title="Encerrar a pelada?"
            description="Isso encerra a pelada inteira, não só o jogo atual. Segure o botão abaixo para confirmar."
            confirmLabel="Segure para encerrar"
            onOpenChange={setFinishConfirmOpen}
            onConfirm={handleConfirmFinishMatch}
          />

          {queueInitialState && (
            <QueueEditorDialog
              open={queueEditorOpen}
              onOpenChange={setQueueEditorOpen}
              teams={teams}
              initial={queueInitialState}
              games={gamesPlayed}
              roundUnderway={roundUnderway}
              goalCount={currentRound?.goals.length ?? 0}
              clockLabel={hasTimer && !neverStarted ? formatClock(elapsed) : null}
              busy={busy}
              onApply={handleApplyQueueEdit}
            />
          )}

          <ClockEditDialog
            open={clockEditOpen}
            onOpenChange={setClockEditOpen}
            initialSeconds={elapsed}
            onSave={async (secs) => {
              await guarded(() => setClock(secs))
              setClockEditOpen(false)
            }}
          />
        </>
      )}
    </div>
  )
}
