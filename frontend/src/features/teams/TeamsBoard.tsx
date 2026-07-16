import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core"
import type { Player } from "@pelafut/shared"
import type { FormationTeam } from "@/features/teams/useTeamFormation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function PlayerChip({ player, teamIndex }: { player: Player; teamIndex: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${teamIndex}:${player.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        "cursor-grab rounded-md border bg-card px-3 py-1.5 text-sm select-none active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {player.name}
      {player.nickname ? ` (${player.nickname})` : ""}
      {player.position === "goleiro" ? " 🧤" : ""}
    </div>
  )
}

function TeamColumn({
  team,
  teamIndex,
}: {
  team: FormationTeam
  teamIndex: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `team-${teamIndex}` })

  return (
    <Card ref={setNodeRef} className={cn(isOver && "ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className="inline-block size-3 rounded-full border"
            style={{ backgroundColor: team.color }}
          />
          {team.name}
          <span className="text-sm font-normal text-muted-foreground">
            ({team.players.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-24 flex-col gap-2">
        {team.players.map((player) => (
          <PlayerChip key={player.id} player={player} teamIndex={teamIndex} />
        ))}
      </CardContent>
    </Card>
  )
}

export function TeamsBoard({
  teams,
  onMovePlayer,
}: {
  teams: FormationTeam[]
  onMovePlayer: (playerId: string, fromTeamIndex: number, toTeamIndex: number) => void
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const [fromIndexStr, playerId] = String(active.id).split(":")
    const toIndex = Number(String(over.id).replace("team-", ""))
    const fromIndex = Number(fromIndexStr)
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || !playerId) return
    onMovePlayer(playerId, fromIndex, toIndex)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {teams.map((team, i) => (
          <TeamColumn key={i} team={team} teamIndex={i} />
        ))}
      </div>
    </DndContext>
  )
}
