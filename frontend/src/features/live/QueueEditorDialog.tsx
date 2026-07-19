import { useEffect, useMemo, useState } from "react"
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ArrowLeftRight, GripVertical } from "lucide-react"
import type { LiveTeam } from "@/features/live/useLiveMatch"
import { planQueueEdit, reorderWaiting, swapOnCourt, type QueueState } from "@/features/live/queueEdit"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

function TeamLine({ team, games }: { team: LiveTeam | undefined; games: number }) {
  if (!team) return null
  return (
    <>
      <span
        className="inline-block size-3 shrink-0 rounded-full border"
        style={{ backgroundColor: team.color }}
      />
      <span className="min-w-0 flex-1 truncate font-medium">Time {team.number}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        jogou {games}
      </span>
    </>
  )
}

function SortableQueueRow({
  team,
  index,
  games,
}: {
  team: LiveTeam | undefined
  index: number
  games: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `queue-${index}`,
  })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={team ? `Segurar para reordenar o Time ${team.number}` : undefined}
      className={cn(
        "flex touch-manipulation items-center gap-2.5 rounded-md border bg-card p-3 select-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}º</span>
      <TeamLine team={team} games={games} />
    </div>
  )
}

export function QueueEditorDialog({
  open,
  onOpenChange,
  teams,
  initial,
  games,
  roundUnderway,
  goalCount,
  clockLabel,
  busy,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: LiveTeam[]
  initial: QueueState
  /** Finished games per team id — the "who has been waiting longest" cue. */
  games: Record<string, number>
  /** True when the current game already has something to lose (clock, goals, penalties). */
  roundUnderway: boolean
  goalCount: number
  clockLabel: string | null
  busy: boolean
  onApply: (draft: QueueState) => Promise<{ error: string | null }>
}) {
  const [draft, setDraft] = useState<QueueState>(initial)
  const [swapFor, setSwapFor] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Reopening always starts from the queue as it currently stands, never from
  // a half-finished edit left over from last time.
  useEffect(() => {
    if (open) {
      setDraft(initial)
      setSwapFor(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const plan = useMemo(() => {
    try {
      return planQueueEdit(initial, draft)
    } catch {
      return null
    }
  }, [initial, draft])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const from = Number(String(active.id).replace("queue-", ""))
    const to = Number(String(over.id).replace("queue-", ""))
    if (Number.isNaN(from) || Number.isNaN(to)) return
    setDraft((prev) => reorderWaiting(prev, from, to))
  }

  async function applyNow() {
    setConfirmOpen(false)
    const { error } = await onApply(draft)
    if (!error) onOpenChange(false)
  }

  function handleSave() {
    if (!plan || !plan.changed) {
      onOpenChange(false)
      return
    }
    // Only warn when there is something real to lose. A game that never
    // started has nothing to throw away, so the swap is silent.
    if (plan.resetsCurrentRound && roundUnderway) {
      setConfirmOpen(true)
      return
    }
    applyNow()
  }

  const courtIds = [draft.homeTeamId, draft.awayTeamId]
  const nextUp = draft.waitingIds
    .slice(0, 2)
    .map((id) => teamById.get(id))
    .filter((t): t is LiveTeam => t != null)

  const lostBits = [
    goalCount > 0 ? `${goalCount} gol${goalCount === 1 ? "" : "s"} registrado${goalCount === 1 ? "" : "s"}` : null,
    clockLabel ? `o cronômetro em ${clockLabel}` : null,
  ].filter(Boolean)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogTitle>Ajustar a fila</DialogTitle>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">Em quadra</p>
              {courtIds.map((teamId) => {
                const team = teamById.get(teamId)
                const picking = swapFor === teamId
                return (
                  <div key={teamId} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 rounded-md border bg-card p-3">
                      <TeamLine team={team} games={games[teamId] ?? 0} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={draft.waitingIds.length === 0}
                        onClick={() => setSwapFor(picking ? null : teamId)}
                      >
                        <ArrowLeftRight className="size-4" /> Trocar
                      </Button>
                    </div>
                    {picking && (
                      <div className="flex flex-col gap-1.5 rounded-md border border-dashed p-2">
                        <p className="text-xs text-muted-foreground">
                          Quem entra no lugar do Time {team?.number}? Ele assume a vaga na fila de
                          quem entrar.
                        </p>
                        {draft.waitingIds.map((waitingId) => {
                          const waiting = teamById.get(waitingId)
                          return (
                            <button
                              key={waitingId}
                              type="button"
                              onClick={() => {
                                setDraft((prev) => swapOnCourt(prev, teamId, waitingId))
                                setSwapFor(null)
                              }}
                              className="flex min-h-11 items-center gap-2.5 rounded-md px-2 text-left hover:bg-muted"
                            >
                              <TeamLine team={waiting} games={games[waitingId] ?? 0} />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Fila de espera <span className="font-normal">(segure e arraste)</span>
              </p>
              {draft.waitingIds.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum time esperando.</p>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={draft.waitingIds.map((_, i) => `queue-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {draft.waitingIds.map((teamId, i) => (
                      <SortableQueueRow
                        key={teamId}
                        team={teamById.get(teamId)}
                        index={i}
                        games={games[teamId] ?? 0}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {nextUp.length > 0 && (
              <p className="rounded-md bg-muted/50 p-2.5 text-sm text-muted-foreground">
                Prévia: entra{nextUp.length > 1 ? "m" : ""}{" "}
                {nextUp.map((t) => `Time ${t.number}`).join(" e depois ")}.
              </p>
            )}

            {plan?.resetsCurrentRound && roundUnderway && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">
                Trocar um time que está em quadra zera o jogo atual.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="touch"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button size="touch" className="flex-1" disabled={busy} onClick={handleSave}>
              Salvar fila
            </Button>
          </div>
        </DialogPopup>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Zerar o jogo atual?"
        description={
          lostBits.length > 0
            ? `O time que sai leva o jogo junto: ${lostBits.join(" e ")} ${
                lostBits.length > 1 ? "serão apagados" : "será apagado"
              }. Os jogos já encerrados não mudam.`
            : "O jogo atual volta para o zero. Os jogos já encerrados não mudam."
        }
        confirmLabel="Trocar e zerar"
        confirmVariant="destructive"
        onOpenChange={setConfirmOpen}
        onConfirm={applyNow}
      />
    </>
  )
}
