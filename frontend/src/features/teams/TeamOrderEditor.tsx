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
import { GripVertical } from "lucide-react"
import type { FormationTeam } from "@/features/teams/useTeamFormation"
import { cn } from "@/lib/utils"

/**
 * Sortable ids are index-based on purpose: `FormationTeam` has no stable id of
 * its own (its `number` is derived from the position, which is exactly what
 * this screen changes). `SortableContext` only needs the id list to match the
 * rendered order, which it always does here.
 */
function idFor(index: number) {
  return `team-order-${index}`
}

function indexOf(id: string) {
  return Number(id.replace("team-order-", ""))
}

function TeamOrderRow({ team, index }: { team: FormationTeam; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: idFor(index),
  })

  // Built by hand instead of pulling in @dnd-kit/utilities' CSS helper, which
  // isn't a direct dependency of this app.
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
      aria-label={`Segurar para reordenar o Time ${team.number}`}
      className={cn(
        "flex touch-manipulation items-center gap-3 rounded-md border bg-card p-3 select-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">{index + 1}º</span>
      <span
        className="inline-block size-3.5 shrink-0 rounded-full border"
        style={{ backgroundColor: team.color }}
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        Time {team.number}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({team.players.length} jogador{team.players.length === 1 ? "" : "es"})
        </span>
      </span>
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
    </div>
  )
}

/**
 * Reorders the whole teams, renumbering them (Time 1, Time 2...). Kept as its
 * own screen instead of living inside `TeamsBoard` so "hold to drag" is never
 * ambiguous between picking up a player and picking up a team.
 */
export function TeamOrderEditor({
  teams,
  onMoveTeam,
}: {
  teams: FormationTeam[]
  onMoveTeam: (fromIndex: number, toIndex: number) => void
}) {
  // Same activation constraints as the player board: instant on mouse, 0,5s
  // hold on touch so scrolling never picks a team up by accident.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const from = indexOf(String(active.id))
    const to = indexOf(String(over.id))
    if (Number.isNaN(from) || Number.isNaN(to)) return
    onMoveTeam(from, to)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Segure um time (0,5s) e arraste para mudar a ordem. O número de cada time acompanha a
        posição — o elenco, a cor e o capitão vão junto.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={teams.map((_, i) => idFor(i))}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {teams.map((team, i) => (
              <TeamOrderRow key={i} team={team} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
