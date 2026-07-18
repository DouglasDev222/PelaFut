import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { GripVertical, Star } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { captainFirst, type FormationTeam } from "@/features/teams/useTeamFormation"
import { TeamColorPicker } from "@/features/teams/TeamColorPicker"
import { TeamBalanceBar } from "@/features/teams/TeamBalanceBar"
import type { TeamBalance } from "@/features/teams/teamStrength"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function playerLabel(player: Player) {
  return `${player.name}${player.nickname ? ` (${player.nickname})` : ""}${
    player.position === "goleiro" ? " 🧤" : ""
  }`
}

function PlayerChip({
  player,
  teamIndex,
  isCaptain,
  isSelected,
  onSetCaptain,
  onToggleSelect,
}: {
  player: Player
  teamIndex: number
  isCaptain: boolean
  isSelected: boolean
  onSetCaptain: () => void
  onToggleSelect: () => void
}) {
  // The whole chip is the drag handle: hold anywhere on it (see the sensors'
  // activation constraints) to pick it up. A quick tap still hits the buttons
  // inside, so tapping to select or set captain keeps working.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${teamIndex}:${player.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Segurar para arrastar ${player.name}`}
      className={cn(
        "flex touch-manipulation items-center gap-1.5 rounded-md border bg-card py-1.5 pr-3 pl-1.5 text-sm select-none active:cursor-grabbing",
        // Kept in place (just dimmed) while the DragOverlay shows the moving copy.
        isDragging && "opacity-40",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <button
        type="button"
        aria-label="Tornar capitão"
        onClick={onSetCaptain}
        className="flex size-8 shrink-0 items-center justify-center"
      >
        <Star className={cn("size-4", isCaptain ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>
      <button type="button" onClick={onToggleSelect} className="min-h-8 flex-1 text-left uppercase">
        {playerLabel(player)}
      </button>
      <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
        <GripVertical className="size-4" />
      </span>
    </div>
  )
}

/** Static copy of a chip, rendered in the DragOverlay so it floats above every
 * team card instead of being clipped behind sibling cards. */
function PlayerChipOverlay({ player, isCaptain }: { player: Player; isCaptain: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-card py-1.5 pr-3 pl-1.5 text-sm shadow-lg ring-2 ring-primary select-none">
      <span className="flex size-8 shrink-0 items-center justify-center">
        <Star className={cn("size-4", isCaptain ? "fill-primary text-primary" : "text-muted-foreground")} />
      </span>
      <span className="min-h-8 flex-1 self-center uppercase">{playerLabel(player)}</span>
      <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
        <GripVertical className="size-4" />
      </span>
    </div>
  )
}

function TeamColumn({
  team,
  teamIndex,
  playersPerTeam,
  balance,
  selectedPlayerId,
  onSetCaptain,
  onToggleSelect,
  onMoveSelectedHere,
  onSetColor,
}: {
  team: FormationTeam
  teamIndex: number
  playersPerTeam: number
  balance?: TeamBalance
  selectedPlayerId: string | null
  onSetCaptain: (teamIndex: number, playerId: string) => void
  onToggleSelect: (teamIndex: number, playerId: string) => void
  onMoveSelectedHere: (teamIndex: number) => void
  onSetColor: (teamIndex: number, hex: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `team-${teamIndex}` })
  const shortfall = playersPerTeam - team.players.length

  return (
    <Card ref={setNodeRef} className={cn(isOver && "ring-2 ring-primary")}>
      <CardHeader
        className={selectedPlayerId ? "cursor-pointer" : undefined}
        onClick={selectedPlayerId ? () => onMoveSelectedHere(teamIndex) : undefined}
      >
        <CardTitle className="flex items-center gap-1.5 text-base">
          {/* The color dot is the picker trigger; stop the header's move-player
              click from firing when changing color. */}
          <span onClick={(e) => e.stopPropagation()}>
            <TeamColorPicker value={team.color} onChange={(hex) => onSetColor(teamIndex, hex)} />
          </span>
          Time {team.number}
          <span className="text-sm font-normal text-muted-foreground">
            ({team.players.length})
          </span>
        </CardTitle>
        {balance && <TeamBalanceBar balance={balance} />}
        {shortfall > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Reserva: precisa pegar {shortfall} jogador{shortfall === 1 ? "" : "es"} emprestado
            {shortfall === 1 ? "" : "s"} do time que perder para jogar.
          </p>
        )}
        {selectedPlayerId && (
          <p className="text-xs text-primary">Toque aqui para mover o jogador selecionado</p>
        )}
      </CardHeader>
      <CardContent className="flex min-h-24 flex-col gap-2">
        {captainFirst(team).map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            teamIndex={teamIndex}
            isCaptain={team.captainId === player.id}
            isSelected={selectedPlayerId === player.id}
            onSetCaptain={() => onSetCaptain(teamIndex, player.id)}
            onToggleSelect={() => onToggleSelect(teamIndex, player.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function TeamsBoard({
  teams,
  playersPerTeam,
  balances,
  onMovePlayer,
  onSetCaptain,
  onSetColor,
}: {
  teams: FormationTeam[]
  playersPerTeam: number
  balances?: TeamBalance[]
  onMovePlayer: (playerId: string, fromTeamIndex: number, toTeamIndex: number) => void
  onSetCaptain: (teamIndex: number, playerId: string) => void
  onSetColor: (teamIndex: number, hex: string) => void
}) {
  const [selected, setSelected] = useState<{ teamIndex: number; playerId: string } | null>(null)
  const [activeDrag, setActiveDrag] = useState<{ player: Player; isCaptain: boolean } | null>(null)
  // Mouse drags instantly (8px), but touch requires a 0.5s hold so scrolling
  // the page never picks a player up by accident. If a finger moves more than
  // `tolerance` before the delay elapses, it's treated as a scroll, not a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  function findPlayer(id: string): { player: Player; teamIndex: number; isCaptain: boolean } | null {
    const [fromIndexStr, playerId] = id.split(":")
    const teamIndex = Number(fromIndexStr)
    const team = teams[teamIndex]
    const player = team?.players.find((p) => p.id === playerId)
    if (!team || !player) return null
    return { player, teamIndex, isCaptain: team.captainId === player.id }
  }

  function handleDragStart(event: DragStartEvent) {
    const found = findPlayer(String(event.active.id))
    if (found) setActiveDrag({ player: found.player, isCaptain: found.isCaptain })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const [fromIndexStr, playerId] = String(active.id).split(":")
    const toIndex = Number(String(over.id).replace("team-", ""))
    const fromIndex = Number(fromIndexStr)
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || !playerId) return
    onMovePlayer(playerId, fromIndex, toIndex)
  }

  function toggleSelect(teamIndex: number, playerId: string) {
    setSelected((prev) => (prev?.playerId === playerId ? null : { teamIndex, playerId }))
  }

  function moveSelectedHere(toIndex: number) {
    if (!selected) return
    if (selected.teamIndex !== toIndex) {
      onMovePlayer(selected.playerId, selected.teamIndex, toIndex)
    }
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Toque no nome do jogador para selecionar e depois toque no time de destino — ou segure o
        jogador (0,5s) e arraste.
      </p>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {teams.map((team, i) => (
            <TeamColumn
              key={i}
              team={team}
              teamIndex={i}
              playersPerTeam={playersPerTeam}
              balance={balances?.[i]}
              selectedPlayerId={selected?.playerId ?? null}
              onSetCaptain={onSetCaptain}
              onToggleSelect={toggleSelect}
              onMoveSelectedHere={moveSelectedHere}
              onSetColor={onSetColor}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDrag ? (
            <PlayerChipOverlay player={activeDrag.player} isCaptain={activeDrag.isCaptain} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
