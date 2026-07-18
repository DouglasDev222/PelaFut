import { useParams } from "react-router-dom"
import { usePlayerStats } from "@/features/stats/usePlayerStats"
import { PlayerProfileView } from "@/features/stats/views/PlayerProfileView"

export function PlayerStatsPage() {
  const { id } = useParams<{ id: string }>()
  const { player, overall, byMatch, loading, error } = usePlayerStats(id!)

  if (loading) return null

  if (!player) {
    return <p className="text-sm text-destructive">{error ?? "Peladeiro não encontrado"}</p>
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <PlayerProfileView
        player={player}
        overall={overall}
        byMatch={byMatch}
        hrefForMatch={(matchId) => `/matches/${matchId}/stats`}
      />
    </div>
  )
}
