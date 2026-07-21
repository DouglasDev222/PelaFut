import { useParams } from "react-router-dom"
import { PlayerDeparturesCard } from "@/features/teams/PlayerDeparturesCard"

/** Dedicated screen for "quem saiu da pelada", reached from the teams page. */
export function PlayerDeparturesPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return (
    <div className="flex w-full flex-col gap-4">
      <PlayerDeparturesCard matchId={id} />
    </div>
  )
}
