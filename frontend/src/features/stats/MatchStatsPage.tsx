import { useParams } from "react-router-dom"
import { useMatchStats } from "@/features/stats/useMatchStats"
import { MatchStatsView } from "@/features/stats/views/MatchStatsView"

export function MatchStatsPage() {
  const { id } = useParams<{ id: string }>()
  const { match, teams, rounds, participants, goals, playerStats, playersById, loading, error } =
    useMatchStats(id!)

  if (loading) return null

  if (!match) {
    return <p className="text-sm text-destructive">{error ?? "Pelada não encontrada"}</p>
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <MatchStatsView
        matchName={match.name}
        teams={teams}
        rounds={rounds}
        participants={participants}
        goals={goals}
        playerStats={playerStats}
        playersById={playersById}
        regulationSeconds={match.match_duration_minutes ? match.match_duration_minutes * 60 : undefined}
        tieBothLeaveAllowed={match.tie_both_leave_allowed}
        hrefForPlayer={(playerId) => `/players/${playerId}/stats`}
      />
    </div>
  )
}
