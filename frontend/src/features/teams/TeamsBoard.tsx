import { useState } from "react"
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { GripVertical, Star } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { captainFirst, type FormationTeam } from "@/features/teams/useTeamFormation"
import { TeamColorPicker } from "@/features/teams/TeamColorPicker"
import { TeamBalanceBar } from "@/features/teams/TeamBalanceBar"
import type { TeamBalance } from "@/features/teams/teamStrength"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${teamIndex}:${player.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        "flex items-center gap-1.5 rounded-md border bg-card py-1.5 pr-3 pl-1.5 text-sm select-none",
        isDragging && "opacity-50",
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
      <button
        type="button"
        onClick={onToggleSelect}
        className="min-h-8 flex-1 text-left uppercase"
      >
        {player.name}
        {player.nickname ? ` (${player.nickname})` : ""}
        {player.position === "goleiro" ? " 🧤" : ""}
      </button>
      <span
        {...listeners}
        {...attributes}
        aria-label="Arrastar jogador"
        className="flex size-8 shrink-0 touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
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
        Toque no nome do jogador para selecionar e depois toque no time de destino — ou arraste
        pela alça ⠿.
      </p>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
      </DndContext>
    </div>
  )
}
